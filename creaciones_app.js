const session = requireAuth();
    if (session) {
      document.getElementById('userAvatar').textContent = session.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      document.getElementById('userAvatar').title = session.name + ' (Click para cerrar sesión)';
    }

    /* ════════════════════════
       DATA — Creaciones de muestra
       (en producción vendrían del backend privado del usuario)
    ════════════════════════ */
    const PATTERN_LABELS = {
      tradicional: 'Tradicional',
      palladiana: 'Palladiana',
      trencadis: 'Trencadís',
      opusincertum: 'Opus Incertum',
    };
    const LINE_NAMES = { TRAD: 'Línea Tradicional', 'L-64': 'Línea 64', COL: 'Línea Colonial' };

    let creaciones = (typeof CreacionesStore !== 'undefined' && session)
      ? CreacionesStore.getByUser(session.email)
      : [];


    /* ════════════════════════
       ESTADO
    ════════════════════════ */
    let viewMode = 'grid';  // 'grid' | 'list'
    let searchQuery = '';
    let sortKey = 'fecha-desc';
    let selectedId = null;
    let renameTarget = null;
    let deleteTarget = null;

    /* ════════════════════════
       CANVAS HELPERS
    ════════════════════════ */
    function jitter(v, p) { return v * (1 - p / 2 + Math.random() * p); }

    function drawMosaic(cv, pattern, color) {
      const ctx = cv.getContext('2d');
      const cw = cv.width || cv.offsetWidth || 200;
      const ch = cv.height || cv.offsetHeight || 200;
      cv.width = cw; cv.height = ch;

      switch (pattern) {
        case 'tradicional': {
          ctx.clearRect(0, 0, cw, ch);
          const T = 6, cols = Math.floor(cw / T), rows = Math.floor(ch / T);
          for (let r = 0; r < rows; r++) for (let c2 = 0; c2 < cols; c2++) {
            const wave = Math.sin((c2 / cols - 0.5) * 3 + (r / rows - 0.5) * 2) * 0.5 + 0.5;
            const v = Math.floor(wave * 24 - 12);
            ctx.fillStyle = v >= 0 ? lighten(color, v) : darken(color, -v);
            ctx.globalAlpha = 0.88 + Math.random() * 0.12;
            ctx.fillRect(c2 * T, r * T, T - 1, T - 1);
          }
          ctx.globalAlpha = 1;
          ctx.strokeStyle = 'rgba(0,0,0,0.04)'; ctx.lineWidth = 0.5;
          for (let x = 0; x <= cw; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke(); }
          for (let y = 0; y <= ch; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke(); }
          break;
        }
        case 'palladiana': {
          ctx.fillStyle = darken(color, 52); ctx.fillRect(0, 0, cw, ch);
          let x = 2, y = 2, safe = 0;
          while (y < ch && safe < 800) {
            safe++;
            const w = jitter(cw * 0.28, 0.65), h = jitter(ch * 0.24, 0.65);
            if (x + w > cw - 2) { x = 2; y += h + 2; continue; }
            if (y + h > ch) break;
            const sides = 5 + Math.floor(Math.random() * 4), cx2 = x + w / 2, cy2 = y + h / 2;
            const v = Math.floor(Math.random() * 28 - 14);
            ctx.fillStyle = v >= 0 ? lighten(color, v) : darken(color, -v);
            ctx.globalAlpha = 0.88 + Math.random() * 0.12;
            ctx.beginPath();
            for (let i = 0; i < sides; i++) {
              const a = (i / sides) * 2 * Math.PI + Math.random() * 0.38;
              const rx = (w / 2) * (0.7 + Math.random() * 0.5), ry = (h / 2) * (0.7 + Math.random() * 0.5);
              i === 0 ? ctx.moveTo(cx2 + rx * Math.cos(a), cy2 + ry * Math.sin(a)) : ctx.lineTo(cx2 + rx * Math.cos(a), cy2 + ry * Math.sin(a));
            }
            ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1; x += w + 2;
          }
          break;
        }
        case 'trencadis': {
          ctx.fillStyle = darken(color, 48); ctx.fillRect(0, 0, cw, ch);
          const base = Math.max(6, cw / 16);
          for (let y = 2; y < ch; y += base + 2) for (let x = 2; x < cw; x += base + 2) {
            const fw = jitter(base, 0.65), fh = jitter(base, 0.65);
            const angle = (Math.random() - 0.5) * (Math.PI / 4);
            const v = Math.floor(Math.random() * 36 - 18);
            ctx.fillStyle = v >= 0 ? lighten(color, v) : darken(color, -v);
            ctx.globalAlpha = 0.85 + Math.random() * 0.15;
            ctx.save(); ctx.translate(x + fw / 2, y + fh / 2); ctx.rotate(angle);
            ctx.fillRect(-fw / 2, -fh / 2, fw - 2, fh - 2);
            ctx.restore(); ctx.globalAlpha = 1;
          }
          break;
        }
        case 'opusincertum': {
          ctx.fillStyle = darken(color, 44); ctx.fillRect(0, 0, cw, ch);
          const count = Math.floor(cw * ch / 300);
          for (let i = 0; i < count; i++) {
            const px = Math.random() * cw, py = Math.random() * ch;
            const r1 = jitter(cw / 10, 0.85) * 0.8, r2 = jitter(ch / 10, 0.85) * 0.8;
            const sides = 3 + Math.floor(Math.random() * 5), rot = Math.random() * 2 * Math.PI;
            const v = Math.floor(Math.random() * 40 - 20);
            ctx.fillStyle = v >= 0 ? lighten(color, v) : darken(color, -v);
            ctx.globalAlpha = 0.82 + Math.random() * 0.18;
            ctx.beginPath();
            for (let j = 0; j < sides; j++) {
              const a = rot + (j / sides) * 2 * Math.PI;
              const ji = 0.65 + Math.random() * 0.7;
              j === 0 ? ctx.moveTo(px + r1 * ji * Math.cos(a), py + r2 * ji * Math.sin(a)) : ctx.lineTo(px + r1 * ji * Math.cos(a), py + r2 * ji * Math.sin(a));
            }
            ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
          }
          break;
        }
      }
    }

    /* ════════════════════════
       FILTER + SORT
    ════════════════════════ */
    function getFiltered() {
      let list = [...creaciones];

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        list = list.filter(c =>
          c.name.toLowerCase().includes(q) ||
          c.colorName.toLowerCase().includes(q) ||
          PATTERN_LABELS[c.pattern]?.toLowerCase().includes(q) ||
          LINE_NAMES[c.line]?.toLowerCase().includes(q)
        );
      }

      switch (sortKey) {
        case 'fecha-desc': list.sort((a, b) => b.ts - a.ts); break;
        case 'fecha-asc': list.sort((a, b) => a.ts - b.ts); break;
        case 'nombre-asc': list.sort((a, b) => a.name.localeCompare(b.name, 'es')); break;
        case 'nombre-desc': list.sort((a, b) => b.name.localeCompare(a.name, 'es')); break;
        case 'patron': list.sort((a, b) => a.pattern.localeCompare(b.pattern)); break;
      }

      return list;
    }

    function pintarMosaico(cv, item) { drawMosaic(cv, item.pattern, item.color); }


    /* ════════════════════════
       RENDER
    ════════════════════════ */
    function render() {
      const filtered = getFiltered();

      // Update count
      document.getElementById('resultsNum').textContent = filtered.length;
      document.getElementById('resultsLabel').textContent =
        filtered.length === 1 ? 'creación' : 'creaciones';

      // Empty state
      const empty = document.getElementById('emptyState');
      if (filtered.length === 0) {
        document.getElementById('itemsGrid').innerHTML = '';
        document.getElementById('itemsList').innerHTML = '';
        empty.classList.add('visible');
        document.getElementById('emptyTitle').textContent =
          searchQuery ? 'Sin resultados' : 'Aún no tienes creaciones';
        document.getElementById('emptySubtitle').textContent =
          searchQuery
            ? `No encontramos creaciones que coincidan con "${searchQuery}".`
            : 'Guarda tus diseños desde el Configurador Visual para verlos aquí. Cada configuración es privada y solo tú puedes verla.';
        setLive('Sin resultados');
        return;
      }
      empty.classList.remove('visible');

      if (viewMode === 'grid') renderGrid(filtered);
      else renderList(filtered);

      setLive(`${filtered.length} creacion${filtered.length !== 1 ? 'es' : ''}`);
    }

    function renderGrid(items) {
      const grid = document.getElementById('itemsGrid');
      const list = document.getElementById('itemsList');
      grid.style.display = ''; list.style.display = 'none';
      grid.innerHTML = '';

      items.forEach((item, i) => {
        const card = document.createElement('div');
        card.className = 'grid-card' + (item.id === selectedId ? ' selected' : '');
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label',
          `${item.name} — ${PATTERN_LABELS[item.pattern]} — ${item.colorName} — ${item.size} — Guardada ${item.date}`
        );
        card.style.animationDelay = (i * 0.04) + 's';

        card.innerHTML = `
      <div class="grid-card__thumb">
        <canvas></canvas>
        <div class="card-pat-badge">${PATTERN_LABELS[item.pattern]}</div>
        <div class="card-color-dot" style="background:${item.color};" aria-hidden="true"></div>
      </div>
      <div class="grid-card__body">
        <div class="grid-card__name" title="${item.name}">${item.name}</div>
        <div class="grid-card__meta">${item.date} · ${item.size}</div>
        <div class="grid-card__tags">
          <span class="tag tag--line">${item.line}</span>
          <span class="tag tag--pat">${PATTERN_LABELS[item.pattern]}</span>
          <span class="tag tag--size">${item.size}</span>
        </div>
      </div>
      <div class="grid-card__actions">
        <button class="card-action card-action--primary" data-action="load" aria-label="Cargar ${item.name} en el configurador">
          🎨 Cargar
        </button>
        <button class="card-action" data-action="rename" aria-label="Renombrar ${item.name}">
          ✏️
        </button>
        <button class="card-action card-action--danger" data-action="delete" aria-label="Eliminar ${item.name}">
          🗑
        </button>
      </div>
    `;

        // Render canvas after append
        grid.appendChild(card);
        const cv = card.querySelector('canvas');
        cv.width = cv.parentElement.offsetWidth || 220;
        cv.height = 120;
        setTimeout(() => drawMosaic(cv, item.pattern, item.color), 20 + i * 10);

        // Events
        card.addEventListener('click', e => {
          if (e.target.closest('[data-action]')) return;
          selectItem(item.id);
        });
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter') selectItem(item.id);
          if (e.key === 'Delete') openDeleteModal(item.id);
        });
        card.querySelector('[data-action="load"]').addEventListener('click', e => {
          e.stopPropagation(); loadInConfigurator(item);
        });
        card.querySelector('[data-action="rename"]').addEventListener('click', e => {
          e.stopPropagation(); openRenameModal(item.id);
        });
        card.querySelector('[data-action="delete"]').addEventListener('click', e => {
          e.stopPropagation(); openDeleteModal(item.id);
        });
      });
    }

    function renderList(items) {
      const grid = document.getElementById('itemsGrid');
      const list = document.getElementById('itemsList');
      grid.style.display = 'none'; list.style.display = '';
      list.innerHTML = '';

      items.forEach((item, i) => {
        const row = document.createElement('div');
        row.className = 'list-item' + (item.id === selectedId ? ' selected' : '');
        row.setAttribute('role', 'listitem');
        row.setAttribute('tabindex', '0');
        row.setAttribute('aria-label',
          `${item.name} — ${PATTERN_LABELS[item.pattern]} — ${item.colorName} — ${item.size}`
        );
        row.style.animationDelay = (i * 0.03) + 's';

        row.innerHTML = `
      <div class="list-item__thumb">
        <canvas width="60" height="60"></canvas>
      </div>
      <div class="list-item__info">
        <div class="list-item__name" title="${item.name}">${item.name}</div>
        <div class="list-item__tags">
          <span class="tag tag--line">${item.line}</span>
          <span class="tag tag--pat">${PATTERN_LABELS[item.pattern]}</span>
          <span class="tag tag--size">${item.size}</span>
        </div>
        <div class="list-item__meta">${item.date} · ${item.colorName}</div>
      </div>
      <div class="list-item__actions">
        <button class="list-action list-action--load" data-action="load"
                aria-label="Cargar ${item.name}" title="Cargar en configurador">🎨</button>
        <button class="list-action" data-action="rename"
                aria-label="Renombrar ${item.name}" title="Renombrar">✏️</button>
        <button class="list-action" data-action="pdfrow"
                aria-label="Descargar PDF de ${item.name}" title="Descargar PDF">📄</button>
        <button class="list-action list-action--danger" data-action="delete"
                aria-label="Eliminar ${item.name}" title="Eliminar">🗑</button>
      </div>
    `;

        list.appendChild(row);
        const cv = row.querySelector('canvas');
        setTimeout(() => drawMosaic(cv, item.pattern, item.color), 20 + i * 10);

        row.addEventListener('click', e => {
          if (e.target.closest('[data-action]')) return;
          selectItem(item.id);
        });
        row.addEventListener('keydown', e => {
          if (e.key === 'Enter') selectItem(item.id);
          if (e.key === 'Delete') openDeleteModal(item.id);
        });
        row.querySelector('[data-action="load"]').addEventListener('click', e => { e.stopPropagation(); loadInConfigurator(item); });
        row.querySelector('[data-action="rename"]').addEventListener('click', e => { e.stopPropagation(); openRenameModal(item.id); });
        row.querySelector('[data-action="pdfrow"]').addEventListener('click', e => { e.stopPropagation(); downloadPDF(item); });
        row.querySelector('[data-action="delete"]').addEventListener('click', e => { e.stopPropagation(); openDeleteModal(item.id); });
      });
    }

    /* ════════════════════════
       SELECT ITEM → open preview panel
    ════════════════════════ */
    function selectItem(id) {
      selectedId = id;
      const item = creaciones.find(c => c.id === id);
      if (!item) return;

      // Highlight selected
      document.querySelectorAll('.grid-card,.list-item').forEach(el => {
        el.classList.toggle('selected', el.getAttribute('aria-label')?.includes(item.name));
      });

      // Populate panel
      const panel = document.getElementById('previewPanel');
      panel.classList.remove('hidden');
      panel.removeAttribute('aria-hidden');
      document.getElementById('panelTitle').textContent = item.name;
      document.getElementById('pvName').textContent = item.name;
      document.getElementById('pvLine').textContent = LINE_NAMES[item.line];
      document.getElementById('pvPattern').textContent = PATTERN_LABELS[item.pattern];
      document.getElementById('pvColor').textContent = `${item.colorName} · ${item.color}`;
      document.getElementById('pvSize').textContent = item.size;
      document.getElementById('pvGrain').textContent = item.grain || '—';
      document.getElementById('pvDate').textContent = item.date;
      document.getElementById('pvCode').textContent = item.code;

      // Tags
      const tagsEl = document.getElementById('pvTags');
      tagsEl.innerHTML = `
    <span class="tag tag--line">${item.line}</span>
    <span class="tag tag--pat">${PATTERN_LABELS[item.pattern]}</span>
    <span class="tag tag--size">${item.size}</span>
  `;

      // Big canvas
      const cv = document.getElementById('previewCanvas');
      const body = cv.parentElement;
      cv.width = body.offsetWidth || 340;
      cv.height = body.offsetWidth || 340; // square
      setTimeout(() => drawMosaic(cv, item.pattern, item.color), 30);

      // Grain row visibility
      document.getElementById('pvGrainRow').style.display =
        item.pattern === 'tradicional' ? '' : 'none';

      // Panel CTA bindings (rebind)
      document.getElementById('pvBtnLoad').onclick = () => loadInConfigurator(item);
      document.getElementById('pvBtnPNG').onclick = () => downloadPNG(item);
      document.getElementById('pvBtnPDF').onclick = () => downloadPDF(item);
      document.getElementById('pvBtnDelete').onclick = () => openDeleteModal(item.id);

      setLive(`Previsualización: ${item.name}`);

      // Update flutter boxes
      updateFlutterBoxes();
    }

    function closePanel() {
      document.getElementById('previewPanel').classList.add('hidden');
      document.getElementById('previewPanel').setAttribute('aria-hidden', 'true');
      selectedId = null;
      document.querySelectorAll('.grid-card,.list-item').forEach(el => el.classList.remove('selected'));
    }

    /* ════════════════════════
       LOAD IN CONFIGURATOR
    ════════════════════════ */
    function loadInConfigurator(item) {
      showToast(`"${item.name}" cargado en el Configurador`);
      setLive(`${item.name} cargado en el configurador`);
    }

    /* ════════════════════════
       RENAME MODAL
    ════════════════════════ */
    function openRenameModal(id) {
      renameTarget = id;
      const item = creaciones.find(c => c.id === id);
      if (!item) return;
      const input = document.getElementById('renameInput');
      input.value = item.name;
      document.getElementById('renameModal').classList.add('open');
      setTimeout(() => { input.focus(); input.select(); }, 150);
    }
    document.getElementById('renameCancelBtn').addEventListener('click', () => {
      document.getElementById('renameModal').classList.remove('open');
      renameTarget = null;
    });
    document.getElementById('renameConfirmBtn').addEventListener('click', () => {
      if (!renameTarget) return;
      const newName = document.getElementById('renameInput').value.trim();
      if (!newName) return;
      const item = creaciones.find(c => c.id === renameTarget);
      if (item) {
        item.name = newName;
        

        document.getElementById('renameModal').classList.remove('open');
        render();
        // If this item is selected in panel, update panel title
        if (selectedId === renameTarget) {
          document.getElementById('pvName').textContent = newName;
          document.getElementById('panelTitle').textContent = newName;
        }
        showToast(`Renombrado a "${newName}"`);
        setLive(`Creación renombrada a ${newName}`);
      }
      renameTarget = null;
    });

    /* ════════════════════════
       DELETE MODAL
    ════════════════════════ */
    function openDeleteModal(id) {
      deleteTarget = id;
      const item = creaciones.find(c => c.id === id);
      document.getElementById('deleteModalSub').textContent =
        `¿Eliminar "${item?.name}"? Esta acción no se puede deshacer.`;
      document.getElementById('deleteModal').classList.add('open');
    }
    document.getElementById('deleteCancelBtn').addEventListener('click', () => {
      document.getElementById('deleteModal').classList.remove('open');
      deleteTarget = null;
    });
    document.getElementById('deleteConfirmBtn').addEventListener('click', () => {
      if (!deleteTarget) return;
      const item = creaciones.find(c => c.id === deleteTarget);
      // Borrar local y persistir DB
      

      document.getElementById('deleteModal').classList.remove('open');
      if (selectedId === deleteTarget) closePanel();
      render();
      showToast(`"${item?.name}" eliminada`);
      setLive(`Creación ${item?.name} eliminada`);
      deleteTarget = null;
    });

    /* Close modals on overlay click */
    ['renameModal', 'deleteModal'].forEach(id => {
      document.getElementById(id).addEventListener('click', function (e) {
        if (e.target === this) this.classList.remove('open');
      });
    });

    /* ════════════════════════
       DOWNLOAD PNG
    ════════════════════════ */
    function downloadPNG(item) {
      const cv = document.createElement('canvas');
      cv.width = 600; cv.height = 600;
      drawMosaic(cv, item.pattern, item.color);
      setTimeout(() => {
        const link = document.createElement('a');
        link.download = `${item.id}-${item.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.href = cv.toDataURL('image/png');
        link.click();
        showToast('Imagen PNG descargada');
        setLive('Imagen PNG descargada correctamente');
      }, 150);
    }

    /* ════════════════════════
       DOWNLOAD PDF
    ════════════════════════ */
    function downloadPDF(item) {
      // Render canvas at high res for PDF
      const cv = document.createElement('canvas');
      cv.width = 480; cv.height = 480;
      drawMosaic(cv, item.pattern, item.color);

      setTimeout(() => {
        const imgData = cv.toDataURL('image/png');
        const timestamp = new Date().toLocaleString('es-MX');
        const w = window.open('', '_blank');
        w.document.write(`<!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8"/><title>Ficha — ${item.name}</title>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet"/>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'DM Sans',sans-serif;color:#1A1A2E;background:#fff;padding:40px;}
        .header{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:3px solid #C8741A;padding-bottom:16px;margin-bottom:24px;}
        .mark{font-family:'Syne',sans-serif;font-size:28px;font-weight:800;color:#C8741A;}
        .brand-name{font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:#0D1B2A;}
        .brand-sub{font-size:10px;color:#5B7A99;text-transform:uppercase;letter-spacing:.08em;}
        .date-info{font-size:11px;color:#5B7A99;text-align:right;}
        h1{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;color:#0D1B2A;margin-bottom:20px;}
        .layout{display:grid;grid-template-columns:1fr 1fr;gap:32px;}
        .preview-img{width:100%;border-radius:10px;border:1px solid #DDD8CC;box-shadow:0 4px 16px rgba(0,0,0,.12);}
        .prev-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5B7A99;margin-bottom:8px;}
        .sec{margin-bottom:18px;}
        .sec h2{font-family:'Syne',sans-serif;font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#5B7A99;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #EDE9E0;}
        .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #F5F0EC;font-size:12px;}
        .row:last-child{border-bottom:none;}
        .key{color:#5B7A99;}.val{font-weight:500;color:#0D1B2A;font-family:monospace;}
        .val-hi{color:#C8741A;font-weight:700;}
        .footer{margin-top:32px;padding-top:12px;border-top:1px solid #DDD8CC;font-size:10px;color:#94A3B8;display:flex;justify-content:space-between;}
        .priv-badge{background:#EEF4FB;border:1px solid #A0C0E0;border-radius:20px;padding:3px 10px;font-size:10px;color:#1A4B8C;font-weight:600;}
      </style></head><body>
      <div class="header">
        <div><div class="mark">M</div><div class="brand-name">Mexicana de Mosaicos S.A. de C.V.</div><div class="brand-sub">Tizayuca, Hidalgo · 55 años</div></div>
        <div class="date-info"><strong>Ficha Técnica — Mis Creaciones</strong><br>Generada el ${timestamp}<br><br><span class="priv-badge">🔒 Registro privado</span></div>
      </div>
      <h1>${item.name}</h1>
      <div class="layout">
        <div><div class="prev-label">Vista previa del diseño</div><img class="preview-img" src="${imgData}" alt="Vista previa"/></div>
        <div>
          <div class="sec"><h2>Configuración</h2>
            <div class="row"><span class="key">Código</span><span class="val">${item.code}</span></div>
            <div class="row"><span class="key">Línea</span><span class="val val-hi">${LINE_NAMES[item.line]}</span></div>
            <div class="row"><span class="key">Patrón</span><span class="val val-hi">${PATTERN_LABELS[item.pattern]}</span></div>
            <div class="row"><span class="key">Color</span><span class="val">${item.colorName} · ${item.color}</span></div>
            <div class="row"><span class="key">Tamaño</span><span class="val">${item.size} cm</span></div>
            ${item.pattern === 'tradicional' ? `<div class="row"><span class="key">Grano (F/M/G)</span><span class="val val-hi">${item.grain}</span></div>` : ''}
          </div>
          <div class="sec"><h2>Especificaciones técnicas</h2>
            <div class="row"><span class="key">Resistencia</span><span class="val">21.37 MPa</span></div>
            <div class="row"><span class="key">Absorción sup.</span><span class="val">2.56%</span></div>
            <div class="row"><span class="key">Grosor</span><span class="val">2.5 cm</span></div>
            <div class="row"><span class="key">Peso aprox.</span><span class="val">~3.8 kg/pieza</span></div>
            <div class="row"><span class="key">Acabado</span><span class="val">Pulido 400 grit</span></div>
          </div>
          <div class="sec"><h2>Registro de usuario</h2>
            <div class="row"><span class="key">Guardada</span><span class="val">${item.date}</span></div>
            <div class="row"><span class="key">Usuario</span><span class="val">Hannia G.</span></div>
            <div class="row"><span class="key">Acceso</span><span class="val">Privado — solo el propietario</span></div>
          </div>
        </div>
      </div>
      <div class="footer">
        <span>Mexicana de Mosaicos S.A. de C.V. · Sistema de gestión privado · WCAG 2.1 AA</span>
        <span>${item.code}</span>
      </div>
      <script>window.onload=()=>window.print();<\/script>
    </body></html>`);
        w.document.close();
        showToast('Ficha PDF generada');
        setLive('Ficha técnica PDF generada');
      }, 150);
    }

    /* ════════════════════════
       SEARCH + SORT + VIEW
    ════════════════════════ */
    const searchInput = document.getElementById('searchInput');
    const btnClear = document.getElementById('btnClear');
    let searchTimer = null;

    searchInput.addEventListener('input', function () {
      searchQuery = this.value;
      btnClear.classList.toggle('visible', this.value.length > 0);
      clearTimeout(searchTimer);
      searchTimer = setTimeout(render, 200);
    });

    btnClear.addEventListener('click', () => {
      searchQuery = ''; searchInput.value = '';
      btnClear.classList.remove('visible');
      searchInput.focus(); render();
    });

    document.getElementById('sortSelect').addEventListener('change', function () {
      sortKey = this.value; render();
      setLive(`Ordenado por ${this.options[this.selectedIndex].text}`);
    });

    document.getElementById('btnViewGrid').addEventListener('click', () => {
      viewMode = 'grid';
      document.getElementById('btnViewGrid').classList.add('active');
      document.getElementById('btnViewList').classList.remove('active');
      document.getElementById('btnViewGrid').setAttribute('aria-pressed', 'true');
      document.getElementById('btnViewList').setAttribute('aria-pressed', 'false');
      render();
      setLive('Vista cuadrícula');
    });
    document.getElementById('btnViewList').addEventListener('click', () => {
      viewMode = 'list';
      document.getElementById('btnViewList').classList.add('active');
      document.getElementById('btnViewGrid').classList.remove('active');
      document.getElementById('btnViewList').setAttribute('aria-pressed', 'true');
      document.getElementById('btnViewGrid').setAttribute('aria-pressed', 'false');
      render();
      setLive('Vista lista');
    });

    /* Close panel */
    document.getElementById('btnClosePanel').addEventListener('click', closePanel);
    document.getElementById('btnEmptyCTA').addEventListener('click', () => showToast('Navegando al Configurador…'));

    /* ════════════════════════
       KEYBOARD SHORTCUTS
    ════════════════════════ */
    document.addEventListener('keydown', e => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault(); searchInput.focus();
      }
      if (e.key === 'Escape') {
        if (document.getElementById('renameModal').classList.contains('open')) {
          document.getElementById('renameModal').classList.remove('open');
        } else if (document.getElementById('deleteModal').classList.contains('open')) {
          document.getElementById('deleteModal').classList.remove('open');
        } else if (selectedId) {
          closePanel();
        } else if (document.activeElement === searchInput) {
          searchInput.value = ''; searchQuery = ''; btnClear.classList.remove('visible'); render(); searchInput.blur();
        }
      }
    });

    /* ════════════════════════
       A11Y
    ════════════════════════ */
    document.getElementById('btnContrast').addEventListener('click', function () {
      const a = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', !a); this.classList.toggle('active');
      document.documentElement.style.setProperty('--text-secondary', a ? '#94A3B8' : '#C8D8E8');
      document.documentElement.style.setProperty('--text-muted', a ? '#5B7A99' : '#8BA8C0');
      setLive(a ? 'Contraste normal' : 'Alto contraste activado');
    });
    document.getElementById('btnFlutter').addEventListener('click', function () {
      const a = this.getAttribute('aria-pressed') === 'true';
      this.setAttribute('aria-pressed', !a); this.classList.toggle('active');
      const o = document.getElementById('flutterOverlay');
      o.classList.toggle('visible', !a); o.setAttribute('aria-hidden', a ? 'true' : 'false');
      setLive(a ? 'Flutter oculto' : 'Flutter visible');
      updateFlutterBoxes();
    });

    /* ════════════════════════
       FLUTTER BOXES
    ════════════════════════ */
    function updateFlutterBoxes() {
      const ssb = document.querySelector('.search-sort-bar');
      const r = ssb?.getBoundingClientRect();
      if (r) {
        const fb = document.getElementById('flSearchBox');
        const gb = document.getElementById('flGridBox');
        fb.style.height = r.height + 'px';
        gb.style.top = (r.top + r.height) + 'px';
        gb.style.right = document.getElementById('previewPanel').classList.contains('hidden')
          ? '0' : '380px';
      }
    }

    /* Eliminados helpers de toast y live, se usan desde utils.js */

    /* ════════════════════════
       INIT
    ════════════════════════ */
    render();
    setTimeout(updateFlutterBoxes, 100);