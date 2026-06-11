# Porra Mundial 2026 — Cambios (ronda 3)

## SQL a ejecutar en Supabase (en este orden)
1. `setup-supabase.sql` — tablas base + `settings` (si no está ya aplicado).
2. `scoring-engine.sql` — función `recalculate_all_scores` y reglas de puntos.
3. `backups-and-rollback.sql` — **NUEVO**: copias de seguridad automáticas 2×/día y restauración por etiqueta. Requiere la extensión `pg_cron` (Database → Extensions → activar `pg_cron`).

## Funcionalidades nuevas (ronda 3)
1. **Logo → Iniciar sesión**: el logo de la portada (`porra-mundial-2026.html`) ahora enlaza a `porra-login.html`.
2. **Selector de zona horaria en el aviso (banner)**: en Ajustes puedes escribir la hora del aviso en Costa Este (EST/EDT) **o** Costa Oeste / Seattle (PST/PDT). Se guarda siempre normalizada a hora del Este, por lo que el banner que ven los jugadores no cambia de contrato.
3. **Desglose de puntos clicable en Clasificación**: al pulsar el total de puntos (o la flecha ▾) se despliega el desglose por fase sin salir de la página. La fila sigue navegando a las predicciones del jugador.
4. **Pestaña Comunicación**: panel de destinatarios (copiar correos de todos / pagados / pendientes para pegar en CCO) + redactor de email con 4 plantillas, contador de caracteres, copiar texto y abrir en el cliente de correo (CCO).
5. **Partidos anteriores** (en "Partidos y Puntos"): revisa o corrige resultados de días pasados, con filtro "Solo sin resultado" para cazar marcadores olvidados. Guarda con `recalculate_all_scores`.
6. **Cuadro de Honor — bloqueo de edición**: el enlace "Editar" de Campeón/Subcampeón ahora alterna Editar ⇄ Bloquear con resaltado, para evitar cambios accidentales tras corregir.
7. **Copias de seguridad + restauración** (`backups-and-rollback.sql`): snapshots automáticos a las 07:00 y 19:00, limpieza diaria (conserva 14 + manuales/pre-rollback), y restauración por etiqueta con snapshot de seguridad previo. Solo cubre tablas de la base de datos (no el bucket de avatares).

## Resultados en vivo
- `porra-live.html` usa los widgets de **API-Sports**, que leen la clave desde `settings.apifootball_key`. Basta con pegar la clave en **Admin → Ajustes → Resultados en vivo**; no hace falta ningún Edge Function ni cron para los marcadores en vivo.

---

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
