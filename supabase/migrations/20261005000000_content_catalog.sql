create table public.tags (
  id text primary key,
  label text not null,
  icon text,
  color text,
  description text not null default '',
  show_on_map boolean not null default false,
  display_title text not null default '',
  position integer not null unique
);

create table public.places (
  id text primary key,
  name text not null,
  note text not null default '',
  longitude double precision not null check (longitude between -180 and 180),
  latitude double precision not null check (latitude between -90 and 90),
  parking_condition integer not null check (parking_condition in (-1, 0, 1, 2)),
  gmap_url text,
  path_type integer not null check (path_type in (-1, 0, 1)),
  position integer not null unique
);

create table public.place_tags (
  place_id text not null references public.places(id) on delete cascade,
  tag_id text not null references public.tags(id) on delete cascade,
  position integer not null,
  primary key (place_id, tag_id),
  unique (place_id, position)
);

create table public.place_paths (
  place_id text not null references public.places(id) on delete cascade,
  position integer not null,
  longitude double precision not null check (longitude between -180 and 180),
  latitude double precision not null check (latitude between -90 and 90),
  primary key (place_id, position)
);

alter table public.tags enable row level security;
alter table public.places enable row level security;
alter table public.place_tags enable row level security;
alter table public.place_paths enable row level security;

create policy "Public can read tags" on public.tags for select to anon, authenticated using (true);
create policy "Public can read places" on public.places for select to anon, authenticated using (true);
create policy "Public can read place tags" on public.place_tags for select to anon, authenticated using (true);
create policy "Public can read place paths" on public.place_paths for select to anon, authenticated using (true);

create or replace function public.replace_catalog(catalog jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tag_record jsonb;
  place_record jsonb;
  tag_id text;
  place_id text;
  tag_position integer;
  place_position integer;
  path_position integer;
begin
  delete from public.place_tags where true;
  delete from public.place_paths where true;
  delete from public.places where true;
  delete from public.tags where true;

  tag_position := 0;
  for tag_record in select * from jsonb_array_elements(catalog->'tags') loop
    insert into public.tags (id, label, icon, color, description, show_on_map, display_title, position)
    values (
      tag_record->>'id',
      tag_record->>'label',
      nullif(tag_record->>'icon', ''),
      nullif(tag_record->>'color', ''),
      coalesce(tag_record->>'description', ''),
      coalesce((tag_record->>'showOnMap')::boolean, false),
      coalesce(tag_record->>'displayTitle', ''),
      tag_position
    );
    tag_position := tag_position + 1;
  end loop;

  place_position := 0;
  for place_record in select * from jsonb_array_elements(catalog->'places') loop
    place_id := place_record->>'id';
    insert into public.places (id, name, note, longitude, latitude, parking_condition, gmap_url, path_type, position)
    values (
      place_id,
      place_record->>'name',
      coalesce(place_record->>'note', ''),
      (place_record->>'longitude')::double precision,
      (place_record->>'latitude')::double precision,
      (place_record->>'parkingCondition')::integer,
      nullif(place_record->>'gmapUrl', ''),
      (place_record->>'pathType')::integer,
      place_position
    );
    place_position := place_position + 1;

    for tag_id, tag_position in
      select value, ordinality - 1
      from jsonb_array_elements_text(place_record->'tags') with ordinality
    loop
      insert into public.place_tags (place_id, tag_id, position)
      values (place_id, tag_id, tag_position);
    end loop;

    path_position := 0;
    for tag_record in select * from jsonb_array_elements(place_record->'path') loop
      insert into public.place_paths (place_id, position, longitude, latitude)
      values (
        place_id,
        path_position,
        (tag_record->>0)::double precision,
        (tag_record->>1)::double precision
      );
      path_position := path_position + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function public.replace_catalog(jsonb) from public, anon, authenticated;
