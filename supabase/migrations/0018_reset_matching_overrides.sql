-- =========================
-- CADERNINHO — Override igual ao catálogo vira NULL
--
-- Bug: o drawer da Equipe pré-preenchia preço/duração com o valor do catálogo
-- e gravava esse número em professional_services ao salvar. Como
-- book_appointment usa coalesce(override, services.price), o reajuste feito
-- na aba Serviços nunca chegava ao agendamento — ficava congelado na cópia.
--
-- Esta migration limpa só as cópias que ainda batem com o catálogo (sem
-- mudança de comportamento hoje; passam a seguir reajustes futuros).
-- Overrides DIFERENTES do catálogo são mantidos: podem ser preço próprio de
-- propósito (ex.: comissão 100% da gestora) ou preço antigo — decisão humana.
-- =========================

update professional_services ps
set price = null
from services s
where s.id = ps.service_id
  and ps.price is not null
  and ps.price = s.price;

update professional_services ps
set duration_minutes = null
from services s
where s.id = ps.service_id
  and ps.duration_minutes is not null
  and ps.duration_minutes = s.duration_minutes;
