-- =========================
-- CADERNINHO — Triggers
-- =========================

-- 1. Novo usuário auth → profile (sempre 'client'; owner/professional são
--    promovidos por convite ou manualmente — evita escalação de privilégio
--    via metadata do signup).
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_studio uuid;
begin
  select id into v_studio from studios
  where slug = new.raw_user_meta_data->>'studio_slug';

  if v_studio is null then
    select id into v_studio from studios order by created_at limit 1;
  end if;

  if v_studio is null then
    raise exception 'Nenhum estúdio cadastrado';
  end if;

  insert into profiles (id, studio_id, role, full_name, phone)
  values (
    new.id,
    v_studio,
    'client',
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  );
  return new;
end
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Atendimento finalizado → earning (regra de ouro: snapshots congelados;
--    cancelado/no-show nunca gera comissão).
create or replace function create_earning_on_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' and old.status is distinct from 'done' then
    insert into earnings (
      studio_id, professional_id, appointment_id,
      gross_value, commission_value, studio_value, earned_at
    )
    values (
      new.studio_id,
      new.professional_id,
      new.id,
      new.price_snapshot,
      round(new.price_snapshot * new.commission_pct_snapshot / 100, 2),
      new.price_snapshot - round(new.price_snapshot * new.commission_pct_snapshot / 100, 2),
      coalesce(new.actual_end, now())
    )
    on conflict (appointment_id) do nothing;
  end if;

  -- Reversão: se sair de 'done' (correção da gestora), remove o earning
  if old.status = 'done' and new.status is distinct from 'done' then
    delete from earnings where appointment_id = new.id;
  end if;

  return new;
end
$$;

create trigger on_appointment_done
  after update on appointments
  for each row execute function create_earning_on_done();

-- 3. Activity log genérico (trigger para não esquecer nenhuma escrita)
create or replace function log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
  v_studio uuid;
  v_entity uuid;
begin
  -- em DELETE o registro NEW não é atribuído (e vice-versa em INSERT)
  if tg_op = 'DELETE' then
    v_studio := old.studio_id;
    v_entity := old.id;
  else
    v_studio := new.studio_id;
    v_entity := new.id;
  end if;
  v_action := tg_table_name || '.' || lower(tg_op);

  -- ação mais descritiva para mudanças de status de atendimento
  -- (IF aninhado: Postgres não garante short-circuit e new.status
  -- não existe nas outras tabelas auditadas)
  if tg_table_name = 'appointments' and tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      v_action := 'appointment.' || new.status;
    end if;
  end if;

  insert into activity_log (studio_id, actor_id, action, entity_type, entity_id, metadata)
  values (
    v_studio,
    auth.uid(),
    v_action,
    tg_table_name,
    v_entity,
    case tg_op
      when 'INSERT' then jsonb_build_object('new', to_jsonb(new))
      when 'UPDATE' then jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
      else jsonb_build_object('old', to_jsonb(old))
    end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end
$$;

create trigger log_appointments after insert or update or delete on appointments
  for each row execute function log_activity();
create trigger log_services after insert or update or delete on services
  for each row execute function log_activity();
create trigger log_availability_rules after insert or update or delete on availability_rules
  for each row execute function log_activity();
create trigger log_availability_exceptions after insert or update or delete on availability_exceptions
  for each row execute function log_activity();
create trigger log_goals after insert or update or delete on goals
  for each row execute function log_activity();
