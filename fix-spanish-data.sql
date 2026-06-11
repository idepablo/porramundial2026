-- ════════════════════════════════════════════════════════════════════════════
-- fix-spanish-data.sql  ·  Porra Mundial 2026
-- Traduce nombres de selecciones al español en `matches` y arregla el país de
-- los usuarios (#3 y #9). Es idempotente: puedes ejecutarlo más de una vez.
-- ════════════════════════════════════════════════════════════════════════════

-- ── PASO 0 (opcional): mira qué hay ahora mismo ──────────────────────────────
-- Ejecuta SOLO estas dos líneas primero para ver los valores actuales.
-- Si aparece alguna selección en inglés que NO esté en la lista de abajo,
-- añádela al VALUES y vuelve a ejecutar el script.
--   select distinct home_team from public.matches order by 1;
--   select distinct country, length(country) as len from public.users order by 1;

-- ── PASO 1: selecciones inglés → español (matches.home_team / away_team) ──────
with map(en, es) as (values
  -- Anfitriones
  ('United States','Estados Unidos'), ('USA','Estados Unidos'), ('US','Estados Unidos'),
  ('Mexico','México'), ('Canada','Canadá'),
  -- Europa
  ('Spain','España'), ('Germany','Alemania'), ('France','Francia'), ('England','Inglaterra'),
  ('Portugal','Portugal'), ('Netherlands','Países Bajos'), ('Belgium','Bélgica'),
  ('Croatia','Croacia'), ('Italy','Italia'), ('Switzerland','Suiza'), ('Denmark','Dinamarca'),
  ('Poland','Polonia'), ('Serbia','Serbia'), ('Austria','Austria'), ('Ukraine','Ucrania'),
  ('Scotland','Escocia'), ('Wales','Gales'), ('Norway','Noruega'), ('Sweden','Suecia'),
  ('Czech Republic','Chequia'), ('Czechia','Chequia'), ('Turkey','Turquía'), ('Türkiye','Turquía'),
  ('Greece','Grecia'), ('Hungary','Hungría'), ('Romania','Rumanía'), ('Slovenia','Eslovenia'),
  ('Slovakia','Eslovaquia'), ('Republic of Ireland','Irlanda'), ('Ireland','Irlanda'),
  ('Iceland','Islandia'), ('Finland','Finlandia'), ('Albania','Albania'), ('Georgia','Georgia'),
  -- Sudamérica
  ('Argentina','Argentina'), ('Brazil','Brasil'), ('Uruguay','Uruguay'), ('Colombia','Colombia'),
  ('Ecuador','Ecuador'), ('Peru','Perú'), ('Chile','Chile'), ('Paraguay','Paraguay'),
  ('Venezuela','Venezuela'), ('Bolivia','Bolivia'),
  -- CONCACAF
  ('Costa Rica','Costa Rica'), ('Panama','Panamá'), ('Jamaica','Jamaica'),
  ('Honduras','Honduras'), ('El Salvador','El Salvador'), ('Guatemala','Guatemala'),
  -- África
  ('Morocco','Marruecos'), ('Senegal','Senegal'), ('Egypt','Egipto'), ('Nigeria','Nigeria'),
  ('Ghana','Ghana'), ('Cameroon','Camerún'), ('Algeria','Argelia'), ('Tunisia','Túnez'),
  ('Ivory Coast','Costa de Marfil'), ('Côte d''Ivoire','Costa de Marfil'),
  ('South Africa','Sudáfrica'), ('Mali','Malí'), ('DR Congo','RD Congo'), ('Cape Verde','Cabo Verde'),
  -- Asia / Oceanía
  ('Japan','Japón'), ('South Korea','Corea del Sur'), ('Korea Republic','Corea del Sur'),
  ('Iran','Irán'), ('IR Iran','Irán'), ('Saudi Arabia','Arabia Saudí'), ('Australia','Australia'),
  ('Qatar','Catar'), ('Iraq','Irak'), ('United Arab Emirates','Emiratos Árabes Unidos'),
  ('Uzbekistan','Uzbekistán'), ('Jordan','Jordania'), ('New Zealand','Nueva Zelanda'),
  ('Bosnia & Herz.','Bosnia y Herzegovina'), ('Curaçao','Curazao'), ('Haiti','Haití')
)
update public.matches t set home_team = map.es from map where t.home_team = map.en;

with map(en, es) as (values
  ('United States','Estados Unidos'), ('USA','Estados Unidos'), ('US','Estados Unidos'),
  ('Mexico','México'), ('Canada','Canadá'),
  ('Spain','España'), ('Germany','Alemania'), ('France','Francia'), ('England','Inglaterra'),
  ('Portugal','Portugal'), ('Netherlands','Países Bajos'), ('Belgium','Bélgica'),
  ('Croatia','Croacia'), ('Italy','Italia'), ('Switzerland','Suiza'), ('Denmark','Dinamarca'),
  ('Poland','Polonia'), ('Serbia','Serbia'), ('Austria','Austria'), ('Ukraine','Ucrania'),
  ('Scotland','Escocia'), ('Wales','Gales'), ('Norway','Noruega'), ('Sweden','Suecia'),
  ('Czech Republic','Chequia'), ('Czechia','Chequia'), ('Turkey','Turquía'), ('Türkiye','Turquía'),
  ('Greece','Grecia'), ('Hungary','Hungría'), ('Romania','Rumanía'), ('Slovenia','Eslovenia'),
  ('Slovakia','Eslovaquia'), ('Republic of Ireland','Irlanda'), ('Ireland','Irlanda'),
  ('Iceland','Islandia'), ('Finland','Finlandia'), ('Albania','Albania'), ('Georgia','Georgia'),
  ('Argentina','Argentina'), ('Brazil','Brasil'), ('Uruguay','Uruguay'), ('Colombia','Colombia'),
  ('Ecuador','Ecuador'), ('Peru','Perú'), ('Chile','Chile'), ('Paraguay','Paraguay'),
  ('Venezuela','Venezuela'), ('Bolivia','Bolivia'),
  ('Costa Rica','Costa Rica'), ('Panama','Panamá'), ('Jamaica','Jamaica'),
  ('Honduras','Honduras'), ('El Salvador','El Salvador'), ('Guatemala','Guatemala'),
  ('Morocco','Marruecos'), ('Senegal','Senegal'), ('Egypt','Egipto'), ('Nigeria','Nigeria'),
  ('Ghana','Ghana'), ('Cameroon','Camerún'), ('Algeria','Argelia'), ('Tunisia','Túnez'),
  ('Ivory Coast','Costa de Marfil'), ('Côte d''Ivoire','Costa de Marfil'),
  ('South Africa','Sudáfrica'), ('Mali','Malí'), ('DR Congo','RD Congo'), ('Cape Verde','Cabo Verde'),
  ('Japan','Japón'), ('South Korea','Corea del Sur'), ('Korea Republic','Corea del Sur'),
  ('Iran','Irán'), ('IR Iran','Irán'), ('Saudi Arabia','Arabia Saudí'), ('Australia','Australia'),
  ('Qatar','Catar'), ('Iraq','Irak'), ('United Arab Emirates','Emiratos Árabes Unidos'),
  ('Uzbekistan','Uzbekistán'), ('Jordan','Jordania'), ('New Zealand','Nueva Zelanda'),
  ('Bosnia & Herz.','Bosnia y Herzegovina'), ('Curaçao','Curazao'), ('Haiti','Haití')
)
update public.matches t set away_team = map.es from map where t.away_team = map.en;

-- ── PASO 1b: traducir los nombres guardados en las predicciones de eliminatorias ──
-- (los nombres de selección que cada usuario eligió en su cuadro están en
--  ko_predictions y NO se tocaron antes). Usamos una tabla temporal para no
--  repetir la lista 3 veces.
create temporary table if not exists _team_map(en text primary key, es text);
truncate _team_map;
insert into _team_map(en, es) values
  ('United States','Estados Unidos'),('USA','Estados Unidos'),('US','Estados Unidos'),
  ('Mexico','México'),('Canada','Canadá'),
  ('Spain','España'),('Germany','Alemania'),('France','Francia'),('England','Inglaterra'),
  ('Portugal','Portugal'),('Netherlands','Países Bajos'),('Belgium','Bélgica'),('Croatia','Croacia'),
  ('Italy','Italia'),('Switzerland','Suiza'),('Denmark','Dinamarca'),('Poland','Polonia'),('Serbia','Serbia'),
  ('Austria','Austria'),('Ukraine','Ucrania'),('Scotland','Escocia'),('Wales','Gales'),('Norway','Noruega'),
  ('Sweden','Suecia'),('Czech Republic','Chequia'),('Czechia','Chequia'),('Turkey','Turquía'),('Türkiye','Turquía'),
  ('Greece','Grecia'),('Hungary','Hungría'),('Romania','Rumanía'),('Slovenia','Eslovenia'),('Slovakia','Eslovaquia'),
  ('Republic of Ireland','Irlanda'),('Ireland','Irlanda'),('Iceland','Islandia'),('Finland','Finlandia'),
  ('Albania','Albania'),('Georgia','Georgia'),
  ('Argentina','Argentina'),('Brazil','Brasil'),('Uruguay','Uruguay'),('Colombia','Colombia'),('Ecuador','Ecuador'),
  ('Peru','Perú'),('Chile','Chile'),('Paraguay','Paraguay'),('Venezuela','Venezuela'),('Bolivia','Bolivia'),
  ('Costa Rica','Costa Rica'),('Panama','Panamá'),('Jamaica','Jamaica'),('Honduras','Honduras'),
  ('El Salvador','El Salvador'),('Guatemala','Guatemala'),('Haiti','Haití'),('Curaçao','Curazao'),('Curacao','Curazao'),
  ('Morocco','Marruecos'),('Senegal','Senegal'),('Egypt','Egipto'),('Nigeria','Nigeria'),('Ghana','Ghana'),
  ('Cameroon','Camerún'),('Algeria','Argelia'),('Tunisia','Túnez'),('Ivory Coast','Costa de Marfil'),
  ('Côte d''Ivoire','Costa de Marfil'),('South Africa','Sudáfrica'),('Mali','Malí'),('DR Congo','RD Congo'),
  ('Cape Verde','Cabo Verde'),('Bosnia & Herz.','Bosnia y Herzegovina'),('Bosnia and Herzegovina','Bosnia y Herzegovina'),
  ('Japan','Japón'),('South Korea','Corea del Sur'),('Korea Republic','Corea del Sur'),('Iran','Irán'),('IR Iran','Irán'),
  ('Saudi Arabia','Arabia Saudí'),('Australia','Australia'),('Qatar','Catar'),('Iraq','Irak'),
  ('United Arab Emirates','Emiratos Árabes Unidos'),('Uzbekistan','Uzbekistán'),('Jordan','Jordania'),('New Zealand','Nueva Zelanda')
on conflict (en) do nothing;

update public.ko_predictions k set home_team = m.es from _team_map m where k.home_team = m.en;
update public.ko_predictions k set away_team = m.es from _team_map m where k.away_team = m.en;
update public.ko_predictions k set advanced  = m.es from _team_map m where k.advanced  = m.en;
drop table if exists _team_map;

-- ── PASO 2: arreglar el país de los usuarios (#9) ────────────────────────────
-- 2a. Quitar espacios raros (dobles espacios, al principio o al final).
update public.users
set country = btrim(regexp_replace(country, '\s+', ' ', 'g'))
where country is not null
  and country <> btrim(regexp_replace(country, '\s+', ' ', 'g'));

-- 2b. Traducir nombres de país en inglés al español.
update public.users set country = 'Estados Unidos'
  where country in ('United States','USA','US','United States of America');
update public.users set country = 'Reino Unido' where country = 'United Kingdom';
update public.users set country = 'España'        where country = 'Spain';
update public.users set country = 'México'         where country = 'Mexico';
update public.users set country = 'Alemania'       where country = 'Germany';
update public.users set country = 'Francia'        where country = 'France';
update public.users set country = 'Bélgica'        where country = 'Belgium';
update public.users set country = 'Países Bajos'   where country in ('Netherlands','Holland');

-- ── COMPROBACIÓN ─────────────────────────────────────────────────────────────
-- select distinct home_team from public.matches order by 1;
-- select distinct country, length(country) as len from public.users order by 1;
