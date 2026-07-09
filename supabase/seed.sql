-- =========================
-- CADERNINHO — Seed: estúdio demo + catálogo de serviços
-- Profissionais entram via convite da gestora (fluxo /invite/:token).
-- Para criar a gestora: cadastre-se no app e rode:
--   update profiles set role = 'owner' where id = 'SEU_USER_ID';
-- =========================

insert into studios (name, slug, phone, settings)
values (
  'Estúdio Caderninho',
  'caderninho',
  null,
  '{
    "min_cancel_hours": 4,
    "slot_step_minutes": 15,
    "opening_hours": { "start": "08:00", "end": "20:00" }
  }'::jsonb
);

insert into services (studio_id, name, price, duration_minutes)
select s.id, v.name, v.price, v.duration
from studios s,
(values
  ('Esmaltação simples',        35.00,  45),
  ('Esmaltação em gel',         60.00,  60),
  ('Alongamento fibra de vidro', 180.00, 150),
  ('Manutenção de alongamento',  90.00,  90),
  ('Spa dos pés',                70.00,  60),
  ('Pé e mão',                   65.00,  75)
) as v(name, price, duration)
where s.slug = 'caderninho';
