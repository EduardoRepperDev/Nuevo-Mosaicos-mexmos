// Color utils
function hexToRgb(hex) {
  if (typeof hex !== 'string') return { r: 128, g: 128, b: 128 };
  if (hex.startsWith('rgb')) {
    const m = hex.match(/\d+/g);
    return m ? { r: +m[0], g: +m[1], b: +m[2] } : { r: 128, g: 128, b: 128 };
  }
  const h = hex.replace('#', '');
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}

function lighten(hex, a) { const c=hexToRgb(hex); return `rgb(${Math.min(255,c.r+a)},${Math.min(255,c.g+a)},${Math.min(255,c.b+a)})`; }
function darken(hex, a)  { const c=hexToRgb(hex); return `rgb(${Math.max(0,c.r-a)},${Math.max(0,c.g-a)},${Math.max(0,c.b-a)})`; }

// Unified toast — handles both id="toast" and id="toastEl"
let _toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById('toast') || document.getElementById('toastEl');
  if (!el) return;
  el.textContent = msg;
  el.className = 'toast on' + (type ? ' ' + type : '');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('on'), 3000);
}

// Unified live announcer — handles id="live" and id="statusLive"
function setLive(msg) {
  const el = document.getElementById('live') || document.getElementById('statusLive');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

// Session management
const SESSION_KEY = 'mexmos_session';
function getSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch(_) { return null; } }
function setSession(user) { localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, role: user.role, name: user.name, loginTime: Date.now() })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function requireAuth(requiredRole) {
  const s = getSession();
  if (!s) { window.location.replace('login.html'); return null; }
  if (requiredRole && s.role !== requiredRole) { window.location.replace('login.html'); return null; }
  return s;
}
function doLogout() { clearSession(); window.location.href = 'login.html'; }

// Apply saved a11y preferences from localStorage (call this on any page after session is loaded)
function applyA11yPrefs(email) {
  if (!email) return;
  try {
    const prefs = JSON.parse(localStorage.getItem('mexmos_a11y_' + email));
    if (!prefs) return;
    const r = document.documentElement;
    const CONTRAST_LVL = [
      { surf:'#1A2E42', card:'#243848', txt:'#B0B8C4', mut:'#6A8090' },
      { surf:'#0D1B2A', card:'#162E45', txt:'#F0EDE8', mut:'#5B7A99' },
      { surf:'#0A1520', card:'#112233', txt:'#F5F2EE', mut:'#7090A8' },
      { surf:'#060E18', card:'#0C1B2E', txt:'#FAFAFA', mut:'#90A8C0' },
      { surf:'#000000', card:'#0A0A0A', txt:'#FFFFFF', mut:'#BBBBBB' },
    ];
    if (prefs.contrast >= 1 && prefs.contrast <= 5) {
      const lv = CONTRAST_LVL[prefs.contrast - 1];
      r.style.setProperty('--surface-dark', lv.surf);
      r.style.setProperty('--surface-panel', lv.card);
      r.style.setProperty('--surface-card', lv.card);
      r.style.setProperty('--text-primary', lv.txt);
      r.style.setProperty('--text-muted', lv.mut);
    }
    if (prefs.fontSize >= 12 && prefs.fontSize <= 22) {
      r.style.setProperty('--font-size-base', prefs.fontSize + 'px');
      document.body.style.fontSize = prefs.fontSize + 'px';
    }
    if (prefs.movOn) document.body.classList.add('rm');
  } catch (_) {}
}

const ADMIN_ROUTES = {
  'admin_dashboard.html': '11)admin_dashboard.html',
  'admin_lineas.html': '12)CRUD_admin_lineas_de_producto.html',
  'admin_tamanos.html': '13)admin_gestion_de_tamanos.html',
  'admin_colores.html': '14)admin_colores_de_pasta.html',
  'admin_patrones.html': '15)admin_gestion_patrones_estilos.html',
  'admin_modulo_ia.html': '16)admin_modulo_ia.html',
  'admin_preview_catalogo.html': '17)admin_preview_catalogo.html',
  'admin_historial.html': '18)admin_historial.html',
};

function navAdminTo(routeKey, label) {
  const target = ADMIN_ROUTES[routeKey] || routeKey;
  showToast(`Navegando a: ${label}…`);
  setLive(`Abriendo ${label}`);
  setTimeout(() => window.location.href = target, 250);
}
