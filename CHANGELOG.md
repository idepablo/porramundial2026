# Porra Mundial 2026 — Cambios (ronda 2)

## SQL a ejecutar en Supabase (en este orden, todo idempotente)
1. (ya hecho) tabla `ko_predictions`
2. Constraint único en predictions:
   do $$ begin
     if not exists (select 1 from pg_constraint where conname='predictions_user_match_uniq') then
       alter table public.predictions add constraint predictions_user_match_uniq unique (user_id, match_id);
     end if; end $$;
3. Columna `blocked` en users (para bloquear jugadores):
   do $$ begin
     if not exists (select 1 from information_schema.columns
       where table_schema='public' and table_name='users' and column_name='blocked') then
       alter table public.users add column blocked boolean not null default false;
     end if; end $$;

## Tweaks de la auditoría
- Landing: "Cierre" con la palabra "hora"; Paso 1 incluye Bizum; CTA "Únete a la Porra".
- Registro/pagos: quitada la nota "para los que pagan desde España" y los emojis (→ y ⏳) de los métodos de pago.
- Picks: nombres en español en el Resumen; el Resumen muestra día Y hora de cierre.
- Hora de cierre unificada en todas las páginas: "21:00 (hora de España) · 15:00 (hora del Este, EE. UU.)".

## Admin (esta ronda)
- "Resumen General" es ahora la página de inicio del admin (carga primero).
- Barra lateral y títulos en español ("Resumen del Día", etc.).
- Botón superior derecho: "Acceder como usuario" (→ página de usuario).
- En el sitio de usuario, el enlace de admin dice "Acceder como admin".
- Usuarios: Editar (nombre, apellidos, alias, correo, teléfono, país, estado de pago),
  Bloquear/Desbloquear (columna blocked), y Eliminar permanentemente (borra al jugador y
  todas sus predicciones, con doble confirmación). Estado muestra Pagado / No pagado / Bloqueado.

## PENDIENTE
- Motor de puntuación `recalculate_match_scores` (espera tu sistema de puntos final + decisión de standings).
- Editar las PREDICCIONES de un jugador desde el admin (lo de "Ver predicciones" lo enseña; falta hacerlo editable). Pieza aparte.
- Aviso por email a admins + registro de cambios → necesita backend (Edge Function + email).
- "Tareas Pendientes" en el Resumen General (partidos del día por introducir).
- RLS / seguridad (acordado: se hace mañana con el sitio en marcha, tabla por tabla, sin downtime).
- "Goleadores" en Resultados (dato de torneo).
- Sistema de puntos en todas las páginas (cuando lo tengas final).

## Sistema de puntos confirmado (acumulativo) — total 1.480 pts
- Grupos: 1 / +2 / +3 (máx 6/partido) → 432
- Posiciones de grupo: 5/posición (×48) → 240
- Eliminatorias "equipo clasificado": R32 4 · R16 6 · QF 8 · SF 10 · Final 12
- Eliminatorias acierto marcador (solo si coinciden ambos equipos del cruce, acumulativo):
  R32 2/3/4 · R16 3/4/5 · QF 4/5/6 · SF 5/6/7 · Final 10/15/20
- Campeón 35 · Subcampeón 20 · Balón de Oro 10 · Bota de Oro 10
- Páginas actualizadas: landing (sistema de puntos + total 1.480), home (GRAND_TOTAL=1480),
  leaderboard (máximos por fase).
- Mejores terceros: criterios FIFA 1-3 (puntos, DG, goles) YA están en la lógica del bracket
  del usuario. Criterios 4 (fair play) y 5 (ranking FIFA) se podrán añadir luego sin downtime.

## PRÓXIMO: motor de puntuación (recalculate_all_scores)
Es la pieza grande que falta. Recalcula todo desde los resultados reales: grupos, posiciones,
eliminatorias (reconstruyendo el bracket real + mejores terceros + desempates), campeón/subcampeón
y honores. No hay datos hasta el 11 jun, así que conviene construirlo y PROBARLO con calma como
pieza propia antes de esa fecha. (Falta también definir dónde se introduce el goleador/mejor
jugador reales para puntuar Bota/Balón.)
