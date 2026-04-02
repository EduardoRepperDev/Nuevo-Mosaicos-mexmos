/**
 * seed_data.js — Datos semilla / demo para Mexicana de Mosaicos
 * Se carga DESPUÉS de utils.js. Inyecta datos pre-fabricados en localStorage
 * la primera vez que se abre la app (o si se borran).
 *
 * Exporta:  CreacionesStore  (CRUD sobre localStorage)
 *           SEED_CREACIONES  (array de creaciones demo)
 *           SEED_HISTORIAL   (historial de actividad demo)
 */

/* ══════════════════════════════════════
   DATOS SEMILLA — CREACIONES POR USUARIO
   ══════════════════════════════════════ */

const SEED_CREACIONES = [
  // ── hannia@mosaicos.mx ──
  {
    id: 'CRE-S001', owner: 'hannia@mosaicos.mx',
    name: 'Terracota Palladiana Clásica',
    line: 'TRAD', pattern: 'palladiana',
    color: '#C8741A', colorName: 'Terracota',
    size: '40×40', grain: '—',
    date: '28 Mar 2026, 14:32', ts: Date.now() - 1000 * 60 * 60 * 96,
    code: 'TRZ-TRAD-40x40-TER-PALL',
    paramSize: 35, paramIrreg: 60, paramDensity: 3,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S002', owner: 'hannia@mosaicos.mx',
    name: 'Hueso Tradicional Suave',
    line: 'TRAD', pattern: 'tradicional',
    color: '#F5F0E0', colorName: 'Hueso',
    size: '30×30', grain: '40/45/15',
    date: '28 Mar 2026, 11:08', ts: Date.now() - 1000 * 60 * 60 * 100,
    code: 'TRZ-TRAD-30x30-HUE-TRAD',
    paramSize: 35, paramIrreg: 60, paramDensity: 3,
    grainFino: 40, grainMedio: 45, grainGrueso: 15,
  },
  {
    id: 'CRE-S003', owner: 'hannia@mosaicos.mx',
    name: 'Azul Cielo Opus Grande',
    line: 'L-64', pattern: 'opusincertum',
    color: '#4A9EBF', colorName: 'Azul Cielo',
    size: '60×60', grain: '—',
    date: '29 Mar 2026, 09:15', ts: Date.now() - 1000 * 60 * 60 * 72,
    code: 'TRZ-L-64-60x60-AZU-OPUS',
    paramSize: 45, paramIrreg: 70, paramDensity: 4,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S004', owner: 'hannia@mosaicos.mx',
    name: 'Verde Colonial Trencadís',
    line: 'COL', pattern: 'trencadis',
    color: '#2E6E4E', colorName: 'Verde',
    size: '20×20', grain: '—',
    date: '30 Mar 2026, 16:45', ts: Date.now() - 1000 * 60 * 60 * 48,
    code: 'TRZ-COL-20x20-VER-TREN',
    paramSize: 20, paramIrreg: 80, paramDensity: 2,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S005', owner: 'hannia@mosaicos.mx',
    name: 'Rojo Intenso Palladiana',
    line: 'TRAD', pattern: 'palladiana',
    color: '#B91C1C', colorName: 'Rojo',
    size: '40×40', grain: '—',
    date: '31 Mar 2026, 10:22', ts: Date.now() - 1000 * 60 * 60 * 24,
    code: 'TRZ-TRAD-40x40-ROJ-PALL',
    paramSize: 40, paramIrreg: 55, paramDensity: 3,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },

  // ── cliente@mosaicos.mx ──
  {
    id: 'CRE-S006', owner: 'cliente@mosaicos.mx',
    name: 'Granito Elegante 60',
    line: 'L-64', pattern: 'palladiana',
    color: '#1A1A2E', colorName: 'Granito',
    size: '64×64', grain: '—',
    date: '27 Mar 2026, 15:10', ts: Date.now() - 1000 * 60 * 60 * 120,
    code: 'TRZ-L-64-64x64-GRA-PALL',
    paramSize: 50, paramIrreg: 45, paramDensity: 5,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S007', owner: 'cliente@mosaicos.mx',
    name: 'Ámbar Tradicional Premium',
    line: 'TRAD', pattern: 'tradicional',
    color: '#D4A843', colorName: 'Ámbar',
    size: '60×60', grain: '30/50/20',
    date: '29 Mar 2026, 13:50', ts: Date.now() - 1000 * 60 * 60 * 68,
    code: 'TRZ-TRAD-60x60-ÁMB-TRAD',
    paramSize: 35, paramIrreg: 60, paramDensity: 3,
    grainFino: 30, grainMedio: 50, grainGrueso: 20,
  },
  {
    id: 'CRE-S008', owner: 'cliente@mosaicos.mx',
    name: 'Gris Trencadís Colonial',
    line: 'COL', pattern: 'trencadis',
    color: '#8B8B8B', colorName: 'Gris',
    size: '30×30', grain: '—',
    date: '30 Mar 2026, 08:30', ts: Date.now() - 1000 * 60 * 60 * 55,
    code: 'TRZ-COL-30x30-GRI-TREN',
    paramSize: 18, paramIrreg: 90, paramDensity: 2,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },

  // ── admin@mosaicos.mx ──
  {
    id: 'CRE-S009', owner: 'admin@mosaicos.mx',
    name: 'Demo: Palladiana L-64 Azul',
    line: 'L-64', pattern: 'palladiana',
    color: '#4A9EBF', colorName: 'Azul Cielo',
    size: '60×60', grain: '—',
    date: '25 Mar 2026, 12:00', ts: Date.now() - 1000 * 60 * 60 * 168,
    code: 'TRZ-L-64-60x60-AZU-PALL',
    paramSize: 40, paramIrreg: 50, paramDensity: 4,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S010', owner: 'admin@mosaicos.mx',
    name: 'Demo: Opus Ámbar Grande',
    line: 'L-64', pattern: 'opusincertum',
    color: '#D4A843', colorName: 'Ámbar',
    size: '64×64', grain: '—',
    date: '26 Mar 2026, 09:45', ts: Date.now() - 1000 * 60 * 60 * 144,
    code: 'TRZ-L-64-64x64-ÁMB-OPUS',
    paramSize: 30, paramIrreg: 75, paramDensity: 3,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S011', owner: 'admin@mosaicos.mx',
    name: 'Demo: Tradicional Terracota',
    line: 'TRAD', pattern: 'tradicional',
    color: '#C8741A', colorName: 'Terracota',
    size: '40×40', grain: '35/50/15',
    date: '01 Abr 2026, 08:00', ts: Date.now() - 1000 * 60 * 60 * 14,
    code: 'TRZ-TRAD-40x40-TER-TRAD',
    paramSize: 35, paramIrreg: 60, paramDensity: 3,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },

  // ── super@mosaicos.mx ──
  {
    id: 'CRE-S012', owner: 'super@mosaicos.mx',
    name: 'QA: Todos los colores — Hueso',
    line: 'TRAD', pattern: 'tradicional',
    color: '#F5F0E0', colorName: 'Hueso',
    size: '40×40', grain: '35/50/15',
    date: '01 Abr 2026, 10:00', ts: Date.now() - 1000 * 60 * 60 * 12,
    code: 'TRZ-TRAD-40x40-HUE-TRAD',
    paramSize: 35, paramIrreg: 60, paramDensity: 3,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S013', owner: 'super@mosaicos.mx',
    name: 'QA: Verde Opus Incertum Fino',
    line: 'TRAD', pattern: 'opusincertum',
    color: '#2E6E4E', colorName: 'Verde',
    size: '20×20', grain: '—',
    date: '01 Abr 2026, 10:30', ts: Date.now() - 1000 * 60 * 60 * 11,
    code: 'TRZ-TRAD-20x20-VER-OPUS',
    paramSize: 25, paramIrreg: 65, paramDensity: 2,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
  {
    id: 'CRE-S014', owner: 'super@mosaicos.mx',
    name: 'QA: Colonial Rojo Trencadís',
    line: 'COL', pattern: 'trencadis',
    color: '#B91C1C', colorName: 'Rojo',
    size: '20×20', grain: '—',
    date: '01 Abr 2026, 11:00', ts: Date.now() - 1000 * 60 * 60 * 10,
    code: 'TRZ-COL-20x20-ROJ-TREN',
    paramSize: 15, paramIrreg: 85, paramDensity: 2,
    grainFino: 35, grainMedio: 50, grainGrueso: 15,
  },
];


/* ══════════════════════════════════════
   HISTORIAL DE ACTIVIDAD (para módulos admin)
   ══════════════════════════════════════ */

const SEED_HISTORIAL = [
  { id: 'H001', user: 'hannia@mosaicos.mx', action: 'Creó diseño', detail: 'Terracota Palladiana Clásica', ts: Date.now() - 1000*60*60*96, type: 'create' },
  { id: 'H002', user: 'hannia@mosaicos.mx', action: 'Creó diseño', detail: 'Hueso Tradicional Suave', ts: Date.now() - 1000*60*60*100, type: 'create' },
  { id: 'H003', user: 'cliente@mosaicos.mx', action: 'Creó diseño', detail: 'Granito Elegante 60', ts: Date.now() - 1000*60*60*120, type: 'create' },
  { id: 'H004', user: 'hannia@mosaicos.mx', action: 'Exportó PDF', detail: 'TRZ-TRAD-40x40-TER-PALL', ts: Date.now() - 1000*60*60*90, type: 'export' },
  { id: 'H005', user: 'admin@mosaicos.mx', action: 'Creó diseño demo', detail: 'Demo: Palladiana L-64 Azul', ts: Date.now() - 1000*60*60*168, type: 'create' },
  { id: 'H006', user: 'hannia@mosaicos.mx', action: 'Creó diseño', detail: 'Azul Cielo Opus Grande', ts: Date.now() - 1000*60*60*72, type: 'create' },
  { id: 'H007', user: 'cliente@mosaicos.mx', action: 'Creó diseño', detail: 'Ámbar Tradicional Premium', ts: Date.now() - 1000*60*60*68, type: 'create' },
  { id: 'H008', user: 'hannia@mosaicos.mx', action: 'Creó diseño', detail: 'Verde Colonial Trencadís', ts: Date.now() - 1000*60*60*48, type: 'create' },
  { id: 'H009', user: 'cliente@mosaicos.mx', action: 'Exportó PDF', detail: 'TRZ-L-64-64x64-GRA-PALL', ts: Date.now() - 1000*60*60*45, type: 'export' },
  { id: 'H010', user: 'hannia@mosaicos.mx', action: 'Creó diseño', detail: 'Rojo Intenso Palladiana', ts: Date.now() - 1000*60*60*24, type: 'create' },
  { id: 'H011', user: 'super@mosaicos.mx', action: 'Creó diseño QA', detail: 'QA: Todos los colores — Hueso', ts: Date.now() - 1000*60*60*12, type: 'create' },
  { id: 'H012', user: 'super@mosaicos.mx', action: 'Creó diseño QA', detail: 'QA: Verde Opus Incertum Fino', ts: Date.now() - 1000*60*60*11, type: 'create' },
  { id: 'H013', user: 'admin@mosaicos.mx', action: 'Modificó línea', detail: 'Línea Tradicional — agregó tamaño 50×50', ts: Date.now() - 1000*60*60*8, type: 'admin' },
  { id: 'H014', user: 'admin@mosaicos.mx', action: 'Modificó color', detail: 'Agregó color "Coral" (#FF6B6B)', ts: Date.now() - 1000*60*60*6, type: 'admin' },
  { id: 'H015', user: 'hannia@mosaicos.mx', action: 'Inicio de sesión', detail: 'Desde Chrome / Windows', ts: Date.now() - 1000*60*60*2, type: 'login' },
  { id: 'H016', user: 'admin@mosaicos.mx', action: 'Inicio de sesión', detail: 'Desde Chrome / Windows', ts: Date.now() - 1000*60*30, type: 'login' },
];


/* ══════════════════════════════════════
   CreacionesStore — CRUD sobre localStorage
   ══════════════════════════════════════ */

const STORE_KEY  = 'mexmos_creaciones';
const HIST_KEY   = 'mexmos_historial';
const SEEDED_KEY = 'mexmos_seeded_v2';

const CreacionesStore = {

  /** Inicializa datos semilla si no existen */
  init() {
    if (!localStorage.getItem(SEEDED_KEY)) {
      localStorage.setItem(STORE_KEY, JSON.stringify(SEED_CREACIONES));
      localStorage.setItem(HIST_KEY, JSON.stringify(SEED_HISTORIAL));
      localStorage.setItem(SEEDED_KEY, 'true');
    }
  },

  /** Devuelve TODAS las creaciones */
  getAll() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; }
    catch (_) { return []; }
  },

  /** Devuelve creaciones del usuario logueado */
  getByUser(email) {
    return this.getAll().filter(c => c.owner === email);
  },

  /** Agrega una creación */
  add(creacion) {
    const all = this.getAll();
    if (!creacion.id) creacion.id = 'CRE-' + Date.now();
    if (!creacion.owner) {
      const s = getSession();
      creacion.owner = s ? s.email : 'unknown';
    }
    all.unshift(creacion);
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
    // Registrar en historial
    this.addHistorial({
      user: creacion.owner,
      action: 'Creó diseño',
      detail: creacion.name || creacion.code,
      type: 'create'
    });
    return creacion;
  },

  /** Actualiza una creación existente por ID */
  update(id, changes) {
    const all = this.getAll();
    const idx = all.findIndex(c => c.id === id);
    if (idx !== -1) {
      Object.assign(all[idx], changes);
      localStorage.setItem(STORE_KEY, JSON.stringify(all));
    }
  },

  /** Elimina una creación por ID */
  remove(id) {
    const all = this.getAll().filter(c => c.id !== id);
    localStorage.setItem(STORE_KEY, JSON.stringify(all));
  },

  /** Descarga todas las creaciones como JSON */
  downloadJSON() {
    const data = JSON.stringify(this.getAll(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = 'mexmos_creaciones_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /** Importa creaciones desde un archivo JSON */
  importJSON(file, callback) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (!Array.isArray(imported)) throw new Error('Not an array');
        const all = this.getAll();
        const existingIds = new Set(all.map(c => c.id));
        let count = 0;
        for (const item of imported) {
          if (!existingIds.has(item.id)) {
            all.push(item);
            count++;
          }
        }
        localStorage.setItem(STORE_KEY, JSON.stringify(all));
        callback(true, count);
      } catch (_) {
        callback(false, 0);
      }
    };
    reader.readAsText(file);
  },

  /** Resetea a datos semilla */
  resetToSeed() {
    localStorage.removeItem(SEEDED_KEY);
    this.init();
  },

  // ── Historial ──

  getHistorial() {
    try { return JSON.parse(localStorage.getItem(HIST_KEY)) || []; }
    catch (_) { return []; }
  },

  addHistorial(entry) {
    const hist = this.getHistorial();
    hist.unshift({
      id: 'H' + Date.now(),
      ts: Date.now(),
      ...entry
    });
    // Mantener máximo 200 entradas
    if (hist.length > 200) hist.length = 200;
    localStorage.setItem(HIST_KEY, JSON.stringify(hist));
  },
};

// Auto-init al cargar
CreacionesStore.init();
