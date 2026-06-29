// ── Google Analytics (GA4) — porradelmundial.com ─────────────────────────────
// Carga en TODAS las páginas que incluyen este archivo. Cada carga de página
// (sitio multipágina) envía un page_view automáticamente.
(function(){
  try{
    var GA_ID='G-2GD36XKRWV';
    if(window.__gaLoaded) return; window.__gaLoaded=true;
    var s=document.createElement('script'); s.async=true;
    s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID;
    document.head.appendChild(s);
    window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments);};
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }catch(e){}
})();

// ════════════════════════════════════════════════════════════════════════════
// PORRA MUNDIAL 2026 — SHARED CONFIG & HELPERS
// Loaded by every page (AFTER the supabase-js CDN script, BEFORE page scripts).
// This is the SINGLE SOURCE OF TRUTH for: Supabase connection, payment details,
// auth helpers, and the nav bar. Change things here once, every page updates.
// ════════════════════════════════════════════════════════════════════════════

// ── SUPABASE CONNECTION ──────────────────────────────────────────────────────
// The anon key is meant to be public; the database is protected by Row Level
// Security, so this is safe to ship in the browser.
const SUPABASE_URL  = 'https://hpxqhhgpfadnsikqjnst.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhweHFoaGdwZmFkbnNpa3FqbnN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMjA5NTIsImV4cCI6MjA5MTU5Njk1Mn0.7Ptisf8E9QXxoTWrQLSOjXPlzYTTqu2d3uwzjGVeeOI';

// ════════════════════════════════════════════════════════════════════════════
// 💳 PAYMENT DETAILS — EDIT THIS BLOCK ONLY.
// Every page reads from here. To go live with a new method, just fill it in.
// Leave a value as null and that method is automatically hidden (never shows a
// broken link). Venmo & PayPal use clickable links; Zelle & Bizum are shown as
// copy-to-clipboard fields because neither has a shareable payment URL.
// ════════════════════════════════════════════════════════════════════════════
const PAYMENT = {
  amount: '20 €',                                            // entry fee shown everywhere
  methods: {
    venmo: {
      label: 'Venmo',
      handle: '@juanft',
      link: 'https://venmo.com/u/juanft',                   // ✅ set
    },
    paypal: {
      label: 'PayPal',
      handle: 'jftrigueros@gmail.com',                      // ✅ email (shown as copy field)
      link: null,
    },
    zelle: {
      label: 'Zelle',
      handle: 'jftrigueros@gmail.com',                      // ✅ email
      copy: true,
    },
    bizum: {
      label: 'Bizum',
      handle: '636263550',                                  // ✅ teléfono
      copy: true,
    },
  },
  whatsapp: 'https://chat.whatsapp.com/F9ZqykwUzvo46vGfrVtAOn',   // ✅ set
};

// 📧 CONTACT — where contact-form messages go.
//  • ADMIN_EMAIL: always saved to the DB + used for the email fallback.
//  • CONTACT_FORM_ENDPOINT: paste a Formspree endpoint (https://formspree.io/f/XXXX)
//    to have messages emailed automatically & silently. Leave '' to use the
//    fallback that opens the sender's email app pre-addressed to ADMIN_EMAIL.
const ADMIN_EMAIL = 'jftrigueros@gmail.com';
const CONTACT_FORM_ENDPOINT = '';   // ⏳ paste Formspree endpoint here for silent emails

// ── PAYMENT UI: one renderer used by the landing modal AND the register page ──
// Renders only the methods that are filled in. Buttons for link-based methods,
// tap-to-copy rows for Zelle/Bizum. Pass the id of an empty container element.
function _injectPayStyles() {
  if (document.getElementById('pay-styles')) return;
  const s = document.createElement('style');
  s.id = 'pay-styles';
  s.textContent = `
    .pay-btn{display:flex;align-items:center;gap:10px;width:100%;text-align:left;
      background:rgba(255,255,255,0.05);border:1px solid var(--border,rgba(255,255,255,0.08));
      border-radius:10px;padding:13px 16px;margin-bottom:10px;cursor:pointer;
      color:var(--text,#eeeef8);font-family:'DM Sans',sans-serif;font-size:14px;
      text-decoration:none;transition:border-color .15s,background .15s;}
    .pay-btn:hover{border-color:rgba(255,215,0,0.4);background:rgba(255,255,255,0.08);}
    .pay-name{font-weight:700;}
    .pay-handle{color:var(--muted,rgba(238,238,248,0.45));flex:1;}
    .pay-arrow{color:var(--gold,#FFD700);font-weight:600;font-size:13px;white-space:nowrap;}
    .pay-note{font-size:12px;color:var(--muted,rgba(238,238,248,0.45));margin:-2px 0 12px;padding-left:4px;}
    .pay-soon{opacity:0.45;cursor:not-allowed;}
    .pay-soon:hover{border-color:var(--border,rgba(255,255,255,0.08));background:rgba(255,255,255,0.05);}
  `;
  document.head.appendChild(s);
}

// Always renders all four methods in a fixed order (Venmo, Bizum, Zelle,
// PayPal). A method that's fully configured is active (link → clickable,
// handle → tap-to-copy); one that isn't yet shows a disabled "Próximamente"
// placeholder so the layout is final and friends see every option coming.
const PAYMENT_ORDER = ['venmo', 'bizum', 'zelle', 'paypal'];
function renderPaymentMethods(containerId) {
  _injectPayStyles();
  const el = document.getElementById(containerId);
  if (!el) return;
  const m = PAYMENT.methods;
  let html = '';

  for (const key of PAYMENT_ORDER) {
    const x = m[key];
    if (!x) continue;

    if (x.link) {
      // Active link method (e.g. Venmo, PayPal)
      html += `<a href="${x.link}" target="_blank" rel="noopener" class="pay-btn pay-${key}">
        <span class="pay-name">${x.label}</span></a>`;
    } else if (x.handle) {
      // Active copy method (e.g. Zelle, Bizum)
      html += `<button type="button" class="pay-btn pay-${key}" onclick="copyPayment('${x.handle}', this)">
        <span class="pay-name">${x.label}</span>
        <span class="pay-handle">${x.handle}</span>
        <span class="pay-arrow">Copiar</span></button>`;
    } else {
      // Placeholder — method not configured yet
      html += `<button type="button" class="pay-btn pay-${key} pay-soon" disabled>
        <span class="pay-name">${x.label}</span>
        <span class="pay-handle">Próximamente</span></button>`;
    }
    if (x.note) html += `<div class="pay-note">${x.note}</div>`;
  }

  el.innerHTML = html;
}

function copyPayment(text, btn) {
  navigator.clipboard?.writeText(text).then(() => {
    const arrow = btn.querySelector('.pay-arrow');
    if (arrow) { const old = arrow.textContent; arrow.textContent = '¡Copiado! ✓'; setTimeout(() => arrow.textContent = old, 1800); }
  });
}

// Returns the WhatsApp invite link, or null if not set yet.
function whatsappLink() { return PAYMENT.whatsapp; }

// ── SPANISH DISPLAY HELPERS (shared) ─────────────────────────────────────────
// Team names are stored in English in the DB (so results keep matching) but are
// ALWAYS shown in Spanish via teamES(). Used by predict, leaderboard, my-preds,
// results and home. esDate() turns "Jun 11" → "11 jun" for display.
const TEAM_ES = {
  'United States':'Estados Unidos','USA':'Estados Unidos','US':'Estados Unidos','United States of America':'Estados Unidos',
  'Mexico':'México','Canada':'Canadá',
  'Spain':'España','Germany':'Alemania','France':'Francia','England':'Inglaterra','Portugal':'Portugal',
  'Netherlands':'Países Bajos','Holland':'Países Bajos','Belgium':'Bélgica','Croatia':'Croacia','Italy':'Italia',
  'Switzerland':'Suiza','Denmark':'Dinamarca','Poland':'Polonia','Serbia':'Serbia','Austria':'Austria',
  'Ukraine':'Ucrania','Scotland':'Escocia','Wales':'Gales','Norway':'Noruega','Sweden':'Suecia',
  'Czech Republic':'Chequia','Czechia':'Chequia','Turkey':'Turquía','Türkiye':'Turquía','Greece':'Grecia',
  'Hungary':'Hungría','Romania':'Rumanía','Slovenia':'Eslovenia','Slovakia':'Eslovaquia',
  'Republic of Ireland':'Irlanda','Ireland':'Irlanda','Iceland':'Islandia','Finland':'Finlandia',
  'Albania':'Albania','Georgia':'Georgia',
  'Argentina':'Argentina','Brazil':'Brasil','Uruguay':'Uruguay','Colombia':'Colombia','Ecuador':'Ecuador',
  'Peru':'Perú','Chile':'Chile','Paraguay':'Paraguay','Venezuela':'Venezuela','Bolivia':'Bolivia',
  'Costa Rica':'Costa Rica','Panama':'Panamá','Jamaica':'Jamaica','Honduras':'Honduras',
  'El Salvador':'El Salvador','Guatemala':'Guatemala','Haiti':'Haití','Curaçao':'Curazao','Curacao':'Curazao',
  'Morocco':'Marruecos','Senegal':'Senegal','Egypt':'Egipto','Nigeria':'Nigeria','Ghana':'Ghana',
  'Cameroon':'Camerún','Algeria':'Argelia','Tunisia':'Túnez','Ivory Coast':'Costa de Marfil',
  "Côte d'Ivoire":'Costa de Marfil','South Africa':'Sudáfrica','Mali':'Malí','DR Congo':'RD Congo',
  'Cape Verde':'Cabo Verde','Bosnia & Herz.':'Bosnia y Herzegovina','Bosnia and Herzegovina':'Bosnia y Herzegovina',
  'Japan':'Japón','South Korea':'Corea del Sur','Korea Republic':'Corea del Sur','Iran':'Irán','IR Iran':'Irán',
  'Saudi Arabia':'Arabia Saudí','Australia':'Australia','Qatar':'Catar','Iraq':'Irak',
  'United Arab Emirates':'Emiratos Árabes Unidos','Uzbekistan':'Uzbekistán','Jordan':'Jordania','New Zealand':'Nueva Zelanda'
};
function teamES(name){ if(name==null) return name; return TEAM_ES[String(name).trim()] || name; }
function esTeam(name){ return teamES(name); }
if (typeof window !== 'undefined') { window.teamES = teamES; window.esTeam = esTeam; }
const MONTH_ES = { Jan:'ene',Feb:'feb',Mar:'mar',Apr:'abr',May:'may',Jun:'jun',
  Jul:'jul',Aug:'ago',Sep:'sep',Oct:'oct',Nov:'nov',Dec:'dic' };
function esDate(d){
  if(!d) return d;
  const parts = String(d).trim().split(/\s+/);
  if(parts.length===2 && MONTH_ES[parts[0]]) return parts[1]+' '+MONTH_ES[parts[0]];
  return d;
}

// ── SUPABASE CLIENT ──────────────────────────────────────────────────────────
let _sb = null;

function getSB() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Bypass the Web Locks API. Its default implementation can stall for ~30-60s
      // inside mobile in-app browsers (the WhatsApp/Instagram webview especially),
      // which is the cause of logins that hang on phones but are instant on desktop.
      // A pass-through lock keeps token handling working without the wait.
      lock: async function (_name, _acquireTimeout, fn) { return await fn(); }
    }
  });
  return _sb;
}

// Resolves once the Supabase SDK global is available. On a slow mobile
// connection the SDK script may still be downloading when a handler fires;
// awaiting this prevents "supabase is not defined" failures and dead taps.
window.sbReady = function (timeoutMs) {
  timeoutMs = timeoutMs || 15000;
  return new Promise(function (resolve, reject) {
    if (typeof supabase !== 'undefined' && supabase && supabase.createClient) return resolve();
    var t0 = Date.now();
    var iv = setInterval(function () {
      if (typeof supabase !== 'undefined' && supabase && supabase.createClient) { clearInterval(iv); resolve(); }
      else if (Date.now() - t0 > timeoutMs) { clearInterval(iv); reject(new Error('No se pudo cargar el sistema. Revisa tu conexión e inténtalo de nuevo.')); }
    }, 50);
  });
};

// ── AUTH HELPERS ─────────────────────────────────────────────────────────────
async function getCurrentUser() {
  // Use the locally-stored session (instant) instead of auth.getUser() which makes
  // a network round-trip on every page load — the main cause of slow first loads.
  const { data: { session } } = await getSB().auth.getSession();
  return session?.user ?? null;
}

async function getUserProfile(userId) {
  const { data } = await getSB().from('users').select('*').eq('id', userId).single();
  return data;
}

async function requireAuth(redirectTo = 'porra-login.html') {
  const user = await getCurrentUser();
  if (!user) { window.location.href = redirectTo; return null; }
  return user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  const profile = await getUserProfile(user.id);
  if (!profile?.is_admin) { window.location.href = 'porra-mundial-2026.html'; return null; }
  return { user, profile };
}

async function signOut() {
  await getSB().auth.signOut();
  window.location.href = 'porra-mundial-2026.html';
}

// ── SETTINGS HELPER ──────────────────────────────────────────────────────────
async function getSetting(key) {
  const { data } = await getSB().from('settings').select('value').eq('key', key).single();
  return data?.value ?? null;
}

// Trae TODAS las filas de una tabla en páginas de 1000 (Supabase devuelve como
// máximo 1000 por petición; sin esto, tablas grandes como "predictions" se cortan).
async function fetchAll(table, columns, pageSize, orderBy) {
  pageSize = pageSize || 1000;
  const sb = getSB();
  // Orden ESTABLE obligatorio: sin .order(), la paginación por .range() puede
  // saltarse o duplicar filas entre páginas (PostgREST no garantiza el orden),
  // y entonces a algunos jugadores les faltarían predicciones (puntos que no se
  // muestran aunque el total sí esté bien). Ordenamos por la clave primaria.
  if (!orderBy) {
    if (table === 'predictions') orderBy = ['user_id','match_id'];
    else if (table === 'ko_predictions') orderBy = ['user_id','slot_id'];
    else orderBy = ['id'];
  } else if (typeof orderBy === 'string') {
    orderBy = orderBy.split(',').map(s => s.trim()).filter(Boolean);
  }
  let all = [], from = 0;
  for (;;) {
    const run = async (withOrder) => {
      let q = sb.from(table).select(columns);
      if (withOrder) orderBy.forEach(col => { q = q.order(col, { ascending: true }); });
      return await q.range(from, from + pageSize - 1);
    };
    let { data, error } = await run(true);
    if (error) { ({ data, error } = await run(false)); } // fallback si la columna de orden no existe
    if (error || !data || !data.length) break;
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 200000) break; // tope de seguridad
  }
  return all;
}
if (typeof window !== 'undefined') window.fetchAll = fetchAll;

// ── NAV: inject login/logout state (Spanish) ─────────────────────────────────
async function initNav() {
  if (typeof _helpStyles === 'function') _helpStyles();
  const user = await getCurrentUser();
  const navRight = document.getElementById('nav-auth');
  if (!navRight) return;
  navRight.style.display = 'flex';
  navRight.style.alignItems = 'center';
  navRight.style.gap = '10px';
  const help = `<button class="theme-toggle" onclick="toggleTheme()" title="Cambiar tema (claro/oscuro)" aria-label="Cambiar tema">☀️</button><button class="navhelp-btn" onclick="openFaqModal()">FAQ</button><button class="navhelp-btn" onclick="openContactModal()">Contacto</button>`;
  if (user) {
    const profile = await getUserProfile(user.id);
    const name = profile?.alias || profile?.first_name || 'Cuenta';
    const avatar = profile?.avatar_url
      ? `<img src="${profile.avatar_url}" alt="" style="width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.2);vertical-align:middle;flex-shrink:0">`
      : '';
    navRight.innerHTML = help + `
      <button onclick="openSettingsModal()" title="Ajustes" style="display:flex;align-items:center;gap:7px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:20px;padding:3px 12px 3px ${avatar?'4px':'12px'};cursor:pointer;font-family:'DM Sans',sans-serif">
        ${avatar}<span style="font-size:13px;color:var(--text)">${name}</span></button>
      ${profile?.is_admin ? `<a href="porra-admin.html" style="font-size:12px;background:rgba(200,16,46,0.15);border:1px solid rgba(200,16,46,0.3);color:#f87171;border-radius:6px;padding:5px 10px;text-decoration:none">Acceder como admin</a>` : ''}
      <button onclick="signOut()" style="font-size:12px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:6px;padding:5px 12px;cursor:pointer;font-family:'DM Sans',sans-serif">Cerrar sesión</button>`;
  } else {
    navRight.innerHTML = help + `<a href="porra-login.html" style="font-size:13px;font-weight:600;color:var(--text);text-decoration:none;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:6px;padding:8px 16px">Login</a>`;
  }
  _updateThemeIcon();
}

// ── TEMA · Auto / Claro / Oscuro ─────────────────────────────────────────────
// El tema se fija antes del primer pintado mediante un script en el <head> de
// cada página (misma lógica que aquí). 'auto' sigue al sistema operativo y se
// actualiza en vivo si el dispositivo cambia. Preferencia en localStorage
// 'pm-theme' = 'auto' | 'light' | 'dark'. Predeterminado: 'auto'.
const _THEME_ORDER = ['auto', 'light', 'dark'];
const _THEME_ICON  = { auto: '🌗', light: '☀️', dark: '🌙' };
const _THEME_LABEL = { auto: 'Auto', light: 'Claro', dark: 'Oscuro' };

function _getThemePref() {
  try { return localStorage.getItem('pm-theme') || 'auto'; } catch (e) { return 'auto'; }
}
function _systemPrefersLight() {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
}
function _applyTheme(pref) {
  const light = pref === 'light' || (pref === 'auto' && _systemPrefersLight());
  if (light) document.documentElement.setAttribute('data-theme', 'light');
  else       document.documentElement.removeAttribute('data-theme');
}
function _updateThemeIcon() {
  const pref = _getThemePref();
  document.querySelectorAll('.theme-toggle').forEach(b => {
    b.textContent = _THEME_ICON[pref];
    b.title = 'Tema: ' + _THEME_LABEL[pref] + ' · toca para cambiar';
    b.setAttribute('aria-label', 'Tema: ' + _THEME_LABEL[pref]);
  });
}
function toggleTheme() {
  const next = _THEME_ORDER[(_THEME_ORDER.indexOf(_getThemePref()) + 1) % _THEME_ORDER.length];
  try { localStorage.setItem('pm-theme', next); } catch (e) {}
  _applyTheme(next);
  _updateThemeIcon();
  if (typeof porraToast === 'function') porraToast('Tema: ' + _THEME_LABEL[next]);
}
// En modo Auto, reaccionar a los cambios del sistema en tiempo real.
if (typeof window !== 'undefined' && window.matchMedia) {
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
      if (_getThemePref() === 'auto') { _applyTheme('auto'); _updateThemeIcon(); }
    });
  } catch (e) {}
}
if (typeof window !== 'undefined') {
  window.toggleTheme = toggleTheme;
  window._updateThemeIcon = _updateThemeIcon;
}

// ── LANGUAGE ─────────────────────────────────────────────────────────────────
// The site is now Spanish by default in the markup itself. These stubs remain
// so any older page still calling them won't error. (No EN/ES toggle anymore.)
function t(key) { return key; }
function applyLang() {}
function toggleLang() {}
function addLangToggle() {}

// ── HELP WIDGETS: Contacto + FAQ (inyectados en todas las páginas) ───────────
// El formulario de contacto guarda la consulta en la tabla `contact_messages`
// (visible en el panel de admin). La NOTIFICACIÓN por email queda pendiente de
// backend; el mensaje se registra igualmente para que los admins lo vean.
const SCORING_BOXES_HTML = `
  <div class="sb-grid">
    <div class="sb-box">
      <h4>Fase de grupos</h4>
      <div class="sb-row"><span>Ganador o empate</span><b>+1</b></div>
      <div class="sb-row"><span>Diferencia de goles</span><b>+2</b></div>
      <div class="sb-row"><span>Resultado exacto</span><b>+3</b></div>
      <div class="sb-row"><span>Posición final del grupo</span><b>+5</b></div>
      <div class="sb-sub">Hasta 6 pts por partido · 5 pts por cada posición correcta</div>
    </div>
    <div class="sb-box">
      <h4>Dieciseisavos</h4>
      <div class="sb-row"><span>Equipo clasificado</span><b>+4</b></div>
      <div class="sb-row"><span>Ganador o empate</span><b>+2</b></div>
      <div class="sb-row"><span>Diferencia de goles</span><b>+3</b></div>
      <div class="sb-row"><span>Resultado exacto</span><b>+4</b></div>
    </div>
    <div class="sb-box">
      <h4>Octavos</h4>
      <div class="sb-row"><span>Equipo clasificado</span><b>+6</b></div>
      <div class="sb-row"><span>Ganador o empate</span><b>+3</b></div>
      <div class="sb-row"><span>Diferencia de goles</span><b>+4</b></div>
      <div class="sb-row"><span>Resultado exacto</span><b>+5</b></div>
    </div>
    <div class="sb-box">
      <h4>Cuartos</h4>
      <div class="sb-row"><span>Equipo clasificado</span><b>+8</b></div>
      <div class="sb-row"><span>Ganador o empate</span><b>+4</b></div>
      <div class="sb-row"><span>Diferencia de goles</span><b>+5</b></div>
      <div class="sb-row"><span>Resultado exacto</span><b>+6</b></div>
    </div>
    <div class="sb-box">
      <h4>Semifinales</h4>
      <div class="sb-row"><span>Equipo clasificado</span><b>+10</b></div>
      <div class="sb-row"><span>Ganador o empate</span><b>+5</b></div>
      <div class="sb-row"><span>Diferencia de goles</span><b>+6</b></div>
      <div class="sb-row"><span>Resultado exacto</span><b>+7</b></div>
    </div>
    <div class="sb-box sb-final">
      <h4>Final &amp; título</h4>
      <div class="sb-row"><span>Equipo clasificado</span><b>+12</b></div>
      <div class="sb-row"><span>Ganador o empate</span><b>+10</b></div>
      <div class="sb-row"><span>Diferencia de goles</span><b>+15</b></div>
      <div class="sb-row"><span>Resultado exacto</span><b>+20</b></div>
      <div class="sb-row"><span>Acertar campeón</span><b>+35</b></div>
      <div class="sb-row"><span>Acertar subcampeón</span><b>+20</b></div>
    </div>
    <div class="sb-box">
      <h4>Premios individuales</h4>
      <div class="sb-row"><span>Balón de Oro (mejor jugador)</span><b>+10</b></div>
      <div class="sb-row"><span>Bota de Oro (máximo goleador)</span><b>+10</b></div>
    </div>
  </div>
  <div class="sb-note">En eliminatorias, los puntos de <b>marcador</b> (ganador, diferencia y exacto) solo cuentan si aciertas que <b>ambos equipos</b> se enfrentan en ese cruce. Los puntos de <b>equipo clasificado</b> se otorgan por cada equipo que coloques correctamente en esa ronda. Sistema acumulativo · <b>Total posible: 1.480 puntos</b>.</div>`;

const SCORING_HTML = SCORING_BOXES_HTML;

const FAQ_ITEMS = [
  { q: '¿Cómo me registro?',
    a: 'Puedes registrarte fácilmente pulsando <a href="porra-register.html" style="color:var(--gold,#e8b84b)">aquí</a>.' },
  { q: '¿Cómo modifico mis datos una vez creada la cuenta?',
    a: 'Envíanos una solicitud pulsando <a href="#" onclick="closeFaqModal();openContactModal();return false" style="color:var(--gold,#e8b84b)">aquí</a> y nos pondremos en contacto contigo lo antes posible.' },
  { q: '¿Cómo realizo el pago?',
    a: 'Puedes pagar la cuota de entrada por Venmo, Bizum, Zelle o PayPal. Verás los métodos disponibles al registrarte. Si ya te has registrado, ponte en contacto con nosotros si aún necesitas ayuda.' },
  { q: '¿Cómo funciona el sistema de puntos?',
    a: 'El sistema es acumulativo: cuanto más aciertas, más sumas.' + SCORING_HTML },
  { q: '¿Puedo crear más de una porra?',
    a: 'Sí, pero necesitarás crear una nueva cuenta con un correo diferente, ya que solo se permite una porra por cuenta.' },
  { q: '¿Y si no tengo tiempo para rellenar las predicciones a mano?',
    a: 'Usa nuestro Oráculo: responde unas preguntas sencillas y generará tus predicciones automáticamente. Siempre puedes editarlas a mano antes del cierre.' },
  { q: '¿Cómo puedo contactar si tengo un problema o una consulta?',
    a: 'Usa nuestro formulario pulsando <a href="#" onclick="closeFaqModal();openContactModal();return false" style="color:var(--gold,#e8b84b)">aquí</a>. También puedes usar nuestro canal de WhatsApp.' },
]

function _helpStyles() {
  if (document.getElementById('help-widget-styles')) return;
  const st = document.createElement('style'); st.id = 'help-widget-styles';
  st.textContent = `
    /* ── GLOBAL MOBILE RESPONSIVENESS (applies on every page) ── */
    html, body { overflow-x: hidden; max-width: 100%; }
    img, table, pre, .bracket, .scoring-grid { max-width: 100%; }
    @media (max-width: 640px) {
      nav { flex-wrap: wrap !important; height: auto !important; min-height: 56px; row-gap: 6px; padding-top: 6px !important; padding-bottom: 6px !important; padding-left: 12px !important; padding-right: 12px !important; }
      .nav-logo { flex: 0 0 auto !important; font-size: 16px !important; }
      .nav-links, .nav-tabs { font-size: 12px !important; gap: 8px !important; flex-wrap: wrap; }
      #nav-auth { flex: 1 1 100% !important; justify-content: flex-end !important; flex-wrap: wrap; gap: 6px !important; }
      #nav-auth > * { font-size: 12px !important; }
      .navhelp-btn { padding: 5px 9px !important; font-size: 11px !important; }
      .deadline-pill, .nav-right .deadline-pill { font-size: 10px !important; }
      .stats-row, .summary-grid, .hero-banner { flex-wrap: wrap; }
      .bracket { overflow-x: auto; -webkit-overflow-scrolling: touch; }

      /* page padding + big headings scale down */
      .page, .wrap, .content, .container { padding-left: 14px !important; padding-right: 14px !important; }
      .page-title { font-size: 28px !important; }
      .wizard-title { font-size: 20px !important; }

      /* PICKS — score-entry row fits the phone (date | team | score | : | score | team) */
      .match-input-row { grid-template-columns: 42px 1fr 32px 10px 32px 1fr !important; gap: 5px !important; padding: 9px 8px !important; }
      .match-input-row > :nth-child(7) { display: none !important; }
      .mi-date { font-size: 9px !important; line-height: 1.2; }
      .group-layout { grid-template-columns: 1fr !important; }
      .ko-matches-grid { grid-template-columns: 1fr !important; }
      .group-nav { gap: 5px !important; }

      /* MIS PREDICCIONES — read-only prediction row compacted */
      .match-row { grid-template-columns: 46px 1fr 30px 12px 30px 1fr 34px !important; gap: 4px !important; font-size: 11px !important; padding: 8px !important; }
      .match-row > :nth-child(8) { display: none !important; }
      .hero-stats { flex-wrap: wrap; gap: 10px !important; }

      /* LEADERBOARD — expand detail + podium reflow */
      .detail-inner { grid-template-columns: repeat(4, 1fr) !important; }
      .ts-card .ts-n { font-size: 22px !important; }

      /* HOME — hero/action cards already auto-fit; tighten gaps */
      .hero, .actions { gap: 10px !important; }

      /* RESULTADOS — group table cells smaller */
      .group-row { grid-template-columns: 1fr !important; }
      .partidos-table td, .partidos-table th { padding: 6px 5px !important; font-size: 11px !important; }
    }
    @media (max-width: 420px) {
      .nav-logo { font-size: 15px !important; }
      .navhelp-btn { padding: 4px 7px !important; }
      .match-input-row { grid-template-columns: 38px 1fr 28px 8px 28px 1fr !important; gap: 4px !important; }
      .score-inp { width: 28px !important; height: 30px !important; }
      .page-title { font-size: 24px !important; }
    }
    .help-fab{position:fixed;left:16px;bottom:16px;z-index:250;display:flex;gap:8px}
    .navhelp-btn{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:var(--text,#eee);border-radius:6px;padding:6px 11px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer}
    .navhelp-btn:hover{background:rgba(255,255,255,.12)}
    .nav-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.2);vertical-align:middle;flex-shrink:0}
    .faq-acc{border-bottom:1px solid rgba(255,255,255,.07)}
    .faq-qbtn{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;background:none;border:none;color:#eee;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;text-align:left;padding:14px 2px;cursor:pointer}
    .faq-chev{color:#e8b84b;font-size:18px;flex-shrink:0}
    .faq-a{font-size:13px;color:#b8b8c4;line-height:1.6;padding:0 2px 14px}
    .sb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-top:8px}
    .sb-box{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:14px}
    .sb-box.sb-final{border-color:rgba(232,184,75,.4)}
    .sb-box h4{margin:0 0 10px;font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:.5px;color:#fff}
    .sb-row{display:flex;justify-content:space-between;align-items:center;gap:10px;font-size:12.5px;color:#c8c8d4;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)}
    .sb-row:last-child{border-bottom:none}
    .sb-row b{color:#e8b84b;font-size:13px;flex-shrink:0}
    .sb-sub{margin-top:8px;font-size:11px;color:#8a8a98;line-height:1.4}
    .sb-note{margin-top:14px;font-size:12px;color:#9a9aa8;line-height:1.55}
    .help-fab button{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#eee;border-radius:8px;padding:7px 12px;font-family:'DM Sans',sans-serif;font-size:12px;font-weight:600;cursor:pointer}
    .help-fab button:hover{background:rgba(255,255,255,.15)}
    .help-overlay{position:fixed;inset:0;z-index:600;background:rgba(7,7,15,.9);backdrop-filter:blur(8px);display:none;align-items:flex-start;justify-content:center;overflow-y:auto;padding:40px 16px}
    .help-overlay.open{display:flex}
    .help-box{background:#13131f;border:1px solid rgba(255,255,255,.1);border-radius:16px;max-width:560px;width:100%;padding:26px;color:#eee;font-family:'DM Sans',sans-serif}
    .help-box h2{font-family:'Bebas Neue',sans-serif;font-size:28px;margin:0 0 16px}
    .faq-q{font-weight:700;font-size:14px;margin-top:16px}
    .faq-a{font-size:13px;color:#b8b8c4;line-height:1.55;margin-top:4px}
    .help-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}
    .help-field label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9a9aa8}
    .help-field input,.help-field textarea{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 13px;color:#eee;font-family:'DM Sans',sans-serif;font-size:14px}
    .help-actions{display:flex;gap:10px;margin-top:8px}
    .help-actions button{flex:1;border-radius:8px;padding:12px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px}
    .help-cancel{background:transparent;border:1px solid rgba(255,255,255,.1);color:#9a9aa8}
    .help-send{background:var(--gold,#e8b84b);border:none;color:#07070f}
    .site-foot{margin-top:60px;padding:28px 16px;border-top:1px solid rgba(255,255,255,.07);text-align:center;color:#9a9aa8;font-family:'DM Sans',sans-serif;font-size:13px}
    .site-foot a{color:#cfcfe0;text-decoration:none;margin:0 10px;cursor:pointer}
  `;
  document.head.appendChild(st);
}

async function openContactModal(){
  const m=document.getElementById('contact-modal'); if(!m) return; m.classList.add('open');
  try { const wa = await getSetting('whatsapp_link'); const a=document.getElementById('contact-wa');
    if(a && wa) a.href = wa; } catch(e){}
}
function closeContactModal(){ const m=document.getElementById('contact-modal'); if(m) m.classList.remove('open'); }
function openFaqModal(){ const m=document.getElementById('faq-modal'); if(m) m.classList.add('open'); }
function toggleFaq(i){ const a=document.getElementById('faq-a-'+i), c=document.getElementById('faq-chev-'+i);
  if(!a) return; const open=a.style.display!=='none'; a.style.display=open?'none':'block'; if(c) c.textContent=open?'+':'\u2212'; }
function closeFaqModal(){ const m=document.getElementById('faq-modal'); if(m) m.classList.remove('open'); }

async function sendContact(){
  const name = (document.getElementById('contact-name').value||'').trim();
  const email = (document.getElementById('contact-email').value||'').trim();
  const message = (document.getElementById('contact-msg').value||'').trim();
  const status = document.getElementById('contact-status');
  if(!message){ status.textContent='Escribe tu consulta.'; status.style.color='#f87171'; return; }
  const btn = document.getElementById('contact-send'); btn.textContent='Enviando…'; btn.disabled=true;
  // 1) Always save to the DB (backup; visible to admins in Supabase)
  try { await getSB().from('contact_messages').insert({ name, email, message }); } catch(e){}
  // 2) Deliver by email
  let delivered = false;
  if (CONTACT_FORM_ENDPOINT) {
    // Silent email via Formspree
    try {
      const r = await fetch(CONTACT_FORM_ENDPOINT, {
        method: 'POST', headers: { 'Accept':'application/json', 'Content-Type':'application/json' },
        body: JSON.stringify({ name, email, message, _subject: 'Porra Mundial — nueva consulta de ' + (name||'un usuario') }),
      });
      delivered = r.ok;
    } catch(e){ delivered = false; }
  }
  if (delivered) {
    status.style.color='var(--success,#34d399)';
    status.textContent='¡Recibido! Te responderemos lo antes posible.';
    document.getElementById('contact-name').value=''; document.getElementById('contact-email').value=''; document.getElementById('contact-msg').value='';
    setTimeout(closeContactModal, 1600);
  } else {
    // Fallback: open the sender's email app pre-addressed to the admin
    const subject = encodeURIComponent('Porra Mundial — consulta de ' + (name||'un usuario'));
    const body = encodeURIComponent('Nombre: '+(name||'')+'\nCorreo: '+(email||'')+'\n\n'+message);
    window.location.href = 'mailto:' + ADMIN_EMAIL + '?subject=' + subject + '&body=' + body;
    status.style.color='var(--success,#34d399)';
    status.textContent='Abriendo tu correo para enviar la consulta…';
    setTimeout(closeContactModal, 2200);
  }
  btn.textContent='Enviar'; btn.disabled=false;
}

function injectScoringBoxes(){
  const el = document.getElementById('scoring-boxes');
  if (el && typeof SCORING_BOXES_HTML === 'string') el.innerHTML = SCORING_BOXES_HTML;
}
function injectHelpWidgets(){
  injectScoringBoxes();
  if (document.getElementById('help-modals-ready')) return;
  _helpStyles();
  const marker = document.createElement('div'); marker.id='help-modals-ready'; marker.style.display='none';
  document.body.appendChild(marker);

  // On pages WITHOUT a top nav (login/register) show a small top-right launcher;
  // on the main pages the FAQ/Contacto buttons live inside the nav (see initNav).
  // The admin panel has its own sidebar/footer, so skip both fab and footer there.
  const _hwPath = (location.pathname.split('/').pop() || '').toLowerCase();
  const _onAdmin = _hwPath === 'porra-admin.html';
  if (!document.getElementById('nav-auth') && !_onAdmin) {
    const fab = document.createElement('div');
    fab.id = 'help-fab'; fab.className = 'help-fab';
    fab.innerHTML = `<button onclick="openFaqModal()">FAQ</button><button onclick="openContactModal()">Contacto</button>`;
    document.body.appendChild(fab);
  }

  // Mobile "Volver" button on inner pages (those with a top nav, not admin).
  if (document.getElementById('nav-auth') && !_onAdmin) {
    if (!document.getElementById('back-fab-style')) {
      const bs = document.createElement('style'); bs.id = 'back-fab-style';
      bs.textContent = ".back-fab{display:none}@media(max-width:560px){.back-fab{display:flex;position:fixed;right:14px;bottom:14px;z-index:250;align-items:center;background:rgba(20,20,32,.92);border:1px solid rgba(255,255,255,.15);color:#eee;border-radius:22px;padding:9px 15px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.4)}}";
      document.head.appendChild(bs);
    }
    if (!document.getElementById('back-fab')) {
      const bb = document.createElement('button'); bb.className = 'back-fab'; bb.id = 'back-fab';
      bb.textContent = '‹ Volver';
      bb.onclick = function(){ if (history.length > 1) history.back(); else location.href = 'porra-home.html'; };
      document.body.appendChild(bb);
    }
  }

  const faqHtml = FAQ_ITEMS.map((f,i) => `<div class="faq-acc"><button class="faq-qbtn" onclick="toggleFaq(${i})"><span>${f.q}</span><span class="faq-chev" id="faq-chev-${i}">+</span></button><div class="faq-a" id="faq-a-${i}" style="display:none">${f.a}</div></div>`).join('');
  const faq = document.createElement('div');
  faq.className = 'help-overlay'; faq.id = 'faq-modal';
  faq.onclick = (e)=>{ if(e.target===faq) closeFaqModal(); };
  faq.innerHTML = `<div class="help-box"><h2>Preguntas frecuentes</h2>${faqHtml}
    <div class="help-actions" style="margin-top:20px"><button class="help-cancel" onclick="closeFaqModal()">Cerrar</button></div></div>`;
  document.body.appendChild(faq);

  const contact = document.createElement('div');
  contact.className = 'help-overlay'; contact.id = 'contact-modal';
  contact.onclick = (e)=>{ if(e.target===contact) closeContactModal(); };
  contact.innerHTML = `<div class="help-box"><h2>Contacto</h2>
    <p style="font-size:13px;color:#b8b8c4;margin:0 0 16px">¿Una duda o un problema? Escríbenos y te responderemos lo antes posible.</p>
    <div class="help-field"><label>Nombre</label><input id="contact-name" type="text" placeholder="Tu nombre"></div>
    <div class="help-field"><label>Correo electrónico</label><input id="contact-email" type="email" placeholder="tu@correo.com"></div>
    <div class="help-field"><label>Consulta</label><textarea id="contact-msg" rows="4" placeholder="Cuéntanos…"></textarea></div>
    <div id="contact-status" style="font-size:12px;min-height:16px"></div>
    <div class="help-actions"><button class="help-cancel" onclick="closeContactModal()">Cancelar</button><button class="help-send" id="contact-send" onclick="sendContact()">Enviar</button></div>
    <div style="margin-top:14px;font-size:12px;color:#9a9aa8;line-height:1.5;text-align:center">También puedes enviarnos tu consulta por nuestro <a id="contact-wa" href="#" target="_blank" rel="noopener" style="color:var(--gold,#e8b84b)">canal de WhatsApp del grupo</a>.</div></div>`;
  document.body.appendChild(contact);

  if (!document.querySelector('.site-foot') && !_onAdmin) {
    const foot = document.createElement('div');
    foot.className = 'site-foot';
    foot.innerHTML = `Porra Mundial 2026 · <a onclick="openFaqModal()">FAQ</a> · <a onclick="openContactModal()">Contacto</a>`;
    document.body.appendChild(foot);
  }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectHelpWidgets);
else injectHelpWidgets();

// ── USER SETTINGS (avatar, email, alias/mote, phone) ────────────────────────
function _settingsStyles(){
  if (document.getElementById('settings-styles')) return;
  const st=document.createElement('style'); st.id='settings-styles';
  st.textContent=`
    #settings-modal .help-field input:disabled{opacity:.5;cursor:not-allowed}
    .set-avatar{width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06)}
    .nav-avatar{width:26px;height:26px;border-radius:50%;object-fit:cover;border:1px solid rgba(255,255,255,.2);vertical-align:middle}`;
  document.head.appendChild(st);
}
let _avCrop=null;
function _avApply(){
  const c=_avCrop; if(!c) return;
  const img=document.getElementById('av-img'); if(!img) return;
  const w=c.natW*c.baseScale*c.scale, h=c.natH*c.baseScale*c.scale;
  c.tx=Math.min(0,Math.max(c.CROP-w, c.tx));
  c.ty=Math.min(0,Math.max(c.CROP-h, c.ty));
  img.style.width=w+'px'; img.style.height=h+'px';
  img.style.left=c.tx+'px'; img.style.top=c.ty+'px';
}
function initAvatarCropper(file){
  const img=document.getElementById('av-img'); const initials=document.getElementById('av-initials');
  const url=URL.createObjectURL(file);
  img.onload=()=>{
    const CROP=120;
    if(initials) initials.style.display='none';
    img.style.objectFit='none';
    const baseScale=Math.max(CROP/img.naturalWidth, CROP/img.naturalHeight);
    const w=img.naturalWidth*baseScale, h=img.naturalHeight*baseScale;
    _avCrop={ natW:img.naturalWidth, natH:img.naturalHeight, baseScale, scale:1, tx:(CROP-w)/2, ty:(CROP-h)/2, CROP, fromFile:true };
    _avApply();
    const ctrls=document.getElementById('av-controls'); if(ctrls) ctrls.style.display='block';
    const z=document.getElementById('av-zoom'); if(z){ z.value=1; z.oninput=()=>{ const c=_avCrop; if(!c)return;
      const cx=c.CROP/2, cy=c.CROP/2; const oldS=c.scale; c.scale=parseFloat(z.value);
      // zoom toward center
      const k=c.scale/oldS; c.tx=cx-(cx-c.tx)*k; c.ty=cy-(cy-c.ty)*k; _avApply(); }; }
  };
  img.style.display='block'; img.src=url;
}
function wireAvatarDrag(){
  const box=document.getElementById('av-crop'); if(!box||box._wired) return; box._wired=true;
  let drag=false, sx=0, sy=0, ox=0, oy=0;
  const down=(e)=>{ if(!_avCrop) return; drag=true; box.style.cursor='grabbing';
    const pt=e.touches?e.touches[0]:e; sx=pt.clientX; sy=pt.clientY; ox=_avCrop.tx; oy=_avCrop.ty; e.preventDefault(); };
  const move=(e)=>{ if(!drag||!_avCrop) return; if(e.cancelable) e.preventDefault(); const pt=e.touches?e.touches[0]:e;
    _avCrop.tx=ox+(pt.clientX-sx); _avCrop.ty=oy+(pt.clientY-sy); _avApply(); };
  const up=()=>{ drag=false; box.style.cursor='grab'; };
  box.addEventListener('mousedown',down); window.addEventListener('mousemove',move); window.addEventListener('mouseup',up);
  box.addEventListener('touchstart',down,{passive:false}); window.addEventListener('touchmove',move,{passive:false}); window.addEventListener('touchend',up);
}
async function exportAvatarBlob(){
  const c=_avCrop; const img=document.getElementById('av-img'); if(!c||!img) return null;
  const OUT=256, ratio=OUT/c.CROP;
  const canvas=document.createElement('canvas'); canvas.width=OUT; canvas.height=OUT;
  const ctx=canvas.getContext('2d'); ctx.fillStyle='#13131f'; ctx.fillRect(0,0,OUT,OUT);
  const w=c.natW*c.baseScale*c.scale, h=c.natH*c.baseScale*c.scale;
  ctx.drawImage(img, c.tx*ratio, c.ty*ratio, w*ratio, h*ratio);
  return await new Promise(res=>canvas.toBlob(res,'image/png',0.92));
}
async function openSettingsModal(){
  _helpStyles(); _settingsStyles();
  const user = await getCurrentUser(); if(!user) return;
  const p = await getUserProfile(user.id) || {};
  let modal=document.getElementById('settings-modal');
  if(!modal){ modal=document.createElement('div'); modal.id='settings-modal'; modal.className='help-overlay';
    modal.onclick=(e)=>{ if(e.target===modal) modal.classList.remove('open'); };
    document.body.appendChild(modal); }
  const initial = ((p.first_name||'?')[0]||'?').toUpperCase();
  modal.innerHTML = `<div class="help-box">
    <h2>Ajustes de cuenta</h2>
    <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
      <div id="av-crop" style="width:120px;height:120px;border-radius:50%;overflow:hidden;position:relative;border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);flex-shrink:0;cursor:grab;touch-action:none">
        <div id="av-initials" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:40px;color:#9a9aa8;${p.avatar_url?'display:none':''}">${initial}</div>
        <img id="av-img" src="${p.avatar_url||''}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;${p.avatar_url?'':'display:none;'}user-select:none;-webkit-user-drag:none" draggable="false">
      </div>
      <div style="flex:1">
        <input type="file" id="set-avatar-file" accept="image/*" style="font-size:12px;color:#b8b8c4">
        <div id="av-controls" style="display:none;margin-top:10px">
          <input type="range" id="av-zoom" min="1" max="3" step="0.01" value="1" style="width:100%;accent-color:var(--gold,#e8b84b)">
          <div style="font-size:11px;color:#8a8a98;margin-top:2px">Arrastra la imagen para centrarla · desliza para acercar.</div>
        </div>
        <div style="font-size:11px;color:#8a8a98;margin-top:6px">Sube una foto o logo (JPG/PNG).</div>
      </div>
    </div>
    <div class="help-field"><label>Nombre (no editable)</label><input type="text" value="${(p.first_name||'').replace(/"/g,'&quot;')}" disabled></div>
    <div class="help-field"><label>Apellidos (no editable)</label><input type="text" value="${(p.last_name||'').replace(/"/g,'&quot;')}" disabled></div>
    <div class="help-field"><label>Alias (mote)</label><input type="text" id="set-alias" value="${(p.alias||'').replace(/"/g,'&quot;')}"></div>
    <div class="help-field"><label>Teléfono</label><input type="tel" inputmode="tel" id="set-phone" value="${(p.phone||'').replace(/"/g,'&quot;')}"></div>
    <div class="help-field"><label>Correo electrónico</label><input type="email" id="set-email" value="${(p.email||'').replace(/"/g,'&quot;')}"></div>
    <div class="help-field"><label>Contraseña actual (solo para cambiar el correo)</label><input type="password" id="set-pwd" placeholder="••••••••"></div>
    <div id="set-status" style="font-size:12px;min-height:16px;line-height:1.4"></div>
    <div class="help-actions"><button class="help-cancel" onclick="document.getElementById('settings-modal').classList.remove('open')">Cancelar</button>
      <button class="help-send" id="set-save" onclick="saveSettings('${user.id}','${(p.email||'').replace(/'/g,"\\'")}')">Guardar</button></div>
  </div>`;
  modal.classList.add('open');
  _avCrop=null;
  const fileInput=document.getElementById('set-avatar-file');
  if(fileInput) fileInput.onchange=()=>{ const f=fileInput.files[0]; if(f) initAvatarCropper(f); };
  wireAvatarDrag();
}
async function saveSettings(userId, currentEmail){
  const sb=getSB();
  const status=document.getElementById('set-status');
  const btn=document.getElementById('set-save'); btn.textContent='Guardando…'; btn.disabled=true;
  const done=(msg,ok)=>{ status.style.color=ok?'var(--success,#34d399)':'#f87171'; status.textContent=msg; btn.textContent='Guardar'; btn.disabled=false; };
  try {
    const upd={ alias: (document.getElementById('set-alias').value||'').trim()||null,
                phone: (document.getElementById('set-phone').value||'').trim()||null };
    // Avatar upload
    if(_avCrop && _avCrop.fromFile){
      const blob=await exportAvatarBlob();
      if(blob){
        const path=userId+'/avatar.png';
        const { error:upErr }=await sb.storage.from('avatars').upload(path, blob, { upsert:true, contentType:'image/png' });
        if(upErr){ done('No se pudo subir la imagen: '+upErr.message,false); return; }
        const { data:pub }=sb.storage.from('avatars').getPublicUrl(path);
        upd.avatar_url=pub.publicUrl + '?t=' + Date.now();
      }
    }
    // Email change (requires password)
    const newEmail=(document.getElementById('set-email').value||'').trim();
    const pwd=document.getElementById('set-pwd').value;
    let emailMsg='';
    if(newEmail && newEmail.toLowerCase()!==(currentEmail||'').toLowerCase()){
      if(!pwd){ done('Introduce tu contraseña actual para cambiar el correo.',false); return; }
      const { error:authErr }=await sb.auth.signInWithPassword({ email: currentEmail, password: pwd });
      if(authErr){ done('Contraseña incorrecta.',false); return; }
      const { error:emErr }=await sb.auth.updateUser({ email:newEmail });
      if(emErr){ done(emErr.message,false); return; }
      upd.email=newEmail;
      emailMsg=' Te hemos enviado un correo de confirmación al nuevo email — el cambio se completa al pulsar ese enlace.';
    }
    const { error }=await sb.from('users').update(upd).eq('id', userId);
    if(error){ done('Error al guardar: '+error.message,false); return; }
    done('✓ Cambios guardados.'+emailMsg, true);
    if(typeof initNav==='function') initNav();
    setTimeout(()=>{ const m=document.getElementById('settings-modal'); if(m && !emailMsg) m.classList.remove('open'); }, 1400);
  } catch(e){ done('Error inesperado.',false); }
}

// ── MAINTENANCE MODE + SCHEDULED BANNER ──────────────────────────────────────
// Reads settings written by the admin (Ajustes). Redirects non-admins to the
// maintenance page when maintenance_mode is on, and shows a scheduled banner.
async function initSiteState(){
  try {
    const path = (location.pathname.split('/').pop() || '').toLowerCase();
    const EXEMPT = ['mantenimiento.html','porra-login.html','porra-admin.html','porra-register.html','porra-mundial-2026.html','index.html',''];
    const sb = getSB();
    const { data } = await sb.from('settings').select('key,value').in('key',['maintenance_mode','maint_banner','maint_banner_time']);
    const map = {}; (data||[]).forEach(r => map[r.key] = r.value);

    if (map.maintenance_mode === 'true' && !EXEMPT.includes(path)) {
      let isAdmin = false;
      const u = await getCurrentUser();
      if (u) { const p = await getUserProfile(u.id); isAdmin = !!(p && p.is_admin); }
      if (!isAdmin) { location.href = 'mantenimiento.html'; return; }
    }
    if (map.maint_banner === 'true' && path !== 'mantenimiento.html' && path !== 'porra-admin.html') {
      showMaintBanner(map.maint_banner_time);
    }
  } catch (e) { /* settings unavailable — fail open */ }
}
function showMaintBanner(timeStr){
  if (document.getElementById('maint-banner')) return;
  const TAIL = 'La web no estará disponible mientras dure el mantenimiento. Avisaremos por WhatsApp una vez que esté operativa de nuevo.';
  let msg = '🔧 Mantenimiento programado próximamente. ' + TAIL;
  if (timeStr) { try {
    // timeStr is stored as US-Eastern (EDT, UTC−4) wall-clock "YYYY-MM-DDTHH:MM" with
    // no zone, so new Date() would read it as the VIEWER's local time. Parse the parts
    // and add 4h to get real UTC, then format in each zone.
    const [dp, tp] = String(timeStr).split('T');
    const [Y,Mo,Da] = dp.split('-').map(Number); const [H,Mi] = (tp||'0:0').split(':').map(Number);
    const d = new Date(Date.UTC(Y, Mo-1, Da, H+4, Mi));
    const es = d.toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Madrid'});
    const us = d.toLocaleString('es-ES',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'America/New_York'});
    msg = '🔧 Mantenimiento programado: ' + us + ' (Costa Este) · ' + es + ' (España). ' + TAIL;
  } catch(e){} }
  const b = document.createElement('div');
  b.id = 'maint-banner';
  b.style.cssText = 'background:#e8b84b;color:#13131f;text-align:center;padding:10px 16px;font-size:13px;font-weight:700;font-family:\'DM Sans\',sans-serif;line-height:1.4';
  b.textContent = msg;
  document.body.insertBefore(b, document.body.firstChild);
}
// FEATURE FLAG: mientras la Quiniela esté desactivada, ocultamos todos sus
// enlaces (pestañas de navegación y tarjetas del inicio) en todo el sitio.
// Para reactivarla, pon QUINIELA_DISABLED = false.
const QUINIELA_DISABLED = false;
function hideQuinielaLinks(){
  if(!QUINIELA_DISABLED) return;
  try{
    document.querySelectorAll('a[href*="porra-quiniela"]').forEach(a=>{
      const card = a.closest('.action-card');
      (card || a).style.display = 'none';
    });
  }catch(e){}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hideQuinielaLinks); else hideQuinielaLinks();
[400, 1200].forEach(ms => setTimeout(hideQuinielaLinks, ms)); // por si algún enlace se inyecta tarde

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSiteState);
else initSiteState();

// ── BANNER GLOBAL "EN DIRECTO" (en todas las páginas de la app) ───────────────
// Aparece automáticamente bajo la barra de navegación cuando hay un partido en
// juego (kickoff <= ahora < kickoff+3h y sin resultado aún). Enlaza a En directo.
async function initLiveBanner(){
  try{
    const path=(location.pathname.split('/').pop()||'').toLowerCase();
    const EXEMPT=['porra-login.html','porra-register.html','porra-admin.html','mantenimiento.html','porra-mundial-2026.html','porra-live.html','index.html',''];
    if(EXEMPT.includes(path)) return;
    const nav=document.querySelector('nav'); if(!nav) return;
    if(!document.getElementById('glb-css')){
      const st=document.createElement('style'); st.id='glb-css';
      st.textContent="#global-live-banner{max-width:880px;margin:0 auto;padding:10px 16px 0}"
        +"#global-live-banner .live-banner-row{display:flex;align-items:center;gap:11px;background:rgba(200,16,46,.1);border:1px solid rgba(200,16,46,.4);border-radius:12px;padding:11px 14px;margin-bottom:8px;text-decoration:none;color:var(--text,#eee)}"
        +"#global-live-banner .live-pill{display:inline-block;font-size:9px;font-weight:700;letter-spacing:.4px;color:#fff;background:var(--red,#C8102E);border-radius:10px;padding:3px 8px;white-space:nowrap;animation:glbpulse 1.4s infinite}"
        +"#global-live-banner .live-banner-row.pre{background:rgba(255,215,0,.08);border-color:rgba(255,215,0,.4)}"
        +"#global-live-banner .live-pill.pre{background:var(--gold,#FFD700);color:#1a1a1a;animation:none}"
        +"#global-live-banner .live-banner-row.pre .live-banner-go{color:var(--gold,#FFD700)}"
        +"#global-live-banner .live-banner-teams{font-weight:600;font-size:14px}"
        +"#global-live-banner .live-banner-go{margin-left:auto;color:#ff5b5b;font-size:12px;font-weight:700;white-space:nowrap}"
        +"@keyframes glbpulse{0%,100%{opacity:1}50%{opacity:.55}}";
      document.head.appendChild(st);
    }
    let box=document.getElementById('global-live-banner');
    if(!box){ box=document.createElement('div'); box.id='global-live-banner'; nav.insertAdjacentElement('afterend', box); }
    // Detección FIABLE de "en directo" vía API-Football (igual que la página En directo).
    // Un filtro barato con la BD evita llamar al API cuando no hay partidos cerca.
    const API_FB='https://v3.football.api-sports.io', FB_LEAGUE=1, FB_SEASON=2026;
    const FB_LIVE=new Set(['1H','HT','2H','ET','BT','P','LIVE','SUSP','INT']);
    const TE=(typeof teamES==='function')?teamES:(x=>x);
    let _fbKey=null, _cache={t:0, live:[], soon:[]};
    const fbKey=async()=>{ if(_fbKey!=null) return _fbKey; try{ const { data }=await getSB().from('settings').select('value').eq('key','apifootball_key').maybeSingle(); _fbKey=(data&&data.value)||''; }catch(e){ _fbKey=''; } return _fbKey; };
    const fbGet=async(p)=>{ const k=await fbKey(); if(!k) return []; try{ const r=await fetch(API_FB+p,{headers:{'x-apisports-key':k}}); const j=await r.json(); return j.response||[]; }catch(e){ return []; } };
    const fill=async()=>{
      try{
        const now=Date.now();
        // Filtro barato (BD): ventana amplia y tolerante a horas aproximadas.
        const lo=new Date(now-7*3600000).toISOString(), hi=new Date(now+7*3600000).toISOString();
        const { data:near }=await getSB().from('matches').select('id').gte('kickoff',lo).lte('kickoff',hi).limit(1);
        if(!near||!near.length){ box.style.display='none'; box.innerHTML=''; return; }
        if(now-_cache.t>25000){
          const [lr,nr]=await Promise.all([
            fbGet('/fixtures?league='+FB_LEAGUE+'&season='+FB_SEASON+'&live=all'),
            fbGet('/fixtures?league='+FB_LEAGUE+'&season='+FB_SEASON+'&next=6'),
          ]);
          _cache={t:now, live:lr||[], soon:nr||[]};
        }
        const live=(_cache.live||[]).filter(f=>f.fixture&&f.fixture.status&&FB_LIVE.has(f.fixture.status.short));
        const soon=(_cache.soon||[]).filter(f=>{ const d=f.fixture&&f.fixture.date; if(!d) return false; const ko=new Date(d).getTime(); return ko>now && (ko-now)<=15*60000; });
        if(!live.length && !soon.length){ box.style.display='none'; box.innerHTML=''; return; }
        box.style.display='block';
        const liveRows=live.map(f=>{
          const h=TE(f.teams&&f.teams.home&&f.teams.home.name), a=TE(f.teams&&f.teams.away&&f.teams.away.name);
          const gh=(f.goals&&f.goals.home)!=null?f.goals.home:0, ga=(f.goals&&f.goals.away)!=null?f.goals.away:0;
          const st=f.fixture.status.short, el=f.fixture.status.elapsed;
          const min=st==='HT'?'Descanso':(el!=null?el+"\u0027":'En juego');
          return '<a class="live-banner-row" href="porra-live.html"><span class="live-pill">EN DIRECTO</span><span class="live-banner-teams">'+h+' <b>'+gh+'-'+ga+'</b> '+a+'</span><span class="live-banner-go">'+min+' \u00b7 Ver \u2192</span></a>';
        }).join('');
        const soonRows=soon.map(f=>{
          const h=TE(f.teams&&f.teams.home&&f.teams.home.name), a=TE(f.teams&&f.teams.away&&f.teams.away.name);
          const mins=Math.max(1,Math.round((new Date(f.fixture.date).getTime()-now)/60000));
          return '<a class="live-banner-row pre" href="porra-live.html"><span class="live-pill pre">PRONTO</span><span class="live-banner-teams">'+h+' <span style="color:var(--muted)">vs</span> '+a+'</span><span class="live-banner-go">Empieza en '+mins+' min \u2192</span></a>';
        }).join('');
        box.innerHTML=liveRows+soonRows;
      }catch(e){ /* silencioso */ }
    };
    fill(); setInterval(fill, 30000);
  }catch(e){}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLiveBanner);
else initLiveBanner();

// ── TOASTS (banner que aparece y se va) + presencia/visitas + aviso de puntos ──
window.porraToast = function(msg, kind){
  try{
    if(!document.getElementById('porra-toast-css')){
      const st=document.createElement('style'); st.id='porra-toast-css';
      st.textContent='#porra-toasts{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:10050;display:flex;flex-direction:column;gap:8px;width:min(420px,calc(100vw - 24px));pointer-events:none}'+
        '.porra-toast{pointer-events:auto;background:var(--bg2,#0e0e1c);border:1px solid var(--border,rgba(255,255,255,.12));border-left:4px solid var(--gold,#FFD700);border-radius:11px;padding:11px 14px;color:var(--text,#eee);font-family:\'DM Sans\',sans-serif;font-size:13.5px;font-weight:600;box-shadow:0 8px 28px rgba(0,0,0,.45);opacity:0;transform:translateY(-10px);transition:opacity .25s,transform .25s;display:flex;align-items:center;gap:9px}'+
        '.porra-toast.show{opacity:1;transform:translateY(0)}'+
        '.porra-toast.good{border-left-color:#22c55e}.porra-toast.bad{border-left-color:#ef4444}'+
        '.porra-toast .pt-ic{font-family:\'Bebas Neue\',sans-serif;font-size:18px;color:var(--gold,#FFD700);line-height:1}'+
        '.porra-toast.good .pt-ic{color:#22c55e}.porra-toast.bad .pt-ic{color:#ef4444}';
      document.head.appendChild(st);
    }
    let box=document.getElementById('porra-toasts');
    if(!box){ box=document.createElement('div'); box.id='porra-toasts'; document.body.appendChild(box); }
    const t=document.createElement('div'); t.className='porra-toast'+(kind?(' '+kind):'');
    const mark=kind==='bad'?'✗':(kind==='good'?'★':'!');
    t.innerHTML='<span class="pt-ic">'+mark+'</span><span>'+msg+'</span>';
    box.appendChild(t);
    requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),300); }, 5000);
  }catch(e){}
};

async function initPresenceAndPoints(){
  try{
    const path=(location.pathname.split('/').pop()||'').toLowerCase();
    if(/login|register|mantenimiento|admin|index/.test(path)) return;
    await (window.sbReady ? window.sbReady(6000) : Promise.resolve());
    const user = await getCurrentUser(); if(!user) return;
    const sb=getSB();
    // 1) registrar visita (día del Pacífico + hora local de la PRIMERA visita del día)
    try{
      const day = window.matchDateKey ? window.matchDateKey(new Date().toISOString()) : new Date().toISOString().slice(0,10);
      const first_hour = new Date().getHours();
      await sb.from('visits').upsert({ user_id:user.id, day, first_hour }, { onConflict:'user_id,day', ignoreDuplicates:true });
    }catch(_){}
    // 2) aviso de puntos ganados desde la última vez (por dispositivo)
    try{
      const { data } = await sb.from('scores').select('total').eq('user_id', user.id).maybeSingle();
      const total = data ? (data.total||0) : 0;
      const key='porra_pts_'+user.id;
      const prevRaw=localStorage.getItem(key);
      if(prevRaw!=null){ const prev=parseInt(prevRaw,10); if(!isNaN(prev) && total>prev){ window.porraToast('+'+(total-prev)+' puntos desde tu última visita', 'good'); } }
      localStorage.setItem(key, String(total));
    }catch(_){}
  }catch(e){}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPresenceAndPoints);
else initPresenceAndPoints();


/* ═══════════════════════════════════════════════════════════════
   EL ORÁCULO · chat-bot con caña (se inyecta en todas las páginas)
   Llama a la Edge Function "asistente". Solo aparece con sesión.
   Para desactivarlo en una página: window.BOT_DISABLED = true;
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const FN_URL = SUPABASE_URL + '/functions/v1/asistente';
  const BOT_NAME = 'El Oráculo';

  async function initBot() {
    try {
      if (window.BOT_DISABLED) return;
      if (document.getElementById('pulpo-btn')) return;
      // Solo para usuarios con sesión iniciada
      let user = null;
      try { user = await getCurrentUser(); } catch (e) {}
      if (!user) return;

      const css = document.createElement('style');
      css.textContent = `
        #pulpo-btn{position:fixed;right:18px;bottom:18px;z-index:9998;width:58px;height:58px;border-radius:50%;
          border:2px solid rgba(255,255,255,.85);cursor:pointer;padding:0;background:#fff url('ball.jpg') center/cover;
          box-shadow:0 6px 20px rgba(0,0,0,.45);transition:transform .15s}
        #pulpo-btn:hover{transform:scale(1.08)}
        #pulpo-label{position:fixed;right:86px;bottom:32px;z-index:9998;background:var(--bg2,#0e0e1c);
          border:1px solid var(--border,rgba(255,255,255,.14));color:var(--text,#eee);font-size:12px;font-weight:600;
          padding:7px 12px;border-radius:20px;box-shadow:0 4px 14px rgba(0,0,0,.4);white-space:nowrap;cursor:pointer;
          display:flex;align-items:center;gap:7px}
        #pulpo-label .dot{width:7px;height:7px;border-radius:50%;background:var(--exact,#3ad29f);animation:orpulse 1.6s infinite}
        @keyframes orpulse{0%,100%{opacity:1}50%{opacity:.4}}
        #pulpo-label.hide{display:none}
        #pulpo-panel{position:fixed;right:18px;bottom:84px;z-index:9999;width:min(360px,calc(100vw - 28px));
          height:min(520px,calc(100vh - 130px));display:none;flex-direction:column;overflow:hidden;
          background:var(--bg2,#0e0e1c);border:1px solid var(--border,rgba(255,255,255,.12));
          border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.6)}
        #pulpo-panel.open{display:flex}
        #pulpo-head{padding:13px 15px;background:linear-gradient(180deg,var(--bg3,#151523),var(--bg2,#0e0e1c));
          border-bottom:1px solid var(--border,rgba(255,255,255,.1));display:flex;align-items:center;gap:9px}
        #pulpo-head .t{font-family:'Bebas Neue',sans-serif;letter-spacing:1px;font-size:19px;color:var(--text,#eee)}
        #pulpo-head .x{margin-left:auto;background:none;border:none;color:var(--muted,#888);font-size:20px;cursor:pointer;line-height:1}
        #pulpo-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px}
        .pm{max-width:84%;padding:9px 12px;border-radius:13px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word}
        .pm.bot{align-self:flex-start;background:var(--bg3,#1a1a2b);color:var(--text,#eee);border-bottom-left-radius:4px}
        .pm.me{align-self:flex-end;background:var(--red,#C8102E);color:#fff;border-bottom-right-radius:4px}
        .pm.typing{opacity:.6;font-style:italic}
        #pulpo-form{display:flex;gap:8px;padding:11px;border-top:1px solid var(--border,rgba(255,255,255,.1))}
        #pulpo-in{flex:1;background:var(--bg,#07070f);border:1px solid var(--border,rgba(255,255,255,.14));
          border-radius:10px;color:var(--text,#eee);padding:10px 12px;font-size:16px;font-family:inherit;outline:none}
        #pulpo-send{background:var(--gold,#FFD700);color:#000;border:none;border-radius:10px;padding:0 15px;font-weight:700;cursor:pointer}
        #pulpo-send:disabled{opacity:.5;cursor:default}
        #pulpo-remaining{padding:5px 14px;font-size:11px;color:var(--muted,#888);text-align:center;border-top:1px solid var(--border,rgba(255,255,255,.07))}
      `;
      document.head.appendChild(css);

      const btn = document.createElement('button');
      btn.id = 'pulpo-btn'; btn.title = 'Pregunta al Oráculo';
      const label = document.createElement('div');
      label.id = 'pulpo-label'; label.innerHTML = '<span class="dot"></span>Pregunta al Oráculo';
      const panel = document.createElement('div');
      panel.id = 'pulpo-panel';
      panel.innerHTML =
        '<div id="pulpo-head"><span style="display:inline-block;width:26px;height:26px;border-radius:50%;background:#fff url(\'ball.jpg\') center/cover;border:1px solid rgba(255,255,255,.5)"></span><span class="t">' + BOT_NAME + '</span>'
        + '<button class="x" id="pulpo-x">✕</button></div>'
        + '<div id="pulpo-msgs"></div>'
        + '<div id="pulpo-remaining"></div>'
        + '<form id="pulpo-form"><input id="pulpo-in" autocomplete="off" placeholder="Pregúntame… si te atreves" maxlength="500">'
        + '<button id="pulpo-send" type="submit">➤</button></form>';
      document.body.appendChild(btn);
      document.body.appendChild(label);
      document.body.appendChild(panel);

      const msgs = panel.querySelector('#pulpo-msgs');
      const input = panel.querySelector('#pulpo-in');
      const sendBtn = panel.querySelector('#pulpo-send');
      let greeted = false;
      let convo = [];

      function add(text, who) {
        const d = document.createElement('div');
        d.className = 'pm ' + who; d.textContent = text;
        msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight;
        return d;
      }
      function toggle(open) {
        panel.classList.toggle('open', open);
        label.classList.toggle('hide', open);
        if (open) {
          if (!greeted) { add('Soy el Oráculo. Pregunta lo que quieras… pero no llores si la respuesta no te gusta.', 'bot'); greeted = true; }
          setTimeout(() => input.focus(), 50);
        }
      }
      btn.addEventListener('click', () => toggle(!panel.classList.contains('open')));
      label.addEventListener('click', () => toggle(true));
      panel.querySelector('#pulpo-x').addEventListener('click', () => toggle(false));

      panel.querySelector('#pulpo-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = input.value.trim(); if (!q) return;
        add(q, 'me'); input.value = ''; sendBtn.disabled = true;
        const typing = add('escribiendo…', 'bot'); typing.classList.add('typing');
        try {
          const r = await fetch(FN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SUPABASE_ANON, 'apikey': SUPABASE_ANON },
            body: JSON.stringify({ question: q, user_id: user.id, history: convo.slice(-6) })
          });
          const j = await r.json();
          typing.remove();
          const replyText = j.reply || 'Me he quedado mudo, cosa rara.';
          add(replyText, 'bot');
          convo.push({ role:'user', content:q }, { role:'assistant', content:replyText });
          if (convo.length > 12) convo = convo.slice(-12);
          if (typeof j.remaining === 'number') {
            const rem = panel.querySelector('#pulpo-remaining');
            if (rem) {
              rem.textContent = j.remaining > 0 ? ('Te quedan ' + j.remaining + ' preguntas hoy') : 'Has agotado tus preguntas de hoy';
              rem.style.color = j.remaining > 0 ? 'var(--muted,#888)' : 'var(--red,#C8102E)';
            }
          }
        } catch (err) {
          typing.remove();
          add('No me llega la señal… será la VAR. Prueba otra vez.', 'bot');
        }
        sendBtn.disabled = false; input.focus();
      });
    } catch (e) { /* el bot nunca debe romper la página */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBot);
  else initBot();
})();


/* ═══════════════════════════════════════════════════════════════
   PUNTOS POR PARTIDO — helper compartido (clasificación diaria,
   "puntos hoy", capturas, etc.). Refleja el motor de puntuación SQL.
   Grupos: 1X2 +1 · dif +2 · exacto +3 (acumulativo, máx 6)
   Eliminatorias: r32 2/3/4 · r16 3/4/5 · qf 4/5/6 · sf 5/6/7 · final 10/15/20
   ═══════════════════════════════════════════════════════════════ */
window.PORRA_KOVALS = { r32:[2,3,4], r16:[3,4,5], qf:[4,5,6], sf:[5,6,7], final:[10,15,20] };
window.matchPoints = function(phase, ph, pa, rh, ra){
  if(ph==null||pa==null||rh==null||ra==null) return 0;
  const oneX2 = Math.sign(ph-pa)===Math.sign(rh-ra);
  const gd    = (ph-pa)===(rh-ra);
  const exact = ph===rh && pa===ra;
  const v = window.PORRA_KOVALS[phase];
  if(!v) return (oneX2?1:0)+(gd?2:0)+(exact?3:0);     // grupos
  return (oneX2?v[0]:0)+(gd?v[1]:0)+(exact?v[2]:0);   // eliminatorias
};
// Clave de día (YYYY-MM-DD). Por defecto en horario del país anfitrión (EE.UU.,
// zona Este), que es como se organizan las jornadas del Mundial — así un partido
// nocturno en EE.UU. no se cuenta en el día siguiente (hora de España).
window.matchDateKey = function(iso, tz){
  try{ return new Date(iso).toLocaleDateString('en-CA',{timeZone:tz||'America/Los_Angeles'}); }catch(e){ return ''; }
};

// ── Promo de la Trivia diaria ─────────────────────────────────────────────
// Aparece UNA vez al día (por navegador) en las páginas principales, invitando
// a jugar el reto. No molesta en la propia página de Trivia ni en login/landing,
// y visitar la Trivia marca el día como "ya avisado".
function showTriviaPromo(){
  if(document.getElementById('pm-trivia-promo')) return;
  var ov=document.createElement('div'); ov.id='pm-trivia-promo';
  ov.style.cssText='position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);padding:20px';
  ov.innerHTML='<div style="background:var(--bg2,#0e0e1c);border:1px solid var(--border,rgba(255,255,255,.1));border-radius:16px;max-width:340px;width:100%;padding:24px 22px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.5)">'
    +'<div style="font-size:36px;margin-bottom:4px">\u26BD</div>'
    +'<div style="font-family:\'Bebas Neue\',sans-serif;font-size:25px;letter-spacing:1px;color:var(--text,#fff);margin-bottom:6px">Trivia Mundial diaria</div>'
    +'<div style="font-size:14px;color:var(--muted,rgba(238,238,248,.6));line-height:1.5;margin-bottom:18px">Juega nuestro quiz diario y demuestra tu conocimiento mundialista. \u00A1Preguntas nuevas cada d\u00EDa!</div>'
    +'<a href="porra-trivia.html" style="display:block;background:var(--red,#C8102E);color:#fff;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px;padding:12px;margin-bottom:9px">Jugar ahora</a>'
    +'<button id="pm-trivia-promo-x" style="width:100%;background:transparent;border:none;color:var(--muted,rgba(238,238,248,.5));font-size:13px;cursor:pointer;font-family:inherit;padding:4px">Ahora no</button>'
    +'</div>';
  document.body.appendChild(ov);
  var close=function(){ ov.remove(); };
  ov.addEventListener('click',function(e){ if(e.target===ov) close(); });
  var x=document.getElementById('pm-trivia-promo-x'); if(x) x.addEventListener('click',close);
}
function injectTriviaPromo(){
  try{
    var path=(location.pathname||'').toLowerCase();
    var skip=['porra-trivia','porra-login','porra-register','porra-admin','mantenimiento','porra-predict','porra-quiniela','porra-mundial-2026'];
    if(/(^|\/)index\.html?$/.test(path) || path==='/' || path==='') return;
    if(skip.some(function(s){ return path.indexOf(s)>=0; })) return;
    var day=(window.matchDateKey?matchDateKey(new Date().toISOString()):new Date().toISOString().slice(0,10));
    if(localStorage.getItem('pm-trivia-promo')===day) return;
    localStorage.setItem('pm-trivia-promo',day); // solo una vez al día
    setTimeout(showTriviaPromo,1400);
  }catch(e){}
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectTriviaPromo); else injectTriviaPromo();
