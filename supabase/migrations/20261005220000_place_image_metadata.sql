create table public.place_image_metadata (
  id text primary key references public.place_images(id) on delete cascade,
  place_id text not null references public.places(id) on delete cascade,
  position integer not null,
  width integer not null check (width > 0),
  height integer not null check (height > 0),
  latitude double precision,
  longitude double precision,
  thumbnail_data_url text not null,
  unique (place_id, position),
  check ((latitude is null) = (longitude is null)),
  check (latitude is null or latitude between -90 and 90),
  check (longitude is null or longitude between -180 and 180)
);

alter table public.place_image_metadata enable row level security;
create policy "Public can read place image metadata"
  on public.place_image_metadata for select to anon, authenticated using (true);

create or replace function public.save_place(place jsonb)
returns void
language plpgsql
security definer
set search_path = public
set statement_timeout to '1min'
as $$
declare
  target_place_id text := place->>'id';
  tag_id text;
  tag_position integer;
  image_record jsonb;
  image_position integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if target_place_id is null or target_place_id = '' then raise exception 'Place id is required'; end if;

  insert into public.places (id, name, note, longitude, latitude, parking_condition, gmap_url, path_type, path, position)
  values (
    target_place_id, place->>'name', coalesce(place->>'note', ''),
    (place->>'longitude')::double precision, (place->>'latitude')::double precision,
    (place->>'parkingCondition')::integer, nullif(place->>'gmapUrl', ''), (place->>'pathType')::integer,
    coalesce((select string_agg(format('%s,%s', value->>0, value->>1), '|' order by ordinality)
      from jsonb_array_elements(coalesce(place->'path', '[]'::jsonb)) with ordinality), ''),
    coalesce((select max(existing.position) + 1 from public.places as existing where existing.id <> target_place_id), 0)
  ) on conflict (id) do update set
    name = excluded.name, note = excluded.note, longitude = excluded.longitude, latitude = excluded.latitude,
    parking_condition = excluded.parking_condition, gmap_url = excluded.gmap_url, path_type = excluded.path_type,
    path = excluded.path, position = (place->>'position')::integer;

  delete from public.place_tags where public.place_tags.place_id = target_place_id;
  for tag_id, tag_position in
    select value, ordinality - 1 from jsonb_array_elements_text(coalesce(place->'tags', '[]'::jsonb)) with ordinality
  loop
    insert into public.place_tags (place_id, tag_id, position) values (target_place_id, tag_id, tag_position);
  end loop;

  delete from public.place_images where public.place_images.place_id = target_place_id;
  for image_record in select value from jsonb_array_elements(coalesce(place->'images', '[]'::jsonb)) loop
    insert into public.place_images (id, place_id, data_url, position)
    values (image_record->>'id', target_place_id, image_record->>'dataUrl', image_position);
    if image_record ?& array['width', 'height', 'thumbnailDataUrl'] then
      insert into public.place_image_metadata (id, place_id, position, width, height, latitude, longitude, thumbnail_data_url)
      values (
        image_record->>'id', target_place_id, image_position,
        (image_record->>'width')::integer, (image_record->>'height')::integer,
        nullif(image_record->>'latitude', 'null')::double precision,
        nullif(image_record->>'longitude', 'null')::double precision,
        image_record->>'thumbnailDataUrl'
      );
    end if;
    image_position := image_position + 1;
  end loop;
end;
$$;

revoke all on function public.save_place(jsonb) from public, anon;
grant execute on function public.save_place(jsonb) to authenticated;

create or replace function public.replace_catalog(catalog jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tag_record jsonb;
  place_record jsonb;
  image_record jsonb;
  tag_id text;
  place_id text;
  tag_position integer;
  place_position integer := 0;
  image_position integer;
begin
  delete from public.place_tags where true;
  delete from public.place_images where true;
  delete from public.places where true;
  delete from public.tags where true;
  tag_position := 0;
  for tag_record in select * from jsonb_array_elements(catalog->'tags') loop
    insert into public.tags (id, label, icon, color, description, show_on_map, display_title, position)
    values (tag_record->>'id', tag_record->>'label', nullif(tag_record->>'icon', ''), nullif(tag_record->>'color', ''),
      coalesce(tag_record->>'description', ''), coalesce((tag_record->>'showOnMap')::boolean, false),
      coalesce(tag_record->>'displayTitle', ''), tag_position);
    tag_position := tag_position + 1;
  end loop;

  for place_record in select * from jsonb_array_elements(catalog->'places') loop
    place_id := place_record->>'id';
    insert into public.places (id, name, note, longitude, latitude, parking_condition, gmap_url, path_type, path, position)
    values (place_id, place_record->>'name', coalesce(place_record->>'note', ''),
      (place_record->>'longitude')::double precision, (place_record->>'latitude')::double precision,
      (place_record->>'parkingCondition')::integer, nullif(place_record->>'gmapUrl', ''),
      (place_record->>'pathType')::integer, coalesce(place_record->>'path', ''), place_position);
    place_position := place_position + 1;
    for tag_id, tag_position in
      select value, ordinality - 1 from jsonb_array_elements_text(place_record->'tags') with ordinality
    loop
      insert into public.place_tags (place_id, tag_id, position) values (place_id, tag_id, tag_position);
    end loop;
    image_position := 0;
    for image_record in select value from jsonb_array_elements(coalesce(place_record->'images', '[]'::jsonb)) loop
      insert into public.place_images (id, place_id, data_url, position)
      values (image_record->>'id', place_id, image_record->>'dataUrl', image_position);
      if image_record ?& array['width', 'height', 'thumbnailDataUrl'] then
        insert into public.place_image_metadata (id, place_id, position, width, height, latitude, longitude, thumbnail_data_url)
        values (image_record->>'id', place_id, image_position, (image_record->>'width')::integer,
          (image_record->>'height')::integer, nullif(image_record->>'latitude', 'null')::double precision,
          nullif(image_record->>'longitude', 'null')::double precision, image_record->>'thumbnailDataUrl');
      end if;
      image_position := image_position + 1;
    end loop;
  end loop;
end;
$$;

revoke all on function public.replace_catalog(jsonb) from public, anon;
grant execute on function public.replace_catalog(jsonb) to authenticated;
notify pgrst, 'reload schema';
