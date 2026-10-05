do $$
declare
  function_record record;
begin
  for function_record in
    select
      namespace.nspname as schema_name,
      proc.proname as function_name,
      pg_get_function_identity_arguments(proc.oid) as arguments
    from pg_proc as proc
    join pg_namespace as namespace
      on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.prokind = 'f'
      and not exists (
        select 1
        from unnest(coalesce(proc.proconfig, array[]::text[])) as setting
        where setting like 'statement_timeout=%'
      )
  loop
    execute format(
      'alter function %I.%I(%s) set statement_timeout = %L',
      function_record.schema_name,
      function_record.function_name,
      function_record.arguments,
      '1min'
    );
  end loop;
end;
$$;
