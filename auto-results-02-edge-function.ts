// ════════════════════════════════════════════════════════════════
// AUTO-RESULTADOS · Paso 2: Edge Function "auto-resultados"
// ----------------------------------------------------------------
// Importa automáticamente los resultados FINALES (grupos y eliminatorias)
// desde API-Football y recalcula las puntuaciones.
//
// GARANTÍAS DE SEGURIDAD:
//   • Asocia cada fixture a su fase por la RONDA de la API (no confunde un
//     cruce de eliminatorias con el partido de grupos entre esas selecciones).
//   • Solo partidos TERMINADOS según la API (FT/AET/PEN).
//   • En eliminatorias guarda el resultado FINAL (con prórroga) y quién pasa
//     (ko_winner) según la API. El bracket avanza solo.
//   • Solo filas SIN resultado (real_home IS NULL) y NO bloqueadas
//     (result_locked = false). Un resultado manual nunca se pisa.
//   • DRY_RUN=true por defecto: informa de lo que HARÍA sin escribir.
//
// CÓMO DESPLEGAR (panel de Supabase, sin instalar nada):
//   1. Supabase → Edge Functions → "Deploy a new function"
//      → nombre: auto-resultados → pega este código → Deploy.
//   2. Pruébalo: botón "Test" (o la URL de la función) → revisa el
//      JSON que devuelve (con DRY_RUN=true no escribe nada).
//   3. Si el informe es correcto: cambia DRY_RUN a false y re-Deploy.
//   4. Programa la ejecución con auto-results-03-schedule.sql.
// ════════════════════════════════════════════════════════════════

import { createClient } from "npm:@supabase/supabase-js@2";

const DRY_RUN = false; // activo: sincroniza horarios y resultados reales desde la API
const SYNC_KICKOFFS = true; // ON: las horas se sincronizan con la fuente oficial (API-Football) y se autocorrigen. Más fiable que fijarlas a mano.

const LEAGUE = 1, SEASON = 2026;
const FINISHED = new Set(["FT", "AET", "PEN"]);

// Inglés (API) → Español (tu base de datos). Igual que TEAM_ES de la web.
const TEAM_ES: Record<string, string> = {
  "United States":"Estados Unidos","USA":"Estados Unidos","US":"Estados Unidos","United States of America":"Estados Unidos",
  "Mexico":"México","Canada":"Canadá",
  "Spain":"España","Germany":"Alemania","France":"Francia","England":"Inglaterra","Portugal":"Portugal",
  "Netherlands":"Países Bajos","Holland":"Países Bajos","Belgium":"Bélgica","Croatia":"Croacia","Italy":"Italia",
  "Switzerland":"Suiza","Denmark":"Dinamarca","Poland":"Polonia","Serbia":"Serbia","Austria":"Austria",
  "Ukraine":"Ucrania","Scotland":"Escocia","Wales":"Gales","Norway":"Noruega","Sweden":"Suecia",
  "Czech Republic":"Chequia","Czechia":"Chequia","Turkey":"Turquía","Türkiye":"Turquía","Greece":"Grecia",
  "Hungary":"Hungría","Romania":"Rumanía","Slovenia":"Eslovenia","Slovakia":"Eslovaquia",
  "Republic of Ireland":"Irlanda","Ireland":"Irlanda","Iceland":"Islandia","Finland":"Finlandia",
  "Albania":"Albania","Georgia":"Georgia",
  "Argentina":"Argentina","Brazil":"Brasil","Uruguay":"Uruguay","Colombia":"Colombia","Ecuador":"Ecuador",
  "Peru":"Perú","Chile":"Chile","Paraguay":"Paraguay","Venezuela":"Venezuela","Bolivia":"Bolivia",
  "Costa Rica":"Costa Rica","Panama":"Panamá","Jamaica":"Jamaica","Honduras":"Honduras",
  "El Salvador":"El Salvador","Guatemala":"Guatemala","Haiti":"Haití","Curaçao":"Curazao","Curacao":"Curazao",
  "Morocco":"Marruecos","Senegal":"Senegal","Egypt":"Egipto","Nigeria":"Nigeria","Ghana":"Ghana",
  "Cameroon":"Camerún","Algeria":"Argelia","Tunisia":"Túnez","Ivory Coast":"Costa de Marfil",
  "Côte d'Ivoire":"Costa de Marfil","South Africa":"Sudáfrica","Mali":"Malí",
  "Cape Verde":"Cabo Verde","Cape Verde Islands":"Cabo Verde",
  "Bosnia & Herz.":"Bosnia y Herzegovina","Bosnia and Herzegovina":"Bosnia y Herzegovina","Bosnia & Herzegovina":"Bosnia y Herzegovina",
  "DR Congo":"RD Congo","Congo DR":"RD Congo",
  "Japan":"Japón","South Korea":"Corea del Sur","Korea Republic":"Corea del Sur","Iran":"Irán","IR Iran":"Irán",
  "Saudi Arabia":"Arabia Saudí","Australia":"Australia","Qatar":"Catar","Iraq":"Irak",
  "United Arab Emirates":"Emiratos Árabes Unidos","Uzbekistan":"Uzbekistán","Jordan":"Jordania","New Zealand":"Nueva Zelanda",
};
const es = (n: string) => TEAM_ES[(n ?? "").trim()] ?? (n ?? "").trim();

// Ronda de la API → fase de la BD. Evita confundir un cruce de eliminatorias
// con el partido de grupos entre las mismas dos selecciones (si se repiten).
const roundPhase = (round: string): string => {
  const r = (round ?? "").toLowerCase();
  if (r.includes("3rd") || r.includes("third")) return ""; // 3.er puesto: no existe en la porra
  if (r.includes("group")) return "group";
  if (r.includes("32")) return "r32";
  if (r.includes("16")) return "r16";
  if (r.includes("quarter")) return "qf";
  if (r.includes("semi")) return "sf";
  if (r.includes("final")) return "final";
  return "";
};
// Resultado FINAL incluyendo prórroga (lo que se pronostica). La API da el
// resultado final en "goals" (no cuenta la tanda de penaltis, que va aparte).
const ftScore = (f: any): [number | null, number | null] => {
  if (f.goals?.home != null && f.goals?.away != null) return [f.goals.home, f.goals.away];
  const ft = f.score?.fulltime;
  return [ft?.home ?? null, ft?.away ?? null];
};

Deno.serve(async (_req) => {
  const report: Record<string, unknown> = { dry_run: DRY_RUN, ran_at: new Date().toISOString() };
  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 0) Bandera de "puntuaciones pendientes": si un recálculo anterior falló,
    //    real_home ya está escrito pero los puntos quedaron desactualizados.
    //    Esta bandera obliga a reintentar el recálculo aunque ahora no se escriba nada.
    const { data: dRow } = await sb.from("settings").select("value").eq("key", "scores_dirty").maybeSingle();
    const wasDirty = dRow?.value === "true";
    report.was_dirty = wasDirty;

    // 1) Clave de API-Football (la misma que ya guardas en settings)
    const { data: ks } = await sb.from("settings").select("value").eq("key", "apifootball_key").maybeSingle();
    const apiKey = ks?.value;
    if (!apiKey) throw new Error("No hay apifootball_key en settings");

    // 2) Fixtures del Mundial desde la API
    const r = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${LEAGUE}&season=${SEASON}`,
      { headers: {
          "x-apisports-key": apiKey,
          // Nos identificamos como la web (es nuestro propio dominio autorizado),
          // para pasar el filtro de dominios del panel de API-Football.
          "Origin":  "https://porradelmundial.com",
          "Referer": "https://porradelmundial.com/",
        } },
    );
    const api = await r.json();
    if (api.errors && Object.keys(api.errors).length) throw new Error("API: " + JSON.stringify(api.errors));
    const fixtures: any[] = api.response ?? [];
    report.api_fixtures = fixtures.length;

    // 3) Partidos en la base de datos (grupos + eliminatorias)
    const { data: rows, error: mErr } = await sb
      .from("matches")
      .select("id,phase,home_team,away_team,home_flag,away_flag,kickoff,real_home,real_away,result_locked,api_fixture_id")
      .order("kickoff");
    if (mErr) throw mErr;
    const db = rows ?? [];

    // 4) Asociar fixture ↔ partido (por fecha + equipos en español)
    const linked: string[] = [];
    const byFixture = new Map<number, any>();
    for (const f of fixtures) {
      const fH = es(f.teams?.home?.name), fA = es(f.teams?.away?.name);
      const fPhase = roundPhase(f.league?.round);
      for (const m of db) {
        if (m.api_fixture_id) { if (m.api_fixture_id === f.fixture.id) byFixture.set(f.fixture.id, m); continue; }
        if (fPhase && fPhase !== m.phase) continue; // no cruzar grupos con eliminatorias
        // En la fase de grupos cada pareja de equipos juega exactamente UNA vez,
        // así que el par de equipos identifica el partido sin depender de la hora
        // (las horas de la BD y de la API difieren en algunos partidos).
        const direct  = fH === m.home_team && fA === m.away_team;
        const swapped = fH === m.away_team && fA === m.home_team;
        if (direct || swapped) {
          byFixture.set(f.fixture.id, { ...m, _swapped: swapped });
          if (!DRY_RUN) await sb.from("matches").update({ api_fixture_id: f.fixture.id }).eq("id", m.id);
          linked.push(`${m.id} ↔ fixture ${f.fixture.id} (${fH} vs ${fA}${swapped ? ", invertido" : ""})`);
          break;
        }
      }
    }
    report.newly_linked = linked;

    // 4a-bis) Rellenar EQUIPOS de eliminatorias desde la API.
    // Las filas KO nacen sin equipos (NULL) hasta que se conoce el cuadro
    // (ganadores de grupo, mejores terceros, sorteo). Como en la BD aún son NULL
    // no se pueden emparejar por nombre, así que se emparejan por FASE + hora de
    // inicio y se escriben los nombres (en español) y la bandera (tomada de la
    // fase de grupos). Esto es lo que hace aparecer a los 3.os en el cuadro.
    const flagOf: Record<string, string> = {};
    for (const m of db as any[]) {
      if (m.home_team && m.home_flag) flagOf[m.home_team] = m.home_flag;
      if (m.away_team && m.away_flag) flagOf[m.away_team] = m.away_flag;
    }
    const koTeamsWritten: string[] = [];
    const usedForKO = new Set<number>();
    for (const m of db as any[]) {
      if (m.phase === "group") continue;
      if (m.home_team && m.away_team) continue;   // ya tiene equipos
      if (m.api_fixture_id) continue;              // ya enlazado por id
      if (!m.kickoff) continue;
      const tDb = new Date(m.kickoff).getTime();
      let best: any = null, bd = Infinity;
      for (const f of fixtures) {
        if (usedForKO.has(f.fixture.id)) continue;
        if (roundPhase(f.league?.round) !== m.phase) continue;
        const fH = f.teams?.home?.name, fA = f.teams?.away?.name;
        if (!fH || !fA) continue;                  // la API aún no tiene los equipos de este cruce
        const tApi = f.fixture?.date ? new Date(f.fixture.date).getTime() : 0;
        const d = Math.abs(tApi - tDb);
        if (d < bd) { bd = d; best = f; }
      }
      if (best && bd < 12 * 3600 * 1000) {
        usedForKO.add(best.fixture.id);
        const hT = es(best.teams.home.name), aT = es(best.teams.away.name);
        const upd: Record<string, unknown> = { home_team: hT, away_team: aT, api_fixture_id: best.fixture.id };
        if (flagOf[hT]) upd.home_flag = flagOf[hT];
        if (flagOf[aT]) upd.away_flag = flagOf[aT];
        koTeamsWritten.push(`${m.id} <- ${hT} vs ${aT} (fixture ${best.fixture.id})`);
        if (!DRY_RUN) await sb.from("matches").update(upd).eq("id", m.id);
        // Disponible en esta misma ejecucion para sincronizar hora e importar resultado.
        m.home_team = hT; m.away_team = aT; m.api_fixture_id = best.fixture.id; m._swapped = false;
        byFixture.set(best.fixture.id, { ...m });
      }
    }
    report.ko_teams_written = koTeamsWritten;

    // 4b) Diagnóstico: ¿qué quedó sin asociar y por qué?
    const linkedIds = new Set([...byFixture.values()].map((m: any) => m.id));
    report.unlinked_db_matches = db
      .filter((m) => !m.api_fixture_id && !linkedIds.has(m.id))
      .map((m) => `${m.id}: ${m.home_team} vs ${m.away_team} @ ${m.kickoff}`);
    const linkedFx = new Set([...byFixture.keys()]);
    report.unmatched_api_fixtures = fixtures
      .filter((f) => !linkedFx.has(f.fixture.id) && !db.some((m) => m.api_fixture_id === f.fixture.id))
      .map((f) => `fixture ${f.fixture.id}: ${f.teams?.home?.name} vs ${f.teams?.away?.name} @ ${f.fixture?.date} [${es(f.teams?.home?.name)} vs ${es(f.teams?.away?.name)}]`);

    // 4c) Sincronizar horas de inicio con el calendario oficial.
    // Algunas horas en la BD no coincidían con las oficiales; aquí se corrigen
    // solas. Solo actualiza si difieren más de 1 minuto.
    const kickoffsSynced: string[] = [];
    for (const f of fixtures) {
      const m = byFixture.get(f.fixture.id) ?? db.find((x) => x.api_fixture_id === f.fixture.id);
      if (!m || !f.fixture?.date) continue;
      const apiMs = new Date(f.fixture.date).getTime();
      const dbMs = m.kickoff ? new Date(m.kickoff).getTime() : 0;
      if (Math.abs(apiMs - dbMs) > 60000) {
        kickoffsSynced.push(`${m.id}: ${m.kickoff} → ${f.fixture.date}`);
        if (!DRY_RUN && SYNC_KICKOFFS) await sb.from("matches").update({ kickoff: f.fixture.date }).eq("id", m.id);
      }
    }
    report.kickoffs_synced = kickoffsSynced;

    // 5) Importar SOLO finales, en filas vacías y no bloqueadas
    const written: string[] = [], skipped: string[] = [];
    for (const f of fixtures) {
      if (!FINISHED.has(f.fixture?.status?.short)) continue;
      const m = byFixture.get(f.fixture.id) ?? db.find((x) => x.api_fixture_id === f.fixture.id);
      if (!m) { skipped.push(`fixture ${f.fixture.id}: sin partido asociado`); continue; }
      if (m.result_locked) { skipped.push(`${m.id}: bloqueado (manual)`); continue; }
      if (m.real_home !== null && m.real_home !== undefined) continue; // ya tiene resultado
      let [gh, ga] = ftScore(f);
      if (gh == null || ga == null) { skipped.push(`${m.id}: sin goles en la API`); continue; }
      if (m._swapped) [gh, ga] = [ga, gh];
      // Eliminatorias: además del marcador, quién pasa (prórroga/penaltis) según la API.
      let koWinner: string | null = null;
      if (m.phase !== "group") {
        const homeWins = f.teams?.home?.winner === true, awayWins = f.teams?.away?.winner === true;
        if (homeWins || awayWins) koWinner = (homeWins !== !!m._swapped) ? m.home_team : m.away_team;
      }
      const upd: Record<string, unknown> = { real_home: gh, real_away: ga, auto_imported_at: new Date().toISOString() };
      if (m.phase !== "group") upd.ko_winner = koWinner;
      if (DRY_RUN) {
        written.push(`HARÍA: ${m.id} → ${m.home_team} ${gh}-${ga} ${m.away_team}${koWinner?` · pasa ${koWinner}`:""}`);
      } else {
        const { error } = await sb.from("matches")
          .update(upd)
          .eq("id", m.id).is("real_home", null);
        if (error) skipped.push(`${m.id}: ERROR ${error.message}`);
        else written.push(`${m.id} → ${m.home_team} ${gh}-${ga} ${m.away_team}${koWinner?` · pasa ${koWinner}`:""}`);
      }
    }
    report.written = written;
    report.skipped = skipped;

    // 6) Recalcular puntuaciones.
    //    Se recalcula si (a) se escribió algún resultado nuevo, o
    //    (b) un recálculo anterior quedó pendiente (scores_dirty=true).
    //    Si se escribió algo, marcamos "dirty" ANTES de recalcular: así, si el
    //    recálculo falla o la función se corta, el siguiente ciclo (1 min) lo reintenta.
    const needRecalc = written.length > 0 || wasDirty;
    if (!DRY_RUN && written.length > 0) {
      await sb.from("settings").upsert({ key: "scores_dirty", value: "true" }, { onConflict: "key" });
    }
    if (!DRY_RUN && needRecalc) {
      const { error } = await sb.rpc("recalculate_all_scores");
      if (error) {
        report.recalculated = `ERROR (se reintentará): ${error.message}`;
        await sb.from("settings").upsert({ key: "scores_dirty", value: "true" }, { onConflict: "key" });
      } else {
        report.recalculated = true;
        await sb.from("settings").upsert({ key: "scores_dirty", value: "false" }, { onConflict: "key" });
      }
    } else if (!DRY_RUN) {
      report.recalculated = "sin cambios";
    }

    return new Response(JSON.stringify(report, null, 2), { headers: { "Content-Type": "application/json" } });
  } catch (e) {
    report.error = String(e?.message ?? e);
    return new Response(JSON.stringify(report, null, 2), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
