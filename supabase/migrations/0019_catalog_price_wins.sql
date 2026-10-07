-- =========================
-- CADERNINHO — O catálogo manda no preço
--
-- Decisão do estúdio (2026-10-07): quando o preço ou a duração de um serviço
-- muda na aba Serviços, TODAS as profissionais passam a cobrar o novo valor.
-- Qualquer preço/duração próprio gravado em professional_services para esse
-- serviço é apagado no mesmo instante, pelo banco, independente de quem
-- editou (gestora, profissional ou secretária — a RLS de
-- professional_services só deixa a gestora escrever, por isso a trigger é
-- security definer).
--
-- Atendimentos já marcados não mudam: o preço fica congelado no snapshot.
-- =========================

create or replace function reset_overrides_on_service_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.price is distinct from old.price then
    update professional_services
    set price = null
    where service_id = new.id and price is not null;
  end if;

  if new.duration_minutes is distinct from old.duration_minutes then
    update professional_services
    set duration_minutes = null
    where service_id = new.id and duration_minutes is not null;
  end if;

  return new;
end $$;

revoke execute on function reset_overrides_on_service_change() from public, anon, authenticated;

drop trigger if exists services_reset_overrides on services;
create trigger services_reset_overrides
  after update of price, duration_minutes on services
  for each row execute function reset_overrides_on_service_change();
