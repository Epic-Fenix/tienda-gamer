-- Texto editable del botón principal (amarillo) del banner. Vacío = "Reservar Preventa".
alter table banners add column if not exists primary_text text;
