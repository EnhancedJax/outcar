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
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_place_id is null or target_place_id = '' then
    raise exception 'Place id is required';
  end if;

  insert into public.places (
    id, name, note, longitude, latitude, parking_condition, gmap_url,
    path_type, path, position
  )
  values (
    target_place_id,
    place->>'name',
    coalesce(place->>'note', ''),
    (place->>'longitude')::double precision,
    (place->>'latitude')::double precision,
    (place->>'parkingCondition')::integer,
    nullif(place->>'gmapUrl', ''),
    (place->>'pathType')::integer,
    coalesce(
      (
        select string_agg(
          format('%s,%s', value->>0, value->>1),
          '|'
          order by ordinality
        )
        from jsonb_array_elements(coalesce(place->'path', '[]'::jsonb))
        with ordinality
      ),
      ''
    ),
    coalesce(
      (select max(existing.position) + 1
       from public.places as existing
       where existing.id <> target_place_id),
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
    path = excluded.path,
    position = (place->>'position')::integer;

  delete from public.place_tags
  where public.place_tags.place_id = target_place_id;

  for tag_id, tag_position in
    select value, ordinality - 1
    from jsonb_array_elements_text(coalesce(place->'tags', '[]'::jsonb))
    with ordinality
  loop
    insert into public.place_tags (place_id, tag_id, position)
    values (target_place_id, tag_id, tag_position);
  end loop;

  delete from public.place_images
  where public.place_images.place_id = target_place_id;

  for image_record in
    select value from jsonb_array_elements(coalesce(place->'images', '[]'::jsonb))
  loop
    image_position := image_position + 1;
    insert into public.place_images (id, place_id, data_url, position)
    values (
      image_record->>'id',
      target_place_id,
      image_record->>'dataUrl',
      image_position - 1
    );
  end loop;
end;
$$;

revoke all on function public.save_place(jsonb) from public, anon;
grant usage on schema public to authenticated;
grant execute on function public.save_place(jsonb) to authenticated;

notify pgrst, 'reload schema';
