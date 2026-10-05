create or replace function public.save_place(place jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  place_id text := place->>'id';
  tag_id text;
  tag_position integer;
  path_record jsonb;
  path_position integer := 0;
  image_record jsonb;
  image_position integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if place_id is null or place_id = '' then
    raise exception 'Place id is required';
  end if;

  insert into public.places (
    id, name, note, longitude, latitude, parking_condition, gmap_url,
    path_type, position
  )
  values (
    place_id,
    place->>'name',
    coalesce(place->>'note', ''),
    (place->>'longitude')::double precision,
    (place->>'latitude')::double precision,
    (place->>'parkingCondition')::integer,
    nullif(place->>'gmapUrl', ''),
    (place->>'pathType')::integer,
    coalesce(
      (select max(existing.position) + 1
       from public.places as existing
       where existing.id <> place_id),
      0
    )
  )
  on conflict (id) do update set
    name = excluded.name,
    note = excluded.note,
    longitude = excluded.longitude,
    latitude = excluded.latitude,
    parking_condition = excluded.parking_condition,
    gmap_url = excluded.gmap_url,
    path_type = excluded.path_type,
    position = (place->>'position')::integer;

  delete from public.place_tags where place_tags.place_id = place_id;
  for tag_id, tag_position in
    select value, ordinality - 1
    from jsonb_array_elements_text(coalesce(place->'tags', '[]'::jsonb))
    with ordinality
  loop
    insert into public.place_tags (place_id, tag_id, position)
    values (place_id, tag_id, tag_position);
  end loop;

  delete from public.place_paths where place_paths.place_id = place_id;
  for path_record in
    select value from jsonb_array_elements(coalesce(place->'path', '[]'::jsonb))
  loop
    path_position := path_position + 1;
    insert into public.place_paths (place_id, position, longitude, latitude)
    values (
      place_id,
      path_position - 1,
      (path_record->>0)::double precision,
      (path_record->>1)::double precision
    );
  end loop;

  delete from public.place_images where place_images.place_id = place_id;
  for image_record in
    select value from jsonb_array_elements(coalesce(place->'images', '[]'::jsonb))
  loop
    image_position := image_position + 1;
    insert into public.place_images (id, place_id, data_url, position)
    values (
      image_record->>'id',
      place_id,
      image_record->>'dataUrl',
      image_position - 1
    );
  end loop;
end;
$$;

create or replace function public.delete_place(place_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.places where id = place_id;
end;
$$;

create or replace function public.save_tag(tag jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  insert into public.tags (
    id, label, icon, color, description, show_on_map, display_title, position
  )
  values (
    tag->>'id',
    tag->>'label',
    nullif(tag->>'icon', ''),
    nullif(tag->>'color', ''),
    coalesce(tag->>'description', ''),
    coalesce((tag->>'showOnMap')::boolean, false),
    coalesce(tag->>'displayTitle', ''),
    coalesce(
      (select max(existing.position) + 1
       from public.tags as existing
       where existing.id <> (tag->>'id')),
      0
    )
  )
  on conflict (id) do update set
    label = excluded.label,
    icon = excluded.icon,
    color = excluded.color,
    description = excluded.description,
    show_on_map = excluded.show_on_map,
    display_title = excluded.display_title,
    position = public.tags.position;
end;
$$;

create or replace function public.delete_tag(tag_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  delete from public.tags where id = tag_id;
end;
$$;

create or replace function public.reorder_tags(tag_ids jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  tag_id text;
  tag_position integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  update public.tags
  set position = position + 1000000
  where id in (
    select value
    from jsonb_array_elements_text(tag_ids)
  );

  for tag_id, tag_position in
    select value, ordinality - 1
    from jsonb_array_elements_text(tag_ids) with ordinality
  loop
    update public.tags
    set position = tag_position
    where id = tag_id;
  end loop;
end;
$$;

revoke all on function public.save_place(jsonb) from public, anon;
revoke all on function public.delete_place(text) from public, anon;
revoke all on function public.save_tag(jsonb) from public, anon;
revoke all on function public.delete_tag(text) from public, anon;
revoke all on function public.reorder_tags(jsonb) from public, anon;
revoke execute on function public.replace_catalog(jsonb) from authenticated;

grant usage on schema public to authenticated;
grant execute on function public.save_place(jsonb) to authenticated;
grant execute on function public.delete_place(text) to authenticated;
grant execute on function public.save_tag(jsonb) to authenticated;
grant execute on function public.delete_tag(text) to authenticated;
grant execute on function public.reorder_tags(jsonb) to authenticated;
