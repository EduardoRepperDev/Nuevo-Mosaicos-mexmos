'use strict';
// =============================================================
//  MEXMOS — voronoi.worker.js
//  Motor Voronoi migrado de Dart → JS
//  Fuente: voronoi_engine.dart + calculador_tamano_grano.dart
//
//  Ejecuta dentro de un Web Worker para evitar bloquear el
//  hilo principal durante cómputos pesados de partículas.
//
//  API:
//   INPUT  → postMessage({ type:'render', id:number, payload:{
//               width, height, seed?, offsetPasta?,
//               escala (px/mm), capas:[{ id, abertura,
//               codigoTamano, densidad, colorNatural, pigmento }]
//            }})
//   OUTPUT ← { type:'result', id, payload:{
//               piedras:[{ pathStr, colorHex, capaId }],
//               stats:{ particleCount, renderMs }
//            }}
//   ERROR  ← { type:'error', id, payload:{ message } }
// =============================================================

// ─────────────────────────────────────────────────────────────
//  1. PRNG  Mulberry32 — seeded, deterministic
//     Equivalente a Random(42) de Dart: evita que las piedras
//     salten de posición en cada re-render.
// ─────────────────────────────────────────────────────────────
function makePRNG(seed) {
  let s = seed >>> 0;
  return function rand() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────
//  2. CalculadorTamanoGrano
//     Port directo de calculador_tamano_grano.dart
//     Convierte nomenclaturas comerciales a radio en mm.
// ─────────────────────────────────────────────────────────────
function inferirRadioMm(abertura, codigoTamano) {
  const ab = String(abertura  || '').toLowerCase().trim();
  const cd = String(codigoTamano || '');

  // Milímetros explícitos
  if (ab.includes('mm')) {
    const v = parseFloat(ab.replace(/[^\d.]/g, ''));
    if (!isNaN(v)) return v / 2;
  }

  // Fracciones en pulgadas → mm equivalentes
  if (ab.includes('3/4'))  return 19.0  / 2;   // ~9.50
  if (ab.includes('1/2'))  return 12.7  / 2;   // ~6.35
  if (ab.includes('7/16')) return 11.1  / 2;   // ~5.55
  if (ab.includes('1/4'))  return 6.35  / 2;   // ~3.18
  if (ab.includes('3/16')) return 4.76  / 2;   // ~2.38
  if (ab.includes('1/8'))  return 3.17  / 2;   // ~1.59
  if (ab.includes('3/32')) return 2.38  / 2;   // ~1.19
  if (ab.includes('1/16')) return 1.59  / 2;   // ~0.79

  // Fallback por código de tamaño
  if (cd.includes('5-6'))   return 19.0  / 2;
  if (cd.includes('3-4'))   return 12.7  / 2;
  if (cd.includes('2 1/2')) return 4.76  / 2;
  if (cd.includes('3'))     return 6.35  / 2;
  if (cd.includes('0-2'))   return 3.17  / 2;
  if (cd.includes('2'))     return 3.17  / 2;
  if (cd.includes('1'))     return 2.0   / 2;
  if (cd.includes('0 1/2')) return 1.1   / 2;

  return 1.0; // default: partícula microscópica
}

// ─────────────────────────────────────────────────────────────
//  3. Color helper
//     Acepta hex string ('#RRGGBB') o entero ARGB (Flutter).
// ─────────────────────────────────────────────────────────────
function resolveColor(capa) {
  if (capa.pigmento && capa.pigmento.codigoHex) {
    return capa.pigmento.codigoHex;
  }
  const cn = capa.colorNatural;
  if (typeof cn === 'string') {
    return cn.startsWith('#') ? cn : '#' + cn;
  }
  if (typeof cn === 'number') {
    const r = (cn >>> 16) & 0xFF;
    const g = (cn >>>  8) & 0xFF;
    const b =  cn         & 0xFF;
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  return '#888888';
}

// ─────────────────────────────────────────────────────────────
//  4. Spatial Grid  O(1) lookup
//     Equivalente al Map<int, List<Particula>> de Dart.
// ─────────────────────────────────────────────────────────────
function makeGrid(cellSize, cols) {
  const cells = new Map();

  function key(x, y) {
    return (Math.floor(y / cellSize) * cols + Math.floor(x / cellSize)) | 0;
  }

  return {
    add(x, y, item) {
      const k = key(x, y);
      if (!cells.has(k)) cells.set(k, []);
      cells.get(k).push(item);
    },
    neighbors(x, y, steps) {
      const cx = Math.floor(x / cellSize);
      const cy = Math.floor(y / cellSize);
      const result = [];
      for (let i = -steps; i <= steps; i++) {
        for (let j = -steps; j <= steps; j++) {
          const k = ((cy + i) * cols + (cx + j)) | 0;
          const cell = cells.get(k);
          if (cell) for (const item of cell) result.push(item);
        }
      }
      return result;
    }
  };
}

// ─────────────────────────────────────────────────────────────
//  5. Fase 1 — Poisson Disk Sampling
//     Port de _generarParticulas() de voronoi_engine.dart
//     Coloca partículas sin superposición, respetando exclusión
//     proporcional al radio del grano (granos grandes excluyen
//     más espacio que arenas).
// ─────────────────────────────────────────────────────────────
function generarParticulas({ capas, width, height, offsetPasta, escala, rng }) {
  // Ordenar de mayor a menor grano (los grandes se siembran primero)
  const sorted = [...capas].sort((a, b) =>
    inferirRadioMm(b.abertura, b.codigoTamano) -
    inferirRadioMm(a.abertura, a.codigoTamano)
  );

  let maxR = 0;
  for (const c of sorted) {
    const r = inferirRadioMm(c.abertura, c.codigoTamano) * escala * 1.5;
    if (r > maxR) maxR = r;
  }
  if (maxR === 0) return [];

  const cellSize = maxR * 2;
  const cols     = Math.ceil(width  / cellSize) + 2;
  const grid     = makeGrid(cellSize, cols);
  const all      = [];

  for (const capa of sorted) {
    const rMm  = inferirRadioMm(capa.abertura, capa.codigoTamano);
    const rPx  = rMm * escala * 1.5;
    if (rPx === 0) continue;

    // Cantidad teórica de partículas inflada para compensar colisiones fallidas
    const area  = width * height;
    const aP    = Math.PI * rPx * rPx;
    const maxP  = Math.min(15000, Math.floor((area * (capa.densidad || 0.4) * 1.8) / aP));

    let fails = 0;
    let placed = 0;

    while (placed < maxP && fails < 800) {
      const x = rng() * width;
      const y = rng() * height;
      const r = rPx * (0.8 + rng() * 0.4); // Jitter estocástico de tamaño

      // Verificar colisiones con radio de búsqueda 2 celdas
      const neighbors = grid.neighbors(x, y, 2);
      let hit = false;
      for (const n of neighbors) {
        const dx  = n.x - x;
        const dy  = n.y - y;
        const min = n.radio + r + offsetPasta;
        if (dx * dx + dy * dy < min * min) { hit = true; break; }
      }

      if (!hit) {
        const p = { x, y, radio: r, capa };
        all.push(p);
        grid.add(x, y, p);
        placed++;
        fails = 0;
      } else {
        fails++;
      }
    }
  }
  return all;
}

// ─────────────────────────────────────────────────────────────
//  6. Sutherland-Hodgman Half-plane Clip
//     Port de _clipPolygon() de voronoi_engine.dart
// ─────────────────────────────────────────────────────────────
function clipPolygon(poly, px, py, nx, ny) {
  if (!poly.length) return [];
  const out  = [];
  let   cp1  = poly[poly.length - 1];

  const inside    = pt => (pt.x - px) * nx + (pt.y - py) * ny <= 0;
  const intersect = (a, b) => {
    const d1 = (a.x - px) * nx + (a.y - py) * ny;
    const d2 = (b.x - px) * nx + (b.y - py) * ny;
    const t  = d1 / (d1 - d2);
    return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  };

  for (const cp2 of poly) {
    const in2 = inside(cp2);
    const in1 = inside(cp1);
    if (in2) {
      if (!in1) out.push(intersect(cp1, cp2));
      out.push(cp2);
    } else if (in1) {
      out.push(intersect(cp1, cp2));
    }
    cp1 = cp2;
  }
  return out;
}

// ─────────────────────────────────────────────────────────────
//  7. Polígono anisotrópico inicial
//     Port de _createInitialPolygon() de voronoi_engine.dart
//     Emula forma irregular de piedra partida industrialmente.
// ─────────────────────────────────────────────────────────────
function initialPolygon(p, rng) {
  const sides = 5 + Math.floor(rng() * 4); // 5 a 8 lados
  const maxR  = p.radio * 1.5;
  const sx    = 0.8 + rng() * 0.4;         // Anisotropía X
  const sy    = 0.8 + rng() * 0.4;         // Anisotropía Y
  const rot   = rng() * Math.PI;           // Rotación aleatoria

  const poly = [];
  for (let i = 0; i < sides; i++) {
    const a  = (2 * Math.PI / sides) * i;
    const lx = Math.cos(a) * maxR * sx;
    const ly = Math.sin(a) * maxR * sy;
    poly.push({
      x: p.x + lx * Math.cos(rot) - ly * Math.sin(rot),
      y: p.y + lx * Math.sin(rot) + ly * Math.cos(rot),
    });
  }
  return poly;
}

// ─────────────────────────────────────────────────────────────
//  8. Fase 2 — Diagramas Voronoi de Potencia
//     Port de _generarDiagramas() de voronoi_engine.dart
//     Aplica recorte asimétrico (peso proporcional al radio)
//     + jitter de vértices para emular cantos rotos.
//
//     Salida: array de { pathStr (SVG path), colorHex, capaId }
//     El hilo principal los convierte en Path2D y dibuja sobre Canvas.
// ─────────────────────────────────────────────────────────────
function generarDiagramas({ particulas, width, height, offsetPasta, rng }) {
  let maxR = 0;
  for (const p of particulas) if (p.radio > maxR) maxR = p.radio;

  const searchR  = maxR * 3;
  if (searchR <= 0) return [];

  const cellSize = searchR;
  const cols     = Math.ceil(width / cellSize) + 2;
  const grid     = makeGrid(cellSize, cols);
  for (const p of particulas) grid.add(p.x, p.y, p);

  const piedras = [];

  for (const p of particulas) {
    let poly = initialPolygon(p, rng);

    // Buscar vecinos en radio de búsqueda (1 celda basta porque cellSize = searchR)
    const vecinos = grid.neighbors(p.x, p.y, 1);

    for (const v of vecinos) {
      if (v === p) continue;
      const dx     = v.x - p.x;
      const dy     = v.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq <= 0 || distSq >= searchR * searchR) continue;

      const dist    = Math.sqrt(distSq);
      // Peso asimétrico: granos grandes empujan visualmente a los pequeños
      const peso    = p.radio / (p.radio + v.radio);
      const cutDist = dist * peso - offsetPasta;
      if (cutDist >= p.radio * 1.6) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      poly = clipPolygon(poly, p.x + nx * cutDist, p.y + ny * cutDist, nx, ny);
      if (!poly.length) break;
    }

    if (poly.length >= 3) {
      // Construir path SVG con jitter de vértices (fisuras naturales)
      let d = '';
      for (let i = 0; i < poly.length; i++) {
        const jx = (rng() - 0.5) * p.radio * 0.15;
        const jy = (rng() - 0.5) * p.radio * 0.15;
        const vx = (poly[i].x + jx).toFixed(1);
        const vy = (poly[i].y + jy).toFixed(1);
        d += (i === 0 ? 'M' : 'L') + vx + ',' + vy;
      }
      d += 'Z';

      piedras.push({
        pathStr : d,
        colorHex: resolveColor(p.capa),
        capaId  : p.capa.id,
      });
    }
  }

  return piedras;
}

// ─────────────────────────────────────────────────────────────
//  9. Entry point del Worker
// ─────────────────────────────────────────────────────────────
self.onmessage = function(e) {
  const { type, id, payload } = e.data;
  if (type !== 'render') return;

  const t0 = performance.now();
  try {
    const {
      width,
      height,
      seed        = 42,
      offsetPasta = 1.0,
      escala,          // px / mm  (e.g. canvasWidth / 300)
      capas,
    } = payload;

    if (!capas || capas.length === 0) {
      self.postMessage({ type: 'result', id, payload: { piedras: [], stats: { particleCount: 0, renderMs: 0 } } });
      return;
    }

    const rng       = makePRNG(seed);
    const particulas = generarParticulas({ capas, width, height, offsetPasta, escala, rng });

    // IMPORTANTE: el RNG se pasa UNA SOLA VEZ a ambas fases.
    // Las llamadas en _generarDiagramas deben continuar la secuencia
    // post-sembrado para que la caché de polígonos sea estable.
    const piedras   = generarDiagramas({ particulas, width, height, offsetPasta, rng });

    const renderMs  = Math.round(performance.now() - t0);

    self.postMessage({
      type   : 'result',
      id,
      payload: {
        piedras,
        stats: { particleCount: particulas.length, renderMs },
      },
    });
  } catch (err) {
    self.postMessage({ type: 'error', id, payload: { message: err.message } });
  }
};
