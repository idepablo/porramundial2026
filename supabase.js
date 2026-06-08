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
  'Mexico':'México','South Africa':'Sudáfrica','South Korea':'Corea del Sur',
  'Czechia':'Chequia','Canada':'Canadá','Bosnia & Herz.':'Bosnia y Herz.',
  'Switzerland':'Suiza','Morocco':'Marruecos','Scotland':'Escocia',
  'Germany':'Alemania','Ivory Coast':'Costa de Marfil','Netherlands':'Países Bajos',
  'Sweden':'Suecia','Tunisia':'Túnez','Belgium':'Bélgica','Egypt':'Egipto',
  'New Zealand':'Nueva Zelanda','Spain':'España','Cape Verde':'Cabo Verde',
  'Saudi Arabia':'Arabia Saudí','France':'Francia','Norway':'Noruega',
  'Algeria':'Argelia','DR Congo':'R.D. Congo','England':'Inglaterra',
  'Croatia':'Croacia','Panama':'Panamá','Australia':'Australia',
  'Türkiye':'Turquía','Ecuador':'Ecuador','Paraguay':'Paraguay',
  'Colombia':'Colombia','Uruguay':'Uruguay','Argentina':'Argentina',
  'Portugal':'Portugal','Japan':'Japón','USA':'EE.UU.',
  'Brazil':'Brasil','Haiti':'Haití','Jordan':'Jordania',
  'Austria':'Austria','Uzbekistan':'Uzbekistán','Ghana':'Ghana',
  'Senegal':'Senegal','Iraq':'Irak','Iran':'Irán',
  'Qatar':'Catar','Curaçao':'Curazao',
};
function teamES(name){ return TEAM_ES[name] || name; }
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
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  return _sb;
}

// ── AUTH HELPERS ─────────────────────────────────────────────────────────────
async function getCurrentUser() {
  const { data: { user } } = await getSB().auth.getUser();
  return user;
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

// ── NAV: inject login/logout state (Spanish) ─────────────────────────────────
async function initNav() {
  if (typeof _helpStyles === 'function') _helpStyles();
  const user = await getCurrentUser();
  const navRight = document.getElementById('nav-auth');
  if (!navRight) return;
  navRight.style.display = 'flex';
  navRight.style.alignItems = 'center';
  navRight.style.gap = '10px';
  const help = `<button class="navhelp-btn" onclick="openFaqModal()">FAQ</button><button class="navhelp-btn" onclick="openContactModal()">Contacto</button>`;
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
      nav { flex-wrap: wrap !important; row-gap: 6px; padding-left: 12px !important; padding-right: 12px !important; }
      .nav-logo { flex: 0 0 auto !important; font-size: 16px !important; }
      .nav-links, .nav-tabs { font-size: 12px !important; gap: 8px !important; flex-wrap: wrap; }
      #nav-auth { flex: 1 1 100% !important; justify-content: flex-end !important; flex-wrap: wrap; gap: 6px !important; }
      #nav-auth > * { font-size: 12px !important; }
      .navhelp-btn { padding: 5px 9px !important; font-size: 11px !important; }
      .deadline-pill, .nav-right .deadline-pill { font-size: 10px !important; }
      /* stop wide grids/brackets from forcing sideways scroll */
      .stats-row, .summary-grid, .hero-banner { flex-wrap: wrap; }
      .bracket { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    }
    @media (max-width: 420px) {
      .nav-logo { font-size: 15px !important; }
      .navhelp-btn { padding: 4px 7px !important; }
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
  if (!document.getElementById('nav-auth')) {
    const fab = document.createElement('div');
    fab.id = 'help-fab'; fab.className = 'help-fab';
    fab.innerHTML = `<button onclick="openFaqModal()">FAQ</button><button onclick="openContactModal()">Contacto</button>`;
    document.body.appendChild(fab);
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

  if (!document.querySelector('.site-foot')) {
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
    <div class="help-field"><label>Teléfono</label><input type="text" id="set-phone" value="${(p.phone||'').replace(/"/g,'&quot;')}"></div>
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
