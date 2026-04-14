const session = requireAuth();
    document.getElementById('btnCatalog').addEventListener('click', () => window.location.href = 'catalogo.html');
    if (session) {
      document.getElementById('userAvatar').textContent = session.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('userAvatar').title = session.name + ' (Click para cerrar sesión)';
    }
    /* ══ DATOS ══ */
    const COLORS = [
      { name: 'Hueso', hex: '#F5F0E0', ref: 'PMS Warm Gray 1', pattern: '' },
      { name: 'Terracota', hex: '#C8741A', ref: 'PMS 166 C', pattern: '▦' },
      { name: 'Granito', hex: '#1A1A2E', ref: 'PMS Black 6 C', pattern: '' },
      { name: 'Gris', hex: '#8B8B8B', ref: 'PMS Cool Gray 7', pattern: '▪' },
      { name: 'Azul Cielo', hex: '#4A9EBF', ref: 'PMS 7459 C', pattern: '⠿' },
      { name: 'Verde', hex: '#2E6E4E', ref: 'PMS 7734 C', pattern: '≡' },
      { name: 'Ámbar', hex: '#D4A843', ref: 'PMS 1235 C', pattern: '' },
      { name: 'Rojo', hex: '#B91C1C', ref: 'PMS 7621 C', pattern: '◈' },
    ];

    /* ── Datos por línea ── */
    const LINES_DATA = {
      'TRAD': {
        name: 'Línea Tradicional',
        sizes: ['20×20', '30×30', '40×40', '60×60'],
        defaultSize: '40×40',
        patterns: ['tradicional', 'palladiana', 'trencadis', 'opusincertum'],
        defaultPattern: 'tradicional',
      },
      'L-64': {
        name: 'Línea 64',
        sizes: ['40×40', '60×60', '64×64'],
        defaultSize: '60×60',
        patterns: ['palladiana', 'opusincertum'],
        defaultPattern: 'palladiana',
      },
      'COL': {
        name: 'Línea Colonial',
        sizes: ['20×20', '30×30'],
        defaultSize: '20×20',
        patterns: ['trencadis', 'tradicional'],
        defaultPattern: 'trencadis',
      },
    };

    const ALL_PATTERNS = [
      { key: 'tradicional', label: 'Tradicional', sub: 'Grano Voronoi', hasGrain: true },
      { key: 'palladiana', label: 'Palladiana', sub: 'Fragmentos grandes', hasGrain: false },
      { key: 'trencadis', label: 'Trencadís', sub: 'Fragmentos pequeños', hasGrain: false },
      { key: 'opusincertum', label: 'Opus Incertum', sub: 'Formas libres', hasGrain: false },
    ];

    const ALL_SIZES = ['20×20', '30×30', '40×40', '50×50', '60×60', '64×64'];

    /* ══════════════════════════════════════
       DEFINICIÓN DE CAPAS — medidas exactas de fábrica
       Basadas en CalculadorTamanoGrano (aberturas de malla reales)

       Abertura 3/4" → 19.0mm diámetro → 9.5mm radio (grano grueso / #5-6)
       Abertura 1/2" → 12.7mm → 6.35mm radio
       Abertura 1/4" → 6.35mm → 3.175mm radio (grano medio / #3)
       Abertura 3/16" → 4.76mm → 2.38mm radio
       Abertura 1/8" → 3.17mm → 1.585mm radio (grano fino / #0-2)
       Abertura 1/16" → 1.59mm → 0.79mm radio
    ══════════════════════════════════════ */

    const LAYER_DEFS = {
      pasta:       { label: 'Pasta Base',    detail: 'Fondo / cemento',       icon: '▬' },
      granoGrueso: { label: 'Grano Grueso',  detail: '3/4" · 9.5mm · Malla #5-6', icon: '●' },
      granoMedio:  { label: 'Grano Medio',   detail: '1/4" · 3.175mm · Malla #3', icon: '◉' },
      granoFino:   { label: 'Grano Fino',    detail: '1/8" · 1.585mm · Malla #0-2', icon: '·' },
      fragmento:   { label: 'Fragmentos',    detail: 'Tamaño variable',      icon: '◇' },
    };

    /* ══ ESTADO ══ */
    let currentLine = 'TRAD';
    let currentPattern = 'tradicional';
    let currentSize = '40×40';
    let currentCVD = 'normal';
    let grainFino = 35, grainMedio = 50, grainGrueso = 15;
    let paramSize = 35, paramIrreg = 60, paramDensity = 3;
    let animFrame = null;
    let creaciones = (typeof CreacionesStore !== 'undefined' && session)
      ? CreacionesStore.getByUser(session.email)
      : [];

    /* ── Estado de colores por capa (independiente) ── */
    let layerColors = {
      pasta:       { hex: '#F5F0E0', name: 'Hueso', ref: 'PMS Warm Gray 1' },
      granoGrueso: { hex: '#C8741A', name: 'Terracota', ref: 'PMS 166 C' },
      granoMedio:  { hex: '#8B8B8B', name: 'Gris', ref: 'PMS Cool Gray 7' },
      granoFino:   { hex: '#1A1A2E', name: 'Granito', ref: 'PMS Black 6 C' },
      fragmento:   { hex: '#C8741A', name: 'Terracota', ref: 'PMS 166 C' },
    };
    let activeLayer = 'pasta';

    // Backward compatibility: expose currentColor as a getter for code that reads it
    function getCurrentColor() {
      return { name: layerColors.pasta.name, hex: layerColors.pasta.hex, ref: layerColors.pasta.ref };
    }

    /* ══ CANVAS ══ */
    const canvas = document.getElementById('mosaicCanvas');
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    /* ══ WORKER VORONOI ══ */
    const WORKER_SRC = `
'use strict';
function makePRNG(seed){let s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};}
function hexToRgb(hex){const h=hex.replace('#','');return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function rgbToHex(r,g,b){return'#'+(1<<24|r<<16|g<<8|b).toString(16).slice(1);}
function rgbToStr(r,g,b){return 'rgb('+r+','+g+','+b+')';}
function jitterColor(cssCol, rng, amount){
  let r,g,b;
  if(cssCol.startsWith('rgb')){
    const m = cssCol.match(/\\d+/g);
    if(m){ r=parseInt(m[0]);g=parseInt(m[1]);b=parseInt(m[2]); }
  } else if(cssCol.startsWith('#')){
    const h=hexToRgb(cssCol); r=h.r;g=h.g;b=h.b;
  } else return cssCol;
  const v = Math.floor(rng()*amount*2 - amount);
  r=Math.max(0,Math.min(255,r+v)); g=Math.max(0,Math.min(255,g+v)); b=Math.max(0,Math.min(255,b+v));
  return rgbToStr(r,g,b);
}
function inferirRadioMm(ab,cd){ab=String(ab||'').toLowerCase().trim();cd=String(cd||'');if(ab.includes('mm')){const v=parseFloat(ab.replace(/[^\\d.]/g,''));if(!isNaN(v))return v/2;}if(ab.includes('3/4'))return 9.5;if(ab.includes('1/2'))return 6.35;if(ab.includes('7/16'))return 5.55;if(ab.includes('1/4'))return 3.175;if(ab.includes('3/16'))return 2.38;if(ab.includes('1/8'))return 1.585;if(ab.includes('3/32'))return 1.19;if(ab.includes('1/16'))return 0.79;if(cd.includes('5-6'))return 9.5;if(cd.includes('3-4'))return 6.35;if(cd.includes('2 1/2'))return 2.38;if(cd.includes('3'))return 3.175;if(cd.includes('0-2'))return 1.585;if(cd.includes('2'))return 1.585;if(cd.includes('1'))return 1.0;if(cd.includes('0 1/2'))return 0.55;return 1.0;}
function resolveColor(c){if(c.pigmento&&c.pigmento.codigoHex)return c.pigmento.codigoHex;const cn=c.colorNatural;if(typeof cn==='string')return cn.startsWith('#')||cn.startsWith('rgb')?cn:'#'+cn;if(typeof cn==='number'){const r=(cn>>>16)&0xFF,g=(cn>>>8)&0xFF,b=cn&0xFF;return'#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');}return'#888888';}
function makeGrid(cs,cols){const cells=new Map();function key(x,y){return(Math.floor(y/cs)*cols+Math.floor(x/cs))|0;}return{add(x,y,it){const k=key(x,y);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(it);},neighbors(x,y,steps){const cx=Math.floor(x/cs),cy=Math.floor(y/cs),out=[];for(let i=-steps;i<=steps;i++)for(let j=-steps;j<=steps;j++){const c=cells.get((cy+i)*cols+(cx+j));if(c)for(const it of c)out.push(it);}return out;}};}
function generarParticulas({capas,width,height,offsetPasta,escala,rng,irreg,distanciaFisica}){
  const sorted=[...capas].sort((a,b)=>inferirRadioMm(b.abertura,b.codigoTamano)-inferirRadioMm(a.abertura,a.codigoTamano));
  let maxR=0;for(const c of sorted){const r=inferirRadioMm(c.abertura,c.codigoTamano)*escala;if(r>maxR)maxR=r;}
  if(maxR===0)return[];const cs=maxR*2,cols=Math.ceil(width/cs)+2,grid=makeGrid(cs,cols),all=[];
  for(const capa of sorted){
    const rMm=inferirRadioMm(capa.abertura,capa.codigoTamano),rPx=rMm*escala;if(rPx===0)continue;
    const physicalMax=Math.floor((width*height)/(Math.PI*rPx*rPx*1.4));
    const dens=(capa.densidad===undefined||capa.densidad===null)?0.4:capa.densidad;
    const maxP=Math.min(15000,Math.floor(physicalMax*dens));
    const fallLimit=rPx<5?3000:1500;
    let fails=0,placed=0;
    while(placed<maxP&&fails<fallLimit){
      const x=rng()*width,y=rng()*height,r=rPx*(0.8+rng()*0.4*(irreg||1));
      const nb=grid.neighbors(x,y,2);let hit=false;
      for(const n of nb){const dx=n.x-x,dy=n.y-y,min=n.radio+r+(distanciaFisica||offsetPasta);if(dx*dx+dy*dy<min*min){hit=true;break;}}
      if(!hit){const p={x,y,radio:r,capa};all.push(p);grid.add(x,y,p);placed++;fails=0;}else fails++;
    }
  }
  return all;
}
function clipPolygon(poly,px,py,nx,ny){if(!poly.length)return[];const out=[];let cp1=poly[poly.length-1];const inside=pt=>(pt.x-px)*nx+(pt.y-py)*ny<=0;const intersect=(a,b)=>{const d1=(a.x-px)*nx+(a.y-py)*ny,d2=(b.x-px)*nx+(b.y-py)*ny,t=d1/(d1-d2);return{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};};for(const cp2 of poly){const i2=inside(cp2),i1=inside(cp1);if(i2){if(!i1)out.push(intersect(cp1,cp2));out.push(cp2);}else if(i1)out.push(intersect(cp1,cp2));cp1=cp2;}return out;}
function initialPolygon(p,rng,irreg){const sides=5+Math.floor(rng()*4*(irreg||1)),maxR=p.radio*1.5,sx=0.8+rng()*0.4,sy=0.8+rng()*0.4,rot=rng()*Math.PI,poly=[];for(let i=0;i<sides;i++){const a=(2*Math.PI/sides)*i,lx=Math.cos(a)*maxR*sx,ly=Math.sin(a)*maxR*sy;poly.push({x:p.x+lx*Math.cos(rot)-ly*Math.sin(rot),y:p.y+lx*Math.sin(rot)+ly*Math.cos(rot)});}return poly;}
function generarDiagramas({particulas,width,height,offsetPasta,rng,irreg}){
  let maxR=0;for(const p of particulas)if(p.radio>maxR)maxR=p.radio;
  const searchR=maxR*5;if(searchR<=0)return[];const cs=maxR*2.5,cols=Math.ceil(width/cs)+2,grid=makeGrid(cs,cols);
  for(const p of particulas)grid.add(p.x,p.y,p);
  const piedras=[];
  for(const p of particulas){
    let poly=initialPolygon(p,rng,irreg);const nb=grid.neighbors(p.x,p.y,2);
    for(const v of nb){
      if(v===p)continue;const dx=v.x-p.x,dy=v.y-p.y,dSq=dx*dx+dy*dy;if(dSq<=0||dSq>=searchR*searchR)continue;
      const dist=Math.sqrt(dSq),peso=p.radio/(p.radio+v.radio),cut=dist*peso-offsetPasta;if(cut>=p.radio*1.6)continue;
      const nx=dx/dist,ny=dy/dist;poly=clipPolygon(poly,p.x+nx*cut,p.y+ny*cut,nx,ny);if(!poly.length)break;
    }
    if(poly.length>=3){
      let d='';for(let i=0;i<poly.length;i++){const jx=(rng()-.5)*p.radio*.15*(irreg||1),jy=(rng()-.5)*p.radio*.15*(irreg||1);d+=(i===0?'M':'L')+(poly[i].x+jx).toFixed(1)+','+(poly[i].y+jy).toFixed(1);}
      const baseColor = resolveColor(p.capa);
      const jColor = jitterColor(baseColor, rng, p.capa.colorVar || 10);
      piedras.push({pathStr:d+'Z',colorHex:jColor,capaId:p.capa.id});
    }
  }
  return piedras;
}
self.onmessage=(e)=>{
  const{type,id,payload}=e.data;if(type!=='render')return;const t0=performance.now();
  try{
    const{width,height,seed=42,offsetPasta=1.0,escala,capas,irreg=1,distanciaFisica}=payload;
    if(!capas||!capas.length){self.postMessage({type:'result',id,payload:{piedras:[],stats:{particleCount:0,renderMs:0}}});return;}
    const rng=makePRNG(seed);
    const particulas=generarParticulas({capas,width,height,offsetPasta,escala,rng,irreg,distanciaFisica});
    const piedras=generarDiagramas({particulas,width,height,offsetPasta,rng,irreg});
    self.postMessage({type:'result',id,payload:{piedras,stats:{particleCount:particulas.length,renderMs:Math.round(performance.now()-t0)}}});
  }catch(err){self.postMessage({type:'error',id,payload:{message:err.message}});}
};
`;

    const workerBlob = new Blob([WORKER_SRC], { type: 'application/javascript' });
    const workerURL = URL.createObjectURL(workerBlob);
    const voronoiWorker = new Worker(workerURL);

    let currentRenderID = 0;
    let previewCallbacks = {};
    let lastPiedras = [];

    voronoiWorker.onmessage = function (e) {
      const { type, id, payload } = e.data;
      if (type === 'error') { console.error('Voronoi Error:', payload.message); return; }

      if (String(id).startsWith('main_')) {
        if (id !== 'main_' + currentRenderID) return;
        lastPiedras = payload.piedras;
        drawCanvas(ctx, payload.piedras, layerColors.pasta.hex, canvas.width, canvas.height);
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) overlay.classList.remove('visible');
      } else if (String(id).startsWith('preview_')) {
        if (previewCallbacks[id]) {
          previewCallbacks[id](payload.piedras);
          delete previewCallbacks[id];
        }
      }
    };

    /* ══════════════════════════════════════
       getCapasForPattern — AHORA con colores independientes por capa
       Cada capa toma su color de layerColors, NO se derivan de un solo color.
       Las medidas de abertura/codigoTamano son las exactas de fábrica.
    ══════════════════════════════════════ */
    function getCapasForPattern(pattern, overrideColors) {
      const lc = overrideColors || layerColors;

      if (pattern === 'tradicional') {
        return {
          capas: [
            {
              id: 'c0', abertura: '3/4', codigoTamano: '5-6',
              densidad: grainGrueso / 100,
              colorNatural: lc.granoGrueso.hex,
              colorVar: 25
            },
            {
              id: 'c1', abertura: '1/4', codigoTamano: '3',
              densidad: grainMedio / 100,
              colorNatural: lc.granoMedio.hex,
              colorVar: 20
            },
            {
              id: 'c2', abertura: '1/8', codigoTamano: '0-2',
              densidad: grainFino / 100,
              colorNatural: lc.granoFino.hex,
              colorVar: 15
            }
          ],
          irreg: 1.0, offsetPasta: 1.0, distanciaFisica: 1.0
        };
      } else if (pattern === 'palladiana') {
        return {
          capas: [{
            id: 'p0', abertura: paramSize + 'mm', codigoTamano: '',
            densidad: 1.0,
            colorNatural: lc.fragmento.hex,
            colorVar: 30
          }],
          irreg: 1.8 + (paramIrreg / 100) * 1.2, offsetPasta: paramDensity * 1.5, distanciaFisica: paramDensity * 3.5
        };
      } else if (pattern === 'trencadis') {
        return {
          capas: [{
            id: 't0', abertura: Math.min(paramSize, 30) + 'mm', codigoTamano: '',
            densidad: 1.0,
            colorNatural: lc.fragmento.hex,
            colorVar: 35
          }],
          irreg: 2.5 + (paramIrreg / 100), offsetPasta: paramDensity * 1.5, distanciaFisica: paramDensity * 1.5
        };
      } else { /* opusincertum */
        return {
          capas: [{
            id: 'o0', abertura: paramSize + 'mm', codigoTamano: '',
            densidad: 0.9,
            colorNatural: lc.fragmento.hex,
            colorVar: 25
          }],
          irreg: 1.2 + (paramIrreg / 100) * 0.8, offsetPasta: paramDensity * 1.5, distanciaFisica: paramDensity * 1.5
        };
      }
    }

    function renderMain() {
      const overlay = document.getElementById('canvasOverlay');
      if (overlay) overlay.classList.add('visible');

      currentRenderID++;
      const idStr = 'main_' + currentRenderID;
      const config = getCapasForPattern(currentPattern);

      canvas.setAttribute('aria-label',
        `Previsualización: pasta ${layerColors.pasta.name}, patrón ${currentPatternLabel()}, tamaño ${currentSize}`);

      voronoiWorker.postMessage({
        type: 'render', id: idStr,
        payload: {
          width: W, height: H, seed: 42 + currentRenderID,
          offsetPasta: config.offsetPasta,
          distanciaFisica: config.distanciaFisica,
          irreg: config.irreg,
          escala: W / 300,
          capas: config.capas
        }
      });
    }

    // Deterministic RNG for stable per-stone texture
    function makePRNG(seed) {
      let s = seed >>> 0;
      return function () {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    const _bboxCache = new Map();
    function parseBbox(pathStr) {
      if (_bboxCache.has(pathStr)) return _bboxCache.get(pathStr);
      const nums = pathStr.match(/-?[\d.]+,-?[\d.]+/g) || [];
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const pair of nums) {
        const [x, y] = pair.split(',').map(Number);
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      const bb = { x0, y0, x1, y1 };
      _bboxCache.set(pathStr, bb);
      return bb;
    }

    function drawCanvas(ctxEl, piedras, pastaHex, w, h) {
      ctxEl.clearRect(0, 0, w, h);
      ctxEl.fillStyle = darken(pastaHex, 55);  // grout = darker version of pasta base
      ctxEl.fillRect(0, 0, w, h);

      const largeSurface = w * h > 200000;

      for (const p of piedras) {
        try {
          const path = new Path2D(p.pathStr);
          const bb = parseBbox(p.pathStr);
          const bw = bb.x1 - bb.x0, bh = bb.y1 - bb.y0;
          const rng = makePRNG(Math.round(bb.x0 * 7 + bb.y0 * 13) | 0);

          ctxEl.save();
          try {
            ctxEl.clip(path);

            // 1. Base fill (stone color from its own layer)
            ctxEl.globalAlpha = 0.92 + rng() * 0.08;
            ctxEl.fillStyle = p.colorHex;
            ctxEl.fill(path);

            // 2. Subtle diagonal gradient
            const rgb = hexToRgb(p.colorHex);
            const grd = ctxEl.createLinearGradient(bb.x0, bb.y0, bb.x1, bb.y1);
            grd.addColorStop(0, `rgba(${Math.min(255, rgb.r + 18)},${Math.min(255, rgb.g + 18)},${Math.min(255, rgb.b + 18)},0.25)`);
            grd.addColorStop(1, `rgba(${Math.max(0, rgb.r - 12)},${Math.max(0, rgb.g - 12)},${Math.max(0, rgb.b - 12)},0.20)`);
            ctxEl.fillStyle = grd;
            ctxEl.globalAlpha = 1.0;
            ctxEl.fill(path);

            // 3. Speckle/grain texture (mineral inclusions)
            const area = bw * bh;
            const maxSpeckles = largeSurface ? 40 : 12;
            const count = Math.min(Math.floor(area / 80) + 4, maxSpeckles);
            for (let s = 0; s < count; s++) {
              const sx = bb.x0 + rng() * bw;
              const sy = bb.y0 + rng() * bh;
              const sr = 0.4 + rng() * 1.2;
              const bright = rng() > 0.55;
              const alpha = 0.10 + rng() * 0.18;
              ctxEl.beginPath();
              ctxEl.arc(sx, sy, sr, 0, Math.PI * 2);
              ctxEl.fillStyle = bright ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha * 0.7})`;
              ctxEl.fill();
            }

            // 4. Highlight reflection spot (polished terrazzo)
            const hx = bb.x0 + bw * (0.3 + rng() * 0.4);
            const hy = bb.y0 + bh * 0.2;
            const hr = Math.max(1.5, bw * 0.18);
            const hGrd = ctxEl.createRadialGradient(hx, hy, 0, hx, hy, hr);
            hGrd.addColorStop(0, 'rgba(255,255,255,0.22)');
            hGrd.addColorStop(1, 'rgba(255,255,255,0.00)');
            ctxEl.fillStyle = hGrd;
            ctxEl.fill(path);
          } finally {
            ctxEl.restore();
          }

          // 5. Thin grout-shadow edge (outside clip)
          ctxEl.strokeStyle = darken(pastaHex, 40);
          ctxEl.lineWidth = 0.8;
          ctxEl.globalAlpha = 0.6;
          ctxEl.stroke(path);
          ctxEl.globalAlpha = 1.0;

        } catch (_) { }
      }
    }

    function currentPatternLabel() {
      const p = ALL_PATTERNS.find(p => p.key === currentPattern);
      return p ? p.label : currentPattern;
    }

    function scheduleRender() {
      if (animFrame) clearTimeout(animFrame);
      animFrame = setTimeout(renderMain, 50);
    }

    /* ── Mini preview para tarjetas de patrón ── */
    function renderPreview(canvasEl, patternKey, previewLayerColors) {
      const c = canvasEl.getContext('2d');
      canvasEl.width = canvasEl.parentElement.offsetWidth || 100;
      canvasEl.height = canvasEl.parentElement.offsetHeight || 44;
      const cw = canvasEl.width, ch = canvasEl.height;

      c.fillStyle = darken(previewLayerColors.pasta.hex, 50); c.fillRect(0, 0, cw, ch);

      const pid = 'preview_' + Math.random().toString(36).substring(2);
      const config = getCapasForPattern(patternKey, previewLayerColors);

      previewCallbacks[pid] = function (piedras) {
        drawCanvas(c, piedras, previewLayerColors.pasta.hex, cw, ch);
      };

      voronoiWorker.postMessage({
        type: 'render', id: pid,
        payload: {
          width: cw, height: ch, seed: 101,
          offsetPasta: config.offsetPasta * 0.5,
          escala: cw / 110,
          irreg: config.irreg,
          distanciaFisica: config.distanciaFisica * 0.4,
          capas: config.capas
        }
      });
    }

    /* ══════════════════════════════════════
       LAYER PANEL — construir lista de capas según patrón activo
    ══════════════════════════════════════ */
    function getVisibleLayers() {
      if (currentPattern === 'tradicional') {
        return ['pasta', 'granoGrueso', 'granoMedio', 'granoFino'];
      } else {
        return ['pasta', 'fragmento'];
      }
    }

    function buildLayerPanel() {
      const list = document.getElementById('layerList');
      list.innerHTML = '';
      const visible = getVisibleLayers();

      // If active layer is not visible for this pattern, switch to pasta
      if (!visible.includes(activeLayer)) {
        activeLayer = 'pasta';
      }

      visible.forEach(layerKey => {
        const def = LAYER_DEFS[layerKey];
        const lc = layerColors[layerKey];
        const isActive = layerKey === activeLayer;

        const row = document.createElement('div');
        row.className = 'layer-row' + (isActive ? ' active' : '');
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', isActive ? 'true' : 'false');
        row.setAttribute('data-layer', layerKey);
        row.setAttribute('tabindex', isActive ? '0' : '-1');
        row.setAttribute('aria-label', `${def.label}: ${lc.name} (${lc.hex})`);

        // Density badge for grain layers
        let badge = '';
        if (layerKey === 'granoGrueso') badge = `<span class="layer-density-badge">${grainGrueso}%</span>`;
        else if (layerKey === 'granoMedio') badge = `<span class="layer-density-badge">${grainMedio}%</span>`;
        else if (layerKey === 'granoFino') badge = `<span class="layer-density-badge">${grainFino}%</span>`;

        row.innerHTML = `
          <div class="layer-color-dot" style="background:${lc.hex}"></div>
          <div class="layer-info">
            <div class="layer-name">${def.icon} ${def.label}</div>
            <div class="layer-detail">${lc.name} · ${def.detail}</div>
          </div>
          ${badge}
        `;

        row.addEventListener('click', () => selectLayer(layerKey));
        row.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectLayer(layerKey); }
        });

        list.appendChild(row);
      });

      // Update the picker title
      updatePickerTitle();
      // Sync the swatch highlight to match the active layer's current color
      syncSwatchesToLayer();
      // Update spec panel layer colors
      updateSpecLayerColors();
    }

    function selectLayer(layerKey) {
      activeLayer = layerKey;
      // Update visual state
      document.querySelectorAll('.layer-row').forEach(r => {
        const isActive = r.dataset.layer === layerKey;
        r.classList.toggle('active', isActive);
        r.setAttribute('aria-selected', isActive ? 'true' : 'false');
        r.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      updatePickerTitle();
      syncSwatchesToLayer();
      // Hide custom panel when switching layers
      document.getElementById('colorCustomPanel').style.display = 'none';
      statusMsg(`Editando capa: ${LAYER_DEFS[layerKey].label}`);
    }

    function updatePickerTitle() {
      const nameEl = document.getElementById('layerPickerName');
      if (nameEl) nameEl.textContent = LAYER_DEFS[activeLayer].label;
    }

    function syncSwatchesToLayer() {
      const lc = layerColors[activeLayer];
      // Find which standard swatch matches the active layer's color
      const matchIndex = COLORS.findIndex(c => c.hex.toLowerCase() === lc.hex.toLowerCase());

      const allSwatches = document.querySelectorAll('.color-swatch:not(#swatchCustom)');
      allSwatches.forEach((s, j) => {
        const active = j === matchIndex;
        s.classList.toggle('active', active);
        s.setAttribute('aria-checked', active ? 'true' : 'false');
        s.setAttribute('tabindex', active ? '0' : '-1');
      });

      const sc = document.getElementById('swatchCustom');
      const isCustom = matchIndex < 0;
      sc.classList.toggle('active', isCustom);
      sc.setAttribute('aria-checked', isCustom ? 'true' : 'false');
      if (isCustom) {
        sc.style.background = lc.hex;
      }

      // Update color info display
      document.getElementById('colorDot').style.background = lc.hex;
      document.getElementById('colorName').textContent = lc.name;
      document.getElementById('colorCode').textContent = `${lc.hex} · ${lc.ref}`;
    }

    /* ══ RENDERIZAR TARJETAS DE PATRÓN según línea ══ */
    function buildPatternCards() {
      const group = document.getElementById('patternGroup');
      const lineData = LINES_DATA[currentLine];
      group.innerHTML = '';

      ALL_PATTERNS.forEach(p => {
        const available = lineData.patterns.includes(p.key);
        const isActive = p.key === currentPattern;

        const card = document.createElement('div');
        card.className = 'pattern-card' + (isActive ? ' active' : '') + (!available ? ' disabled' : '');
        card.setAttribute('role', 'radio');
        card.setAttribute('aria-checked', isActive ? 'true' : 'false');
        card.setAttribute('tabindex', !available ? '-1' : isActive ? '0' : '-1');
        card.setAttribute('data-pattern', p.key);
        card.setAttribute('aria-label',
          `Patrón ${p.label} — ${p.sub}` + (!available ? ' — no disponible en esta línea' : ''));
        if (!available) card.setAttribute('aria-disabled', 'true');

        card.innerHTML = `
      <div class="pattern-card__preview"><canvas></canvas></div>
      <div class="pattern-card__label">${p.label}<span class="pattern-card__sub">${p.sub}</span></div>
    `;

        if (available) {
          card.addEventListener('click', () => selectPattern(p.key));
          card.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPattern(p.key); }
          });
        }

        group.appendChild(card);

        setTimeout(() => renderPreview(card.querySelector('canvas'), p.key, layerColors), 10);
      });
    }

    /* ══ RENDERIZAR TAMAÑOS según línea ══ */
    function buildSizeChips() {
      const group = document.getElementById('sizeGroup');
      const lineData = LINES_DATA[currentLine];
      group.innerHTML = '';

      if (!lineData.sizes.includes(currentSize)) {
        currentSize = lineData.defaultSize;
      }

      ALL_SIZES.forEach(sz => {
        const available = lineData.sizes.includes(sz);
        if (!available) return;

        const chip = document.createElement('div');
        chip.className = 'size-chip' + (sz === currentSize ? ' active' : '');
        chip.setAttribute('role', 'radio');
        chip.setAttribute('aria-checked', sz === currentSize ? 'true' : 'false');
        chip.setAttribute('tabindex', sz === currentSize ? '0' : '-1');
        chip.setAttribute('aria-label', `${sz} centímetros`);
        chip.textContent = sz;
        chip.addEventListener('click', () => selectSize(sz));
        chip.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSize(sz); }
        });
        group.appendChild(chip);
      });
    }

    /* ══ RENDERIZAR CONTROLES DE GRANO / PARAMS ══ */
    function buildGrainSection() {
      const section = document.getElementById('grainSection');
      const label = document.getElementById('grainSectionLabel');
      const body = document.getElementById('grainBody');
      const pData = ALL_PATTERNS.find(p => p.key === currentPattern);
      const isGrain = pData && pData.hasGrain;

      document.getElementById('specGrainBars').style.display = isGrain ? '' : 'none';
      document.getElementById('specParamRows').style.display = isGrain ? 'none' : '';

      if (isGrain) {
        label.textContent = 'Composición de grano';
        body.innerHTML = `
      <div class="grain-sliders">
        <div class="grain-row">
          <div class="grain-header">
            <label class="grain-label" for="gFino">Grano fino <span style="font-size:9px;color:var(--text-muted);">(1/8" · 1.585mm)</span></label>
            <span class="grain-val" id="gFinoVal">${grainFino}%</span>
          </div>
          <input type="range" id="gFino" min="0" max="100" value="${grainFino}" step="5"
                 aria-label="Porcentaje de grano fino" aria-valuenow="${grainFino}"/>
        </div>
        <div class="grain-row">
          <div class="grain-header">
            <label class="grain-label" for="gMedio">Grano medio <span style="font-size:9px;color:var(--text-muted);">(1/4" · 3.175mm)</span></label>
            <span class="grain-val" id="gMedioVal">${grainMedio}%</span>
          </div>
          <input type="range" id="gMedio" min="0" max="100" value="${grainMedio}" step="5"
                 aria-label="Porcentaje de grano medio" aria-valuenow="${grainMedio}"/>
        </div>
        <div class="grain-row">
          <div class="grain-header">
            <label class="grain-label" for="gGrueso">Grano grueso <span style="font-size:9px;color:var(--text-muted);">(3/4" · 9.5mm)</span></label>
            <span class="grain-val" id="gGruesoVal">${grainGrueso}%</span>
          </div>
          <input type="range" id="gGrueso" min="0" max="100" value="${grainGrueso}" step="5"
                 aria-label="Porcentaje de grano grueso" aria-valuenow="${grainGrueso}"/>
        </div>
        <div class="grain-warn" id="grainWarn" role="alert" aria-live="assertive" style="display:none">
          <span aria-hidden="true">⚠</span>
          <span>La suma supera 100%. Ajusta los valores.</span>
        </div>
      </div>
    `;
        bindGrainSliders();
      } else {
        const patternNotes = {
          palladiana: 'Polígonos 5-8 lados, 20-55 px, estilo veneciano',
          trencadis: 'Rectángulos angulosos 6-18 px, estilo Gaudí',
          opusincertum: 'Formas libres de tamaño y orientación variable, estilo romano',
        };
        label.textContent = 'Parámetros de patrón';
        body.innerHTML = `
      <div class="param-rows">
        <div class="param-row">
          <div class="param-header">
            <label class="param-label" for="pSize">Tamaño de fragmento</label>
            <span class="param-val" id="pSizeVal">${paramSize} px</span>
          </div>
          <input type="range" id="pSize" min="8" max="70" value="${paramSize}" step="1"
                 aria-label="Tamaño de fragmento en píxeles" aria-valuenow="${paramSize}"/>
          <span class="param-note">${patternNotes[currentPattern] || ''}</span>
        </div>
        <div class="param-row">
          <div class="param-header">
            <label class="param-label" for="pIrreg">Irregularidad</label>
            <span class="param-val" id="pIrregVal">${paramIrreg}%</span>
          </div>
          <input type="range" id="pIrreg" min="0" max="100" value="${paramIrreg}" step="5"
                 aria-label="Nivel de irregularidad" aria-valuenow="${paramIrreg}"/>
          <span class="param-note">Variación de forma y tamaño</span>
        </div>
        <div class="param-row">
          <div class="param-header">
            <label class="param-label" for="pDensity">Junta entre fragmentos</label>
            <span class="param-val" id="pDensityVal">${paramDensity} px</span>
          </div>
          <input type="range" id="pDensity" min="1" max="8" value="${paramDensity}" step="1"
                 aria-label="Grosor de junta" aria-valuenow="${paramDensity}"/>
        </div>
      </div>
    `;
        bindParamSliders();
      }
    }

    function bindGrainSliders() {
      const bind = (id, valId, setter, barId, barLabelId) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function () {
          setter(+this.value);
          document.getElementById(valId).textContent = this.value + '%';
          this.setAttribute('aria-valuenow', this.value);
          if (barId) { document.getElementById(barId).style.width = this.value + '%'; }
          if (barLabelId) { document.getElementById(barLabelId).textContent = this.value + '%'; }
          const total = grainFino + grainMedio + grainGrueso;
          const warn = document.getElementById('grainWarn');
          if (warn) warn.style.display = total > 100 ? 'flex' : 'none';
          buildLayerPanel(); // Refresh density badges
          scheduleRender();
        });
      };
      bind('gFino', 'gFinoVal', v => { grainFino = v; }, 'barFino', 'barFinoLabel');
      bind('gMedio', 'gMedioVal', v => { grainMedio = v; }, 'barMedio', 'barMedioLabel');
      bind('gGrueso', 'gGruesoVal', v => { grainGrueso = v; }, 'barGrueso', 'barGruesoLabel');
    }

    function bindParamSliders() {
      const bind = (id, valId, suffix, setter, specId) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', function () {
          setter(+this.value);
          document.getElementById(valId).textContent = this.value + suffix;
          this.setAttribute('aria-valuenow', this.value);
          if (specId) { document.getElementById(specId).textContent = this.value + suffix; }
          scheduleRender();
        });
      };
      bind('pSize', 'pSizeVal', ' px', v => { paramSize = v; }, 'specFragVal');
      bind('pIrreg', 'pIrregVal', '%', v => { paramIrreg = v; }, 'specIrregVal');
      bind('pDensity', 'pDensityVal', ' px', v => { paramDensity = v; }, null);
    }

    /* ══ SELECCIONAR LÍNEA ══ */
    function selectLine(lineKey) {
      currentLine = lineKey;
      const lineData = LINES_DATA[lineKey];

      if (!lineData.patterns.includes(currentPattern)) {
        currentPattern = lineData.defaultPattern;
      }

      document.querySelectorAll('.line-tab').forEach(t => {
        const active = t.dataset.line === lineKey;
        t.classList.toggle('active', active);
        t.setAttribute('aria-checked', active ? 'true' : 'false');
      });

      buildPatternCards();
      buildSizeChips();
      buildGrainSection();
      buildLayerPanel();
      updateSpecPanel();
      updateCode();
      scheduleRender();
      statusMsg(`Línea ${lineData.name} seleccionada`);
    }

    /* ══ SELECCIONAR PATRÓN ══ */
    function selectPattern(patternKey) {
      currentPattern = patternKey;
      document.querySelectorAll('.pattern-card').forEach(c => {
        const active = c.dataset.pattern === patternKey;
        c.classList.toggle('active', active);
        c.setAttribute('aria-checked', active ? 'true' : 'false');
        c.setAttribute('tabindex', active ? '0' : '-1');
      });
      buildGrainSection();
      buildLayerPanel(); // Layers change depending on pattern (tradicional vs others)
      updateSpecPanel();
      updateCode();
      scheduleRender();
      statusMsg(`Patrón ${currentPatternLabel()} seleccionado`);
    }

    /* ══ SELECCIONAR TAMAÑO ══ */
    function selectSize(sz) {
      currentSize = sz;
      document.querySelectorAll('.size-chip').forEach(c => {
        const active = c.textContent === sz;
        c.classList.toggle('active', active);
        c.setAttribute('aria-checked', active ? 'true' : 'false');
      });
      document.getElementById('specSize').textContent = sz + ' cm';
      document.getElementById('specSizeRight').textContent = sz.replace('×', ' × ') + ' cm';
      updateCode();
      statusMsg(`Tamaño ${sz} cm seleccionado`);
    }

    /* ══ SELECCIONAR COLOR (para la capa activa) ══ */
    const swatches = document.querySelectorAll('.color-swatch:not(#swatchCustom)');
    swatches.forEach((sw, i) => {
      sw.addEventListener('click', () => selectColor(i));
      sw.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectColor(i); }
        if (e.key === 'ArrowRight') { e.preventDefault(); swatches[Math.min(i + 1, swatches.length - 1)].focus(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); swatches[Math.max(i - 1, 0)].focus(); }
        if (e.key === 'ArrowDown') { e.preventDefault(); swatches[Math.min(i + 4, swatches.length - 1)].focus(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); swatches[Math.max(i - 4, 0)].focus(); }
      });
    });

    function selectColor(i) {
      const color = COLORS[i];
      // Apply to the ACTIVE layer only
      layerColors[activeLayer] = { hex: color.hex, name: color.name, ref: color.ref };

      // Update swatches
      document.querySelectorAll('.color-swatch:not(#swatchCustom)').forEach((s, j) => {
        const active = j === i;
        s.classList.toggle('active', active);
        s.setAttribute('aria-checked', active ? 'true' : 'false');
        s.setAttribute('tabindex', active ? '0' : '-1');
      });
      // Hide custom panel and deselect custom swatch
      document.getElementById('colorCustomPanel').style.display = 'none';
      const sc = document.getElementById('swatchCustom');
      sc.classList.remove('active'); sc.setAttribute('aria-checked', 'false'); sc.setAttribute('tabindex', '-1');

      // Update color info
      document.getElementById('colorDot').style.background = color.hex;
      document.getElementById('colorName').textContent = color.name;
      document.getElementById('colorCode').textContent = `${color.hex} · ${color.ref}`;

      updateCode();
      buildLayerPanel(); // Refresh layer display with new color
      // Refresh pattern previews
      document.querySelectorAll('.pattern-card canvas').forEach((cv, idx) => {
        const patKey = ALL_PATTERNS[idx]?.key;
        if (patKey) renderPreview(cv, patKey, layerColors);
      });
      scheduleRender();
      statusMsg(`${LAYER_DEFS[activeLayer].label}: ${color.name}`);
    }

    /* ══ A11Y PERSISTENCIA Y TOGGLES ══ */
    function saveA11yState() {
      const state = {
        contrast: document.getElementById('btnContrast').getAttribute('aria-pressed') === 'true',
        textSize: document.getElementById('btnTextSize').getAttribute('aria-pressed') === 'true',
        flutter: document.getElementById('btnFlutter').getAttribute('aria-pressed') === 'true',
        cvd: currentCVD
      };
      localStorage.setItem('mexmos_a11y_state', JSON.stringify(state));
    }

    function loadA11yState() {
      const saved = localStorage.getItem('mexmos_a11y_state');
      if (saved) {
        try {
          const state = JSON.parse(saved);
          if (state.contrast) document.getElementById('btnContrast').click();
          if (state.textSize) document.getElementById('btnTextSize').click();
          if (state.flutter) document.getElementById('btnFlutter').click();
          if (state.cvd && state.cvd !== 'normal') {
            const pill = document.querySelector(`.cvd-pill[data-cvd="${state.cvd}"]`);
            if (pill) pill.click();
          }
        } catch (e) { }
      }
    }

    /* ══ CVD ══ */
    document.querySelectorAll('.cvd-pill').forEach(pill => {
      pill.addEventListener('click', function () {
        currentCVD = this.dataset.cvd;
        document.querySelectorAll('.cvd-pill').forEach(p => {
          p.classList.toggle('active', p === this);
          p.setAttribute('aria-pressed', p === this ? 'true' : 'false');
        });
        const mc = document.getElementById('mosaicContainer');
        mc.className = 'mosaic-canvas' + (currentCVD !== 'normal' ? ` cvd-${currentCVD}` : '');
        const lbl = document.getElementById('cvdLabel');
        const lbls = { normal: '', protan: 'Simulando: Protanopía', deuter: 'Simulando: Deuteranopía', tritan: 'Simulando: Tritanopía' };
        lbl.textContent = lbls[currentCVD];
        lbl.classList.toggle('visible', currentCVD !== 'normal');
        statusMsg(currentCVD === 'normal' ? 'Vista normal' : `Simulación ${currentCVD} activa`);
        saveA11yState();
      });
    });

    /* ══ UPDATE SPEC PANEL ══ */
    function updateSpecPanel() {
      document.getElementById('specLine').textContent = LINES_DATA[currentLine].name;
      document.getElementById('specPattern').textContent = currentPatternLabel();
      document.getElementById('specPatternStrip').textContent = currentPatternLabel();
      updateSpecLayerColors();
    }

    function updateSpecLayerColors() {
      const container = document.getElementById('specLayerColors');
      if (!container) return;
      const visible = getVisibleLayers();
      container.innerHTML = visible.map(key => {
        const def = LAYER_DEFS[key];
        const lc = layerColors[key];
        return `<div class="spec-row">
          <span class="spec-row__key" style="display:flex;align-items:center;gap:5px;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${lc.hex};border:1px solid rgba(0,0,0,0.15);"></span>
            ${def.label}
          </span>
          <span class="spec-row__val">${lc.name} <code style="font-size:9px;color:var(--text-muted);">${lc.hex}</code></span>
        </div>`;
      }).join('');
    }

    /* ══ UPDATE CODE ══ */
    function updateCode() {
      const lineAbbr = currentLine;
      const sizeCode = currentSize.replace('×', 'x');
      const colorAbbr = layerColors.pasta.name.substring(0, 3).toUpperCase();
      const patAbbr = { tradicional: 'TRAD', palladiana: 'PALL', trencadis: 'TREN', opusincertum: 'OPUS' }[currentPattern];
      document.getElementById('configCode').textContent = `TRZ-${lineAbbr}-${sizeCode}-${colorAbbr}-${patAbbr}`;
    }

    /* ══ LINE TABS EVENTS ══ */
    document.querySelectorAll('.line-tab').forEach(tab => {
      tab.addEventListener('click', () => selectLine(tab.dataset.line));
      tab.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectLine(tab.dataset.line); }
      });
    });

    document.getElementById('btnContrast').addEventListener('click', function () {
      const a = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', !a); this.classList.toggle('active');
      document.documentElement.style.setProperty('--text-secondary', a ? '#94A3B8' : '#C8D8E8');
      document.documentElement.style.setProperty('--text-muted', a ? '#5B7A99' : '#8BA8C0');
      statusMsg(a ? 'Contraste normal' : 'Alto contraste activado');
      saveA11yState();
    });
    document.getElementById('btnTextSize').addEventListener('click', function () {
      const a = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', !a); this.classList.toggle('active');
      document.body.style.fontSize = a ? '14px' : '16px';
      statusMsg(a ? 'Texto normal' : 'Texto grande activado');
      saveA11yState();
    });
    document.getElementById('btnFlutter').addEventListener('click', function () {
      const a = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', !a); this.classList.toggle('active');
      const o = document.getElementById('flutterOverlay');
      o.classList.toggle('visible', !a);
      o.setAttribute('aria-hidden', a ? 'true' : 'false');
      statusMsg(a ? 'Flutter oculto' : 'Flutter visible');
      saveA11yState();
    });

    /* ══ ZOOM ══ */
    let zoomLevel = 1.0;
    const ZOOM_MIN = 0.4, ZOOM_MAX = 3.0, ZOOM_STEP = 0.25;
    const mosaicCardEl = document.querySelector('.mosaic-card');

    function applyZoom() {
      mosaicCardEl.style.transform = `scale(${zoomLevel})`;
      mosaicCardEl.style.transformOrigin = 'center center';
      const pct = Math.round(zoomLevel * 100) + '%';
      const zi = document.getElementById('zoomIndicator');
      zi.textContent = pct;
      zi.setAttribute('aria-label', `Zoom ${pct}`);
    }

    document.getElementById('btnZoomIn').addEventListener('click', () => {
      zoomLevel = Math.min(ZOOM_MAX, +(zoomLevel + ZOOM_STEP).toFixed(2));
      applyZoom();
      statusMsg(`Zoom: ${Math.round(zoomLevel * 100)}%`);
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
      zoomLevel = Math.max(ZOOM_MIN, +(zoomLevel - ZOOM_STEP).toFixed(2));
      applyZoom();
      statusMsg(`Zoom: ${Math.round(zoomLevel * 100)}%`);
    });
    document.getElementById('btnZoomFit').addEventListener('click', () => {
      zoomLevel = 1.0;
      applyZoom();
      statusMsg('Zoom restablecido a 100%');
    });
    document.querySelector('.canvas-viewport').addEventListener('wheel', e => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomLevel = e.deltaY < 0
        ? Math.min(ZOOM_MAX, +(zoomLevel + ZOOM_STEP).toFixed(2))
        : Math.max(ZOOM_MIN, +(zoomLevel - ZOOM_STEP).toFixed(2));
      applyZoom();
    }, { passive: false });

    /* ══ COLOR PERSONALIZADO ══ */
    const swatchCustomEl = document.getElementById('swatchCustom');
    const customPanel = document.getElementById('colorCustomPanel');

    function hexFromRGB(r, g, b) {
      return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
    }
    function rgbFromHex(hex) {
      const h = hex.replace('#', '');
      return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
    }

    function syncCustomColor(hex) {
      hex = hex.toUpperCase();
      if (!/^#[0-9A-F]{6}$/.test(hex)) return;

      // Apply to the ACTIVE layer
      layerColors[activeLayer] = { hex: hex, name: 'Personalizado', ref: 'RGB personalizado' };

      swatchCustomEl.style.background = hex;
      document.getElementById('colorPickerNative').value = hex;
      document.getElementById('colorPickerHex').textContent = hex;
      const { r, g, b } = rgbFromHex(hex);
      document.getElementById('sliderR').value = r; document.getElementById('valR').textContent = r;
      document.getElementById('sliderG').value = g; document.getElementById('valG').textContent = g;
      document.getElementById('sliderB').value = b; document.getElementById('valB').textContent = b;

      // Update color info
      document.getElementById('colorDot').style.background = hex;
      document.getElementById('colorName').textContent = 'Personalizado';
      document.getElementById('colorCode').textContent = hex + ' · RGB';

      // Refresh layer panel, previews, and render
      buildLayerPanel();
      document.querySelectorAll('.pattern-card canvas').forEach((cv, idx) => {
        const patKey = ALL_PATTERNS[idx]?.key;
        if (patKey) renderPreview(cv, patKey, layerColors);
      });
      updateCode();
      scheduleRender();
    }

    swatchCustomEl.addEventListener('click', () => {
      // Deselect standard swatches
      swatches.forEach(s => {
        s.classList.remove('active');
        s.setAttribute('aria-checked', 'false');
        s.setAttribute('tabindex', '-1');
      });

      // Activate custom swatch
      swatchCustomEl.classList.add('active');
      swatchCustomEl.setAttribute('aria-checked', 'true');
      swatchCustomEl.setAttribute('tabindex', '0');

      // Show panel, pre-fill with the active layer's current color
      customPanel.style.display = 'block';
      const currentHex = layerColors[activeLayer].hex;
      swatchCustomEl.style.background = currentHex;
      document.getElementById('colorPickerNative').value = currentHex;
      document.getElementById('colorPickerHex').textContent = currentHex;
      const { r, g, b } = rgbFromHex(currentHex);
      document.getElementById('sliderR').value = r; document.getElementById('valR').textContent = r;
      document.getElementById('sliderG').value = g; document.getElementById('valG').textContent = g;
      document.getElementById('sliderB').value = b; document.getElementById('valB').textContent = b;

      // Open native picker
      document.getElementById('colorPickerNative').click();

      statusMsg(`Color personalizado para ${LAYER_DEFS[activeLayer].label}`);
    });
    swatchCustomEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); swatchCustomEl.click(); }
    });

    // Native color picker
    document.getElementById('colorPickerNative').addEventListener('input', function () {
      syncCustomColor(this.value);
    });

    // RGB sliders
    function bindRGBSlider(id, valId) {
      document.getElementById(id).addEventListener('input', function () {
        document.getElementById(valId).textContent = this.value;
        const r = +document.getElementById('sliderR').value;
        const g = +document.getElementById('sliderG').value;
        const b = +document.getElementById('sliderB').value;
        syncCustomColor(hexFromRGB(r, g, b));
      });
    }
    bindRGBSlider('sliderR', 'valR');
    bindRGBSlider('sliderG', 'valG');
    bindRGBSlider('sliderB', 'valB');

    // Hide custom panel when a standard swatch is selected
    swatches.forEach((sw) => {
      sw.addEventListener('click', () => {
        customPanel.style.display = 'none';
        swatchCustomEl.classList.remove('active');
        swatchCustomEl.setAttribute('aria-checked', 'false');
        swatchCustomEl.setAttribute('tabindex', '-1');
      });
    });

    /* ══ VISTA PREVIA (btnPreview) ══ */
    document.getElementById('btnPreview').addEventListener('click', function () {
      const dataURL = document.getElementById('mosaicCanvas').toDataURL('image/png');

      const design = {
        name: 'Diseño Actual',
        line: currentLine,
        pattern: currentPattern,
        size: currentSize,
        layerColors: JSON.parse(JSON.stringify(layerColors)),
        grainFino, grainMedio, grainGrueso,
        paramSize, paramIrreg, paramDensity,
        imgData: dataURL
      };
      localStorage.setItem('mexmos_active_design', JSON.stringify(design));
      statusMsg('Preparando Vista Previa...');
      setTimeout(() => { window.location.href = 'vista_previa.html'; }, 400);
    });

    /* ══ GUARDAR (btnPedido -> save) ══ */
    document.getElementById('btnPedido').addEventListener('click', function () {
      openDrawer();
      document.getElementById('creationName').focus();
      statusMsg('Escribe un nombre y presiona Guardar');
    });

    /* ══ PDF / IMPRIMIR ══ */
    document.getElementById('btnPDF').addEventListener('click', function () {
      const dataURL = canvas.toDataURL('image/png');
      const code = document.getElementById('configCode').textContent;
      const lineName = LINES_DATA[currentLine].name;
      const patLabel = currentPatternLabel();
      const sz = currentSize;

      // Build layer color rows for the PDF spec table
      const visible = getVisibleLayers();
      const layerRows = visible.map(key => {
        const def = LAYER_DEFS[key];
        const lc = layerColors[key];
        return `<tr><th>${def.label}</th><td><span class="swatch" style="background:${lc.hex};"></span>${lc.name} <code>${lc.hex}</code></td></tr>`;
      }).join('');

      const win = window.open('', '_blank', 'width=800,height=900');
      if (!win) { statusMsg('Permite ventanas emergentes para imprimir'); return; }
      win.document.write(`<!DOCTYPE html><html lang="es"><head>
  <meta charset="UTF-8"/>
  <title>Ficha Técnica — ${code}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a2e;background:#fff;padding:32px;}
    h1{font-size:22px;font-weight:800;letter-spacing:-.5px;margin-bottom:2px;}
    .sub{font-size:12px;color:#666;margin-bottom:24px;}
    .layout{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start;}
    img{width:100%;border-radius:8px;border:1px solid #eee;}
    table{width:100%;border-collapse:collapse;margin-top:0;}
    th,td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px;text-align:left;}
    th{color:#666;font-weight:500;width:45%;}
    td{font-weight:600;}
    code{font-size:10px;color:#888;font-family:monospace;}
    .code{font-family:monospace;font-size:13px;font-weight:700;background:#f5f2ec;
          padding:8px 12px;border-radius:6px;border-left:3px solid #C8741A;margin-top:16px;}
    .swatch{display:inline-block;width:14px;height:14px;border-radius:3px;
            border:1px solid #ccc;vertical-align:middle;margin-right:6px;}
    .section-title{font-size:13px;font-weight:700;margin-top:16px;margin-bottom:4px;color:#333;}
    footer{margin-top:28px;font-size:10px;color:#aaa;border-top:1px solid #eee;padding-top:12px;}
    @media print{body{padding:16px;}button{display:none;}}
  </style>
  </head><body>
  <h1>Mexicana de Mosaicos</h1>
  <div class="sub">Ficha técnica de diseño · ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
  <div class="layout">
    <div><img src="${dataURL}" alt="Previsualización del mosaico"/></div>
    <div>
      <table>
        <tr><th>Código</th><td><code style="font-size:13px;font-weight:700;">${code}</code></td></tr>
        <tr><th>Línea</th><td>${lineName}</td></tr>
        <tr><th>Patrón</th><td>${patLabel}</td></tr>
        <tr><th>Tamaño de pieza</th><td>${sz} cm</td></tr>
        <tr><th>Acabado</th><td>Pulido 400 grit</td></tr>
        <tr><th>Grosor</th><td>2.5 cm</td></tr>
        <tr><th>Resistencia</th><td>21.37 MPa</td></tr>
        <tr><th>Absorción</th><td>2.56%</td></tr>
      </table>
      <div class="section-title">Colores por capa</div>
      <table>${layerRows}</table>
      <div class="code">${code}</div>
    </div>
  </div>
  <footer>Mexicana de Mosaicos — Configurador Visual 2D · WCAG 2.1 AA · Documento generado automáticamente</footer>
  <script>window.onload=function(){window.print();}<\/script>
  </body></html>`);
      win.document.close();
      statusMsg('Preparando documento para imprimir…');
    });

    /* ══ MIS CREACIONES ══ */
    const drawer = document.getElementById('creacionesDrawer');
    const fab = document.getElementById('btnFab');

    fab.addEventListener('click', toggleDrawer);
    document.getElementById('btnCloseDrawer').addEventListener('click', closeDrawer);
    document.getElementById('btnGuardar').addEventListener('click', () => { openDrawer(); document.getElementById('creationName').focus(); });
    document.getElementById('btnSave').addEventListener('click', saveCreacion);

    function toggleDrawer() { drawer.classList.contains('open') ? closeDrawer() : openDrawer(); }
    function openDrawer() {
      drawer.classList.add('open');
      fab.setAttribute('aria-expanded', 'true');
      fab.textContent = '✕';
    }
    function closeDrawer() {
      drawer.classList.remove('open');
      fab.setAttribute('aria-expanded', 'false');
      fab.textContent = '♡';
    }

    function saveCreacion() {
      const nameEl = document.getElementById('creationName');
      const name = nameEl.value.trim() || `Diseño ${creaciones.length + 1}`;
      const dataURL = canvas.toDataURL('image/png');

      const cr = {
        id: 'CRE-' + Date.now(),
        name,
        owner: session ? session.email : 'unknown',
        // Store full layer colors for per-layer restore
        layerColors: JSON.parse(JSON.stringify(layerColors)),
        // Keep flat fields for backward compatibility with drawer display
        color: layerColors.pasta.hex,
        colorName: layerColors.pasta.name,
        pattern: currentPattern,
        line: currentLine, size: currentSize,
        grainFino, grainMedio, grainGrueso,
        grain: currentPattern === 'tradicional' ? `${grainFino}/${grainMedio}/${grainGrueso}` : '—',
        paramSize, paramIrreg, paramDensity,
        date: 'Hoy, ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        ts: Date.now(),
        code: document.getElementById('configCode').textContent,
        imgData: dataURL
      };

      if (typeof CreacionesStore !== 'undefined') {
        CreacionesStore.add(cr);
        creaciones = CreacionesStore.getByUser(session ? session.email : '');
      } else {
        creaciones.unshift(cr);
      }

      nameEl.value = '';
      const hint = document.getElementById('saveHint');
      hint.textContent = `✓ "${name}" guardado`;
      setTimeout(() => { hint.textContent = 'Guarda tu diseño para recuperarlo después'; }, 2500);
      renderDrawerList();
      statusMsg(`"${name}" guardado en Mis Creaciones`);
    }

    function renderDrawerList() {
      const list = document.getElementById('drawerList');
      const empty = document.getElementById('drawerEmpty');
      empty.style.display = creaciones.length ? 'none' : '';
      list.querySelectorAll('.creation-item').forEach(el => el.remove());
      creaciones.forEach(cr => {
        const item = document.createElement('div');
        item.className = 'creation-item';
        item.setAttribute('role', 'listitem');
        item.innerHTML = `
      <div class="creation-thumb"><canvas width="36" height="36"></canvas></div>
      <div class="creation-info">
        <div class="creation-name">${cr.name}</div>
        <div class="creation-meta">${ALL_PATTERNS.find(p => p.key === cr.pattern)?.label || cr.pattern} · ${cr.colorName} · ${cr.size}</div>
      </div>
      <button class="creation-load" aria-label="Cargar ${cr.name}">Cargar</button>
    `;
        const tc = item.querySelector('canvas');
        if (cr.imgData) {
          const img = new Image();
          img.onload = () => { tc.getContext('2d').drawImage(img, 0, 0, 36, 36); }
          img.src = cr.imgData;
        } else {
          renderPreview(tc, cr.pattern, layerColors);
        }

        item.querySelector('.creation-load').addEventListener('click', () => loadCreacion(cr));
        list.insertBefore(item, empty);
      });
    }

    function loadCreacion(cr) {
      selectLine(cr.line);
      selectPattern(cr.pattern);

      // Restore per-layer colors if available, otherwise fall back to single color
      if (cr.layerColors) {
        layerColors = JSON.parse(JSON.stringify(cr.layerColors));
      } else if (cr.color) {
        // Legacy: single color -> apply to all layers
        const ci = COLORS.findIndex(c => c.hex.toLowerCase() === cr.color.toLowerCase());
        const col = ci >= 0 ? COLORS[ci] : { hex: cr.color, name: cr.colorName || 'Personalizado', ref: 'RGB' };
        layerColors.pasta = { hex: col.hex, name: col.name, ref: col.ref || 'RGB' };
        layerColors.granoGrueso = { hex: lighten(col.hex, 15), name: col.name + ' claro', ref: col.ref || 'RGB' };
        layerColors.granoMedio = { hex: col.hex, name: col.name, ref: col.ref || 'RGB' };
        layerColors.granoFino = { hex: darken(col.hex, 18), name: col.name + ' oscuro', ref: col.ref || 'RGB' };
        layerColors.fragmento = { hex: col.hex, name: col.name, ref: col.ref || 'RGB' };
      }

      selectSize(cr.size);
      if (cr.pattern === 'tradicional') {
        grainFino = cr.grainFino || 35; grainMedio = cr.grainMedio || 50; grainGrueso = cr.grainGrueso || 15;
      } else {
        paramSize = cr.paramSize || 35; paramIrreg = cr.paramIrreg || 60; paramDensity = cr.paramDensity || 3;
      }
      buildGrainSection();
      buildLayerPanel();
      updateSpecPanel();
      updateCode();
      scheduleRender();
      closeDrawer();
      statusMsg(`"${cr.name}" cargado`);
    }

    /* ══ TOOLTIP DE CANVAS ══ */
    const tooltip = document.getElementById('canvasTooltip');
    const mosaicEl = document.getElementById('mosaicContainer');
    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      const cmX = ((x / rect.width) * 40).toFixed(1);
      const cmY = ((y / rect.height) * 40).toFixed(1);
      tooltip.textContent = `${cmX} × ${cmY} cm`;
      const mr = mosaicEl.getBoundingClientRect();
      tooltip.style.left = (e.clientX - mr.left + 10) + 'px';
      tooltip.style.top = (e.clientY - mr.top - 24) + 'px';
      tooltip.style.opacity = '1'; tooltip.setAttribute('aria-hidden', 'false');
    });
    canvas.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0'; tooltip.setAttribute('aria-hidden', 'true');
    });

    /* ══ ATAJOS DE TECLADO ══ */
    document.addEventListener('keydown', e => {
      if (e.key === 'p' || e.key === 'P') {
        const lineData = LINES_DATA[currentLine];
        const available = lineData.patterns;
        const idx = available.indexOf(currentPattern);
        selectPattern(available[(idx + 1) % available.length]);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); openDrawer();
        document.getElementById('creationName').focus();
      }
    });

    /* ══ STATUS MSG ══ */
    let msgTimer = null;
    function statusMsg(msg) {
      const el = document.getElementById('statusMsg');
      el.textContent = msg;
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => { el.textContent = ''; }, 3000);
    }

    function loadActiveDesign() {
      const raw = localStorage.getItem('mexmos_active_design');
      if (!raw) return;
      try {
        const d = JSON.parse(raw);

        if (d.line && LINES_DATA[d.line]) currentLine = d.line;

        if (d.pattern) {
          const lp = LINES_DATA[currentLine].patterns;
          currentPattern = lp.includes(d.pattern) ? d.pattern : lp[0];
        }

        // Restore per-layer colors
        if (d.layerColors) {
          layerColors = JSON.parse(JSON.stringify(d.layerColors));
        } else if (d.color) {
          // Legacy single color
          const ci = COLORS.findIndex(c => c.hex.toLowerCase() === d.color.toLowerCase());
          const col = ci >= 0 ? COLORS[ci] : { hex: d.color, name: d.colorName || 'Personalizado', ref: 'RGB' };
          layerColors.pasta = { hex: col.hex, name: col.name, ref: col.ref || 'RGB' };
          layerColors.fragmento = { hex: col.hex, name: col.name, ref: col.ref || 'RGB' };
        }

        if (d.size) {
          const sizeNorm = d.size.replace('x', '×');
          const ls = LINES_DATA[currentLine].sizes;
          currentSize = ls.includes(sizeNorm) ? sizeNorm : ls[0];
        }

        if (d.grainFino !== undefined) grainFino = d.grainFino;
        if (d.grainMedio !== undefined) grainMedio = d.grainMedio;
        if (d.grainGrueso !== undefined) grainGrueso = d.grainGrueso;
        if (d.paramSize !== undefined) paramSize = d.paramSize;
        if (d.paramIrreg !== undefined) paramIrreg = d.paramIrreg;
        if (d.paramDensity !== undefined) paramDensity = d.paramDensity;

        loadA11yState();
        buildPatternCards();
        buildSizeChips();
        buildGrainSection();
        buildLayerPanel();
        updateSpecPanel();
        updateCode();
        scheduleRender();

        statusMsg(`Diseño "${d.name}" cargado`);

      } catch (e) {
        console.error('Error cargando diseño activo:', e);
      }
    }

    /* ══ INIT ══ */
    loadA11yState();
    loadActiveDesign();

    if (!localStorage.getItem('mexmos_active_design')) {
      buildPatternCards();
      buildSizeChips();
      buildGrainSection();
      buildLayerPanel();
      updateSpecPanel();
      updateCode();
      scheduleRender();
    }
    renderDrawerList();
    setInterval(() => { if (!document.hidden) scheduleRender(); }, 5000);
