# Guía de despliegue — Porra Mundial 2026

Sigue estos pasos en orden. Marca cada uno al terminar. Lo más urgente está en
**§4 — Antes del primer partido**.

---

## 1. Supabase — base de datos (SQL)

Entra en tu proyecto Supabase → **SQL Editor** → *New query*, y ejecuta cada
archivo (pega el contenido y pulsa *Run*). Todos son idempotentes: puedes
volver a ejecutarlos sin romper nada.

1. **`setup-supabase.sql`** — crea las tablas (`users`, `matches`,
   `predictions`, `ko_predictions`, `honours_predictions`, `group_predictions`,
   `scores`, `settings`, `contact_messages`) y el bucket `avatars`.
   *Si ya lo ejecutaste en rondas anteriores, vuelve a correrlo igualmente: no
   duplica datos.*
2. **`scoring-engine.sql`** — crea la función `recalculate_all_scores()` y las
   reglas de puntuación. El panel de admin la llama cada vez que guardas un
   resultado o los premios.
3. **`backups-and-rollback.sql`** — copias de seguridad automáticas.
   - **Antes de ejecutarlo**, activa la extensión de cron:
     *Database → Extensions → busca `pg_cron` → Enable.*
   - Luego ejecuta el archivo. Al instalarse toma un snapshot inicial
     (`baseline_launch`) y programa dos copias diarias (07:00 y 19:00) más una
     limpieza diaria.
   - Para una copia manual antes de tocar algo: `select backups.create_snapshot('antes_de_X','manual','nota');`
   - Para listar copias: `select * from backups.list_snapshots();`
   - Para restaurar: `select backups.restore_snapshot('etiqueta', true);`
     (toma automáticamente un snapshot `pre_rollback_…` antes de restaurar).
   - **Nota**: sólo respalda tablas de la base de datos, **no** los avatares del
     bucket de Storage.

## 2. Resultados en vivo (API-Football)

No requiere ningún servidor ni Edge Function. La página `porra-live.html` usa
los widgets de API-Sports, que leen la clave desde la base de datos.

1. Crea una cuenta en https://www.api-football.com/ y copia tu **API key**.
2. Entra en la web como admin → **Ajustes → Resultados en vivo — Clave API**.
3. Pega la clave y pulsa **Guardar**. Listo: la pestaña "En vivo" empezará a
   mostrar partidos y clasificación.
   - La clave queda visible en el navegador de los jugadores (así funcionan los
     widgets). Si se filtra, regénerala en api-football.com y vuelve a pegarla.

## 3. GitHub Pages — sitio web

El sitio es estático (HTML/CSS/JS), así que GitHub Pages lo sirve tal cual.

1. Sube **todos** los archivos de este zip a la raíz del repo
   `idepablo/porramundial2026` (rama `main`). No subas `DEPLOY.md` ni
   `CHANGELOG.md` si no quieres; no afectan al sitio.
   ```bash
   git add .
   git commit -m "Ronda 3: comunicación, partidos anteriores, backups, etc."
   git push origin main
   ```
2. En el repo → **Settings → Pages**: *Source* = `Deploy from a branch`,
   *Branch* = `main` / `/ (root)`.
3. El archivo **`CNAME`** ya contiene `porradelmundial.com`; mantén tu dominio
   apuntando a GitHub Pages (registros A/CNAME en tu proveedor de dominio).
4. Espera 1–2 min y abre https://porradelmundial.com.

## 4. Antes del primer partido (11 jun 2026) — checklist

- [ ] Ejecutados los 3 SQL (§1), `pg_cron` activado y `baseline_launch` creado.
- [ ] Clave de API-Football pegada en Ajustes (§2) y la pestaña "En vivo" carga.
- [ ] **Cierre de predicciones**: comprueba que se bloquean a la hora prevista
      (15:00 ET / 21:00 España del 11 jun). Puedes forzarlo en
      **Ajustes → Cierre de predicciones** y verificar que `porra-predict.html`
      ya no deja guardar.
- [ ] Sube los resultados del primer día desde **Partidos y Puntos**; si olvidas
      alguno, usa **Partidos anteriores → "Solo sin resultado"**.
- [ ] Toma un snapshot manual justo antes del arranque:
      `select backups.create_snapshot('arranque_mundial','manual','antes del 1er partido');`

## 5. Comprobaciones rápidas tras desplegar

- Portada: el logo lleva a iniciar sesión.
- Clasificación: al pulsar el total de puntos de un jugador se abre el desglose.
- Admin → Comunicación: los contadores de destinatarios cuadran y "Copiar
  correos" funciona.
- Admin → Ajustes → Aviso: cambia el selector a "Costa Oeste (PST)", escribe una
  hora y comprueba que la vista previa muestra la hora del Este y de España
  correctas.
