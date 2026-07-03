// ─── MÓDULO OPOSICIONES ───

// Parsea YYYY-MM-DD como fecha local (evita desfase UTC en Spain UTC+2)
const oposLocalDate = str => str ? new Date(str + 'T00:00:00') : null;

async function loadOposiciones() {
  if (typeof opos_applySeed === 'function') opos_applySeed();
  radarInit(); // render inmediato desde localStorage, sin esperar al fetch

  // Render inmediato con datos locales para no quedarse en "Cargando..."
  const locales = getOposLocal();
  renderOposStats(locales);
  renderOposCountdown(locales);
  renderOposTable(locales);
  renderOposTimeline(locales);

  // Actualizar con datos del Sheet si están disponibles
  const rows = await fetchSheet(CONFIG.SHEETS.OPOSICIONES, 'Oposiciones!A:I');
  if (rows) {
    const sheetData = rowsToObjects(rows);
    const data = sheetData.length
      ? (locales.length ? [...sheetData, ...locales] : sheetData)
      : locales;
    renderOposStats(data);
    renderOposCountdown(data);
    renderOposTable(data);
    renderOposTimeline(data);
  }
}

/* ── Stats ── */
function renderOposStats(data) {
  document.getElementById('opos-n-total').textContent    = data.length || '0';
  document.getElementById('opos-n-activas').textContent  = data.filter(r =>
    ['ABIERTA','EN PROCESO'].includes((r.estado||'').toUpperCase())
  ).length || '0';
  document.getElementById('opos-n-seguimiento').textContent = data.filter(r =>
    ['EN SEGUIMIENTO','PREVISTA'].includes((r.estado||'').toUpperCase())
  ).length || '0';
  document.getElementById('opos-n-bolsa').textContent    = data.filter(r =>
    r.bolsa_entrada === true || r.bolsa_entrada === 'true'
  ).length || '0';

  const hoyStats = new Date(); hoyStats.setHours(0,0,0,0);
  const conFecha = data.filter(r => r.fecha_examen && oposLocalDate(r.fecha_examen) >= hoyStats)
    .sort((a,b) => oposLocalDate(a.fecha_examen) - oposLocalDate(b.fecha_examen));
  const proxEl = document.getElementById('opos-prox-fecha');

  // Unificar exámenes y fines de inscripción en una lista ordenada por fecha
  const eventos = [];
  data.forEach(r => {
    if (r.fecha_examen && oposLocalDate(r.fecha_examen) >= hoyStats)
      eventos.push({ fecha: r.fecha_examen, tipo: 'examen', conv: r.convocatoria });
    const _iKey = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g,'_');
    if (r.fecha_fin_inscr && oposLocalDate(r.fecha_fin_inscr) >= hoyStats && localStorage.getItem(_iKey) !== 'si')
      eventos.push({ fecha: r.fecha_fin_inscr, tipo: 'inscripcion', conv: r.convocatoria });
  });
  eventos.sort((a, b) => oposLocalDate(a.fecha) - oposLocalDate(b.fecha));

  if (!eventos.length) { proxEl.innerHTML = '—'; return; }

  // Mostrar solo los del día más próximo
  const nextFecha = eventos[0].fecha;
  const nextEventos = eventos.filter(e => e.fecha === nextFecha);
  const dias = Math.round((oposLocalDate(nextFecha) - hoyStats) / 86400000);
  const diasLabel = dias === 0 ? '<span style="color:var(--red);font-weight:700"> · ¡HOY!</span>'
                  : dias === 1 ? '<span style="color:var(--orange)"> · mañana</span>'
                  : `<span style="color:var(--text3)"> · en ${dias}d</span>`;
  const tipoIcon = nextEventos[0].tipo === 'examen' ? '📝 Examen' : '🔴 Fin inscripción';
  const tipoColor = nextEventos[0].tipo === 'examen' ? 'var(--yellow)' : 'var(--accent2)';

  let html = `<div style="font-size:.78rem;color:${tipoColor};font-weight:600;margin-bottom:2px">${tipoIcon}${diasLabel}</div>`;
  html += nextEventos.map(e =>
    `<div style="font-size:.68rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${formatFecha(nextFecha)} · ${e.conv}</div>`
  ).join('');

  // Si hay algo más después, mostrar el siguiente tipo diferente como preview
  const siguientes = eventos.filter(e => e.fecha !== nextFecha);
  if (siguientes.length) {
    const sig = siguientes[0];
    const sigDias = Math.round((oposLocalDate(sig.fecha) - hoyStats) / 86400000);
    const sigIcon = sig.tipo === 'examen' ? '📝' : '🔴';
    html += `<div style="font-size:.65rem;color:var(--text3);margin-top:5px;opacity:.6">${sigIcon} ${formatFecha(sig.fecha)} · ${sig.conv}${siguientes.filter(e=>e.fecha===sig.fecha).length > 1 ? ` +${siguientes.filter(e=>e.fecha===sig.fecha).length-1}` : ''}</div>`;
  }

  proxEl.innerHTML = html;
  const labelEl2 = document.getElementById('opos-prox-label');
  if (labelEl2) labelEl2.textContent = nextEventos[0].tipo === 'examen' ? 'Próximo examen' : 'Fin inscripción';

  const tasasTotal = data.reduce((sum, r) => {
    const val = parseFloat(r.tasa);
    return sum + (r.tasa_pagada === 'SI' && !isNaN(val) ? val : 0);
  }, 0);
  const tasasEl = document.getElementById('opos-tasas-total');
  if (tasasEl) tasasEl.textContent = tasasTotal > 0 ? `${tasasTotal.toFixed(2)} €` : '—';
}

/* ── Countdown ── */
function renderOposCountdown(data) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const cd = document.getElementById('opos-countdown');

  // Recoger todos los eventos futuros: exámenes y fines de inscripción
  const eventos = [];
  data.forEach(r => {
    if (r.fecha_examen && oposLocalDate(r.fecha_examen) >= hoy)
      eventos.push({ fecha: r.fecha_examen, tipo: 'examen', conv: r.convocatoria, hora: r.hora_examen, r });
    const _iKey = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g,'_');
    if (r.fecha_fin_inscr && oposLocalDate(r.fecha_fin_inscr) >= hoy && localStorage.getItem(_iKey) !== 'si')
      eventos.push({ fecha: r.fecha_fin_inscr, tipo: 'inscripcion', conv: r.convocatoria, r });
  });
  eventos.sort((a, b) => oposLocalDate(a.fecha) - oposLocalDate(b.fecha));

  if (!eventos.length) { cd.style.display = 'none'; return; }

  const next = eventos[0];
  const dias = Math.round((oposLocalDate(next.fecha) - hoy) / 86400000);
  const mismodia = eventos.filter(e => e.fecha === next.fecha && e.tipo === next.tipo);

  cd.style.display = 'flex';

  // Label dinámico según el tipo de evento
  const labelEl = document.querySelector('.opos-countdown-label');
  if (labelEl) labelEl.textContent = next.tipo === 'examen' ? 'PRÓXIMO EXAMEN' : 'FIN INSCRIPCIÓN';

  const nombreEl = document.getElementById('opos-cd-nombre');
  if (nombreEl) {
    if (mismodia.length > 1) {
      nombreEl.innerHTML = mismodia.map((e, i) =>
        `<div style="${i > 0 ? 'margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.1)' : ''}">${e.conv || '—'}</div>`
      ).join('');
    } else {
      nombreEl.textContent = next.conv || '—';
    }
  }

  const diasEl = document.getElementById('opos-cd-dias');
  if (dias === 0) {
    diasEl.innerHTML = '<span style="font-size:1.1rem;color:var(--red);animation:pulse 1s infinite">¡HOY!</span>';
  } else {
    diasEl.textContent = dias;
  }

  const horaEl = document.getElementById('opos-cd-hora');
  if (horaEl) {
    if (next.tipo === 'examen') {
      if (mismodia.length > 1) {
        horaEl.innerHTML = mismodia.filter(e => e.hora).map(e =>
          `<span style="margin-right:10px">🕐 ${e.hora}</span>`
        ).join('');
      } else {
        horaEl.textContent = next.hora ? `🕐 ${next.hora}` : '';
      }
    } else {
      horaEl.textContent = formatFecha(next.fecha);
    }
  }

  // Siguiente hito diferente
  const siguiente = eventos.find(e => e.fecha !== next.fecha || e.tipo !== next.tipo);
  const hitoEl = document.getElementById('opos-cd-hito');
  if (hitoEl) {
    if (siguiente) {
      const ds = Math.round((oposLocalDate(siguiente.fecha) - hoy) / 86400000);
      const icon = siguiente.tipo === 'examen' ? '📝' : '🔴';
      const label = siguiente.tipo === 'examen' ? 'Examen' : 'Fin inscr.';
      hitoEl.textContent = `${icon} ${label}: ${formatFecha(siguiente.fecha)} — en ${ds}d`;
    } else {
      hitoEl.textContent = '';
    }
  }
}

/* ── Tabla principal ── */
// Filtros activos (persisten mientras la sección está abierta)
window._oposFiltros = window._oposFiltros || { texto: '', fase: '', perfil: '', organismo: '' };

// Devuelve organismo y puesto derivados del campo convocatoria si no están explícitos
function _oposOrgPuesto(r) {
  const org = r.organismo || (r.convocatoria || '').split(' — ')[0]?.trim() || '';
  const pto = r.puesto    || (r.convocatoria || '').split(' — ')[1]?.trim() || '';
  return { org, pto };
}

/* ── Timeline de plazos ── */
function renderOposTimeline(data) {
  const el = document.getElementById('opos-timeline');
  if (!el) return;

  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const eventos = [];

  data.forEach(r => {
    const { pto } = _oposOrgPuesto(r);
    const nombre = pto || r.convocatoria || '—';
    const _iKey = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g,'_');
    const inscrita = localStorage.getItem(_iKey) === 'si';

    const add = (fecha, tipo, label, icon) => {
      if (!fecha) return;
      const d = oposLocalDate(fecha);
      if (d < hoy) return;
      const dias = Math.round((d - hoy) / 86400000);
      eventos.push({ fecha, d, tipo, label, icon, nombre, dias });
    };

    if (!inscrita) add(r.fecha_fin_inscr,   'inscr',     'Fin inscripción',  '🔴');
    add(r.fecha_examen,      'examen',    'Examen',           '📝');
    add(r.fecha_lista_prov,  'lista_prov','Lista provisional', '📋');
    add(r.fecha_alegaciones, 'alegac',    'Alegaciones',       '✏️');
    add(r.fecha_lista_def,   'lista_def', 'Lista definitiva',  '✅');
  });

  eventos.sort((a, b) => a.d - b.d);

  if (!eventos.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:2px 0">Sin plazos próximos.</p>';
    return;
  }

  el.innerHTML = eventos.slice(0, 15).map(ev => {
    const urgColor = ev.dias === 0 ? 'var(--red)'
                   : ev.dias <= 3 ? 'var(--accent2)'
                   : ev.dias <= 7 ? 'var(--orange)'
                   : ev.dias <= 14 ? 'var(--yellow)'
                   : 'var(--text3)';
    const diasLabel = ev.dias === 0 ? '¡HOY!' : ev.dias === 1 ? 'mañana' : `${ev.dias}d`;
    const borderLeft = ev.dias <= 7 ? `border-left:3px solid ${urgColor}` : 'border-left:3px solid var(--border2)';
    return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--bg3);${borderLeft};margin-bottom:6px">
      <div style="font-size:.88rem;flex-shrink:0">${ev.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:.79rem;font-weight:700;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ev.nombre}</div>
        <div style="font-size:.7rem;color:var(--text3);margin-top:1px">${ev.label} · ${formatFecha(ev.fecha)}</div>
      </div>
      <div style="font-size:.82rem;font-weight:800;color:${urgColor};flex-shrink:0">${diasLabel}</div>
    </div>`;
  }).join('');
}

function renderOposTable(data) {
  window._oposData = data;

  // ── Barra de filtros (se inyecta una sola vez) ──
  const wrap = document.getElementById('opos-table')?.closest('.card');
  if (wrap && !document.getElementById('opos-filtros-bar')) {
    const fases     = [...new Set(data.map(r => r.fase).filter(Boolean))].sort();
    const perfiles  = [...new Set(data.map(r => r.perfil).filter(Boolean))].sort();
    const organismos = [...new Set(data.map(r => _oposOrgPuesto(r).org).filter(Boolean))].sort();
    const bar = document.createElement('div');
    bar.id = 'opos-filtros-bar';
    bar.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center';
    bar.innerHTML = `
      <input id="opos-f-texto" type="text" placeholder="🔍 Buscar…"
        style="flex:1;min-width:140px;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:.83rem;font-family:inherit"
        oninput="opos_aplicarFiltros()" value="${window._oposFiltros.texto}">
      <select id="opos-f-organismo" onchange="opos_aplicarFiltros()"
        style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:.83rem;font-family:inherit">
        <option value="">Todos los organismos</option>
        ${organismos.map(o => `<option value="${o}" ${window._oposFiltros.organismo===o?'selected':''}>${o}</option>`).join('')}
      </select>
      <select id="opos-f-fase" onchange="opos_aplicarFiltros()"
        style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:.83rem;font-family:inherit">
        <option value="">Todas las fases</option>
        ${fases.map(f => `<option value="${f}" ${window._oposFiltros.fase===f?'selected':''}>${f}</option>`).join('')}
      </select>
      <select id="opos-f-perfil" onchange="opos_aplicarFiltros()"
        style="padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text1);font-size:.83rem;font-family:inherit">
        <option value="">Todos los perfiles</option>
        ${perfiles.map(p => `<option value="${p}" ${window._oposFiltros.perfil===p?'selected':''}>${p}</option>`).join('')}
      </select>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button onclick="opos_quickPerfil('YO')" style="padding:4px 10px;border-radius:99px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-size:.75rem;font-family:inherit" title="Solo convocatorias para Yo">Yo</button>
        <button onclick="opos_quickPerfil('KERMAN')" style="padding:4px 10px;border-radius:99px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-size:.75rem;font-family:inherit" title="Solo convocatorias para Kerman">Kerman</button>
        <button onclick="opos_quickPerfil('AMBOS')" style="padding:4px 10px;border-radius:99px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);cursor:pointer;font-size:.75rem;font-family:inherit" title="Solo convocatorias para ambos">Ambos</button>
      </div>
      <span id="opos-f-count" style="font-size:.78rem;color:var(--text3);white-space:nowrap"></span>
      <button onclick="opos_limpiarFiltros()"
        style="padding:5px 12px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text3);cursor:pointer;font-size:.78rem;font-family:inherit">
        ✕ Limpiar
      </button>`;
    wrap.querySelector('h3').after(bar);
  }

  opos_renderFiltered();
}

function opos_aplicarFiltros() {
  window._oposFiltros.texto     = document.getElementById('opos-f-texto')?.value.trim().toLowerCase() || '';
  window._oposFiltros.fase      = document.getElementById('opos-f-fase')?.value || '';
  window._oposFiltros.perfil    = document.getElementById('opos-f-perfil')?.value || '';
  window._oposFiltros.organismo = document.getElementById('opos-f-organismo')?.value || '';
  opos_renderFiltered();
}

function opos_limpiarFiltros() {
  window._oposFiltros = { texto: '', fase: '', perfil: '', organismo: '' };
  const t = document.getElementById('opos-f-texto');     if (t) t.value = '';
  const f = document.getElementById('opos-f-fase');      if (f) f.value = '';
  const p = document.getElementById('opos-f-perfil');    if (p) p.value = '';
  const o = document.getElementById('opos-f-organismo'); if (o) o.value = '';
  opos_renderFiltered();
}

function opos_quickPerfil(perfil) {
  window._oposFiltros.perfil = perfil;
  const sel = document.getElementById('opos-f-perfil');
  if (sel) sel.value = perfil;
  opos_renderFiltered();
}

function opos_renderFiltered() {
  const all   = window._oposData || [];
  const { texto, fase, perfil, organismo } = window._oposFiltros;
  const filtered = all.filter(r => {
    const { org, pto } = _oposOrgPuesto(r);
    if (texto  && !(r.convocatoria || '').toLowerCase().includes(texto) &&
                  !org.toLowerCase().includes(texto) && !pto.toLowerCase().includes(texto)) return false;
    if (fase      && r.fase   !== fase)     return false;
    if (perfil    && r.perfil !== perfil)   return false;
    if (organismo && org      !== organismo) return false;
    return true;
  });

  const count = document.getElementById('opos-f-count');
  if (count) count.textContent = filtered.length < all.length
    ? `${filtered.length} de ${all.length}`
    : `${all.length} convocatorias`;

  const tbody = document.getElementById('opos-tbody');
  if (!tbody) return;

  if (!filtered.length) {
    const hayFiltros = texto || fase || perfil || organismo;
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">${hayFiltros ? 'Sin resultados para ese filtro.' : 'Sin convocatorias registradas.'}</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((r, i) => {
    const realIdx = all.indexOf(r);
    const { org, pto } = _oposOrgPuesto(r);
    const meritosTotal = calcMeritosTotal(r);
    const itCheck = (typeof it_validarRequisitos === 'function' && r.req_it_txartelas?.length)
      ? it_validarRequisitos(r.req_it_txartelas) : null;
    const itBadge = itCheck
      ? (itCheck.ok
          ? '<span title="IT Txartela: requisitos cumplidos" style="color:var(--green);font-size:.8rem;margin-left:4px">🖥️✅</span>'
          : `<span title="IT Txartela: faltan ${itCheck.nombres.join(', ')}" style="color:var(--red);font-size:.8rem;margin-left:4px" onclick="event.stopPropagation()">🖥️⚠️</span>`)
      : '';
    const tipoBadge = r.tipo_proceso === 'libre'
      ? '<span class="badge badge--blue" style="font-size:.7rem">Libre</span>'
      : (r.tipo_proceso === 'concurso' || r.tipo_proceso === 'concurso-oposicion')
        ? '<span class="badge badge--yellow" style="font-size:.7rem">C-O</span>'
        : '';
    const _iKey = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g,'_');
    const _iVal = localStorage.getItem(_iKey) || '';
    const inscrBadge = _iVal === 'si'        ? '<span title="Inscrita" style="color:var(--green);font-size:.78rem;margin-left:4px">✍️✅</span>'
                     : _iVal === 'pendiente' ? '<span title="Inscripción pendiente" style="color:var(--yellow);font-size:.78rem;margin-left:4px">✍️⏳</span>'
                     : '';
    // Urgency: inscription deadline < 7 days and not yet inscribed
    const hoyRow = new Date(); hoyRow.setHours(0,0,0,0);
    const _iKeyRow = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g,'_');
    const urgente = r.fecha_fin_inscr && localStorage.getItem(_iKeyRow) !== 'si' &&
      (() => { const d = oposLocalDate(r.fecha_fin_inscr); return d >= hoyRow && Math.round((d - hoyRow)/86400000) <= 7; })();
    const examenPasadoRow = r.fecha_examen && oposLocalDate(r.fecha_examen) < hoyRow;
    const rowStyle = urgente
      ? 'cursor:pointer;border-left:3px solid var(--accent2);background:var(--accent2)08'
      : 'cursor:pointer';
    return `
    <tr class="opos-row" onclick="toggleOposDetalle(${realIdx}, this)" data-idx="${realIdx}" style="${rowStyle}">
      <td data-label="Perfil">${badgePerfil(r.perfil)}</td>
      <td data-label="Convocatoria">
        <div style="font-weight:700;line-height:1.3">${pto || r.convocatoria || '—'} ${itBadge}${inscrBadge}</div>
        <div style="font-size:.74rem;color:var(--text3);margin-top:2px">${org || ''} ${tipoBadge}</div>
      </td>
      <td data-label="Grupo">${r.grupo || '—'}</td>
      <td data-label="Estado">${examenPasadoRow ? '<span class="badge badge--yellow" title="Examen ya realizado">⚡ Pdte. notas</span>' : badgeEstado(r.estado)}</td>
      <td data-label="Examen">${r.fecha_examen ? formatFecha(r.fecha_examen) : '—'}</td>
      <td data-label="Tasa">${r.tasa_pagada === 'SI' ? '<span class="badge badge--green">✓ Pagada</span>' : r.tasa_pagada === 'NO' ? '<span class="badge badge--red">✗ No</span>' : '—'}</td>
      <td data-label="Bolsa">${r.bolsa_entrada === true || r.bolsa_entrada === 'true' ? `<span class="badge badge--green">Sí ${r.bolsa_posicion ? '#'+r.bolsa_posicion : ''}</span>` : '<span class="badge badge--yellow">—</span>'}</td>
      <td data-label="Méritos">${meritosTotal > 0 ? `<span style="color:var(--accent2);font-weight:700">${meritosTotal.toFixed(2)} pts</span>` : r.tipo_proceso === 'libre' ? '<span style="color:var(--text3);font-size:.75rem">Libre</span>' : '—'}</td>
      <td data-label="Fase">${r.fase ? `<span class="chip">${r.fase}</span>` : '—'}</td>
    </tr>
    <tr class="opos-detalle-row hidden" id="opos-det-${realIdx}">
      <td colspan="9" style="padding:0">${renderDetalleHTML(r, realIdx)}</td>
    </tr>`;
  }).join('');
}

/* ── Detalle expandible ── */
function toggleOposDetalle(i, tr) {
  const det = document.getElementById('opos-det-' + i);
  if (!det) return;
  const isOpen = !det.classList.contains('hidden');
  // Cierra todos
  document.querySelectorAll('.opos-detalle-row').forEach(r => r.classList.add('hidden'));
  document.querySelectorAll('.opos-row').forEach(r => r.classList.remove('opos-row--active'));
  if (!isOpen) {
    det.classList.remove('hidden');
    tr.classList.add('opos-row--active');
    // Activar primera tab del detalle
    activarTabDetalle(i, 'fechas');
  }
}

function activarTabDetalle(idx, tab) {
  const det = document.getElementById('opos-det-' + idx);
  if (!det) return;
  det.querySelectorAll('.det-tab').forEach(t => t.classList.remove('active'));
  det.querySelectorAll('.det-panel').forEach(p => p.classList.remove('active'));
  const t = det.querySelector(`[data-detab="${tab}"]`);
  const p = det.querySelector(`#det-${tab}-${idx}`);
  if (t) t.classList.add('active');
  if (p) p.classList.add('active');
}

function renderDetalleHTML(r, i) {
  return `
  <div class="opos-detalle">
    <div class="det-tabs">
      <button class="det-tab active" data-detab="fechas"    onclick="activarTabDetalle(${i},'fechas')">📅 Fechas</button>
      <button class="det-tab"        data-detab="docs"      onclick="activarTabDetalle(${i},'docs')">📁 Documentación</button>
      <button class="det-tab"        data-detab="meritos"   onclick="activarTabDetalle(${i},'meritos')">⭐ Méritos</button>
      <button class="det-tab"        data-detab="bolsa"     onclick="activarTabDetalle(${i},'bolsa')">📋 Bolsa</button>
      <button class="det-tab"        data-detab="enlaces"   onclick="activarTabDetalle(${i},'enlaces')">🔗 Enlaces</button>
      <button class="det-tab"        data-detab="historial" onclick="activarTabDetalle(${i},'historial')">🕐 Historial</button>
    </div>

    <!-- FECHAS -->
    <div class="det-panel active" id="det-fechas-${i}">
      ${renderFechasPanel(r)}
    </div>

    <!-- DOCS -->
    <div class="det-panel" id="det-docs-${i}">
      ${renderDocsPanel(r)}
    </div>

    <!-- MÉRITOS -->
    <div class="det-panel" id="det-meritos-${i}">
      ${renderMeritosPanel(r, i)}
    </div>

    <!-- BOLSA -->
    <div class="det-panel" id="det-bolsa-${i}">
      ${renderBolsaPanel(r)}
    </div>

    <!-- ENLACES -->
    <div class="det-panel" id="det-enlaces-${i}">
      ${renderEnlacesPanel(r)}
    </div>

    <!-- HISTORIAL -->
    <div class="det-panel" id="det-historial-${i}">
      ${renderHistorialPanel(r, i)}
    </div>
  </div>`;
}

/* ── Panel: Fechas ── */
function renderFechasPanel(r) {
  const inscrKey = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g,'_');
  const inscrVal = localStorage.getItem(inscrKey) || '';
  const _ib = (v, label, col, bg) => `<button data-inscr-key="${inscrKey}" data-inscr-val="${v}"
    onclick="opos_setInscrita('${inscrKey}','${v}')"
    style="padding:7px 16px;border-radius:8px;border:2px solid ${inscrVal===v?col:'var(--border)'};background:${inscrVal===v?bg:'var(--bg4)'};color:${inscrVal===v?col:'var(--text2)'};cursor:pointer;font-size:.85rem;font-weight:${inscrVal===v?'700':'400'};font-family:inherit">${label}</button>`;

  const fechas = [
    { label: 'Apertura inscripción',  val: r.fecha_apertura,    icon: '🟢' },
    { label: 'Fin inscripción',       val: r.fecha_fin_inscr,   icon: '🔴' },
    { label: 'Lista provisional',     val: r.fecha_lista_prov,  icon: '📄', extra: r.nota_provisional ? `📊 ${r.nota_provisional}` : null },
    { label: 'Alegaciones',           val: r.fecha_alegaciones, icon: '✍️' },
    { label: 'Lista definitiva',      val: r.fecha_lista_def,   icon: '✅', extra: r.nota_definitiva ? `🏆 ${r.nota_definitiva}` : null },
    { label: 'Examen',                val: r.fecha_examen,      icon: '📝', extra: notaGuardada ? `📊 ${notaGuardada}` : r.hora_examen ? `🕐 ${r.hora_examen}` : null },
  ];
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  // Ubicación del examen (guardada en localStorage por convocatoria)
  const ubKey   = 'opos_ubicacion_' + (r.convocatoria || '').replace(/\s+/g,'_');
  const ub      = Store.get(ubKey);
  const notaKey = 'opos_nota_' + (r.convocatoria || '').replace(/\s+/g,'_');
  const notaGuardada = localStorage.getItem(notaKey) || '';

  // Si un hito posterior tiene fecha pasada, los hitos anteriores sin fecha se marcan como superados
  const primerFuturoIdx = fechas.findIndex(f => {
    const d = f.val ? oposLocalDate(f.val) : null;
    return d && d >= hoy;
  });

  return `
  <div style="margin-bottom:14px;padding:14px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
    <div style="font-weight:700;font-size:.82rem;color:var(--accent2);margin-bottom:10px">✍️ ¿Te has inscrito?</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      ${_ib('si','✅ Sí','var(--green)','#00ff0022')}
      ${_ib('no','❌ No','var(--red)','#ff000022')}
      ${_ib('pendiente','⏳ Pendiente','var(--yellow)','#f59e0b22')}
    </div>
  </div>

  <div class="det-fechas-grid">
    ${fechas.map((f, fi) => {
      const d = f.val ? oposLocalDate(f.val) : null;
      const pasado    = d && d < hoy;
      const hoyEs     = d && d.getTime() === hoy.getTime();
      const dias      = d ? Math.round((d - hoy) / 86400000) : null;
      // Sin fecha pero inferimos que ya pasó: hay hitos posteriores con fecha futura
      const superado  = !f.val && primerFuturoIdx > 0 && fi < primerFuturoIdx;
      return `
      <div class="det-fecha-card ${pasado || superado ? 'pasado' : hoyEs ? 'hoy' : f.val ? 'futuro' : 'vacio'}" style="${superado ? 'opacity:.5' : ''}">
        <span class="det-fecha-icon">${pasado || superado ? '✓' : f.icon}</span>
        <div class="det-fecha-info">
          <div class="det-fecha-label">${f.label}</div>
          <div class="det-fecha-val">${f.val ? formatFecha(f.val) : superado ? 'Superado' : '—'}</div>
          ${f.extra ? `<div class="det-fecha-dias" style="color:var(--text2)">${f.extra}</div>` : ''}
          ${d && !pasado && !hoyEs && dias !== null ? `<div class="det-fecha-dias">${'en '+dias+' día'+(dias===1?'':'s')}</div>` : ''}
          ${hoyEs ? '<div class="det-fecha-dias" style="color:var(--green);font-weight:700">¡Hoy!</div>' : ''}
          ${pasado ? '<div class="det-fecha-dias pasado-txt">Pasado</div>' : ''}
        </div>
      </div>`;
    }).join('')}
  </div>

  ${r.fecha_examen ? `
  <div style="margin-top:14px;padding:14px 16px;background:var(--bg3);border-radius:10px;border:1px solid ${notaGuardada ? 'var(--accent2)44' : 'var(--border)'}">
    <div style="font-weight:700;font-size:.82rem;color:var(--accent2);margin-bottom:10px">📊 Nota del examen</div>
    ${notaGuardada ? `<div style="font-size:1.1rem;font-weight:800;color:var(--green);margin-bottom:10px">${notaGuardada}</div>` : ''}
    <div style="display:flex;gap:8px;align-items:center">
      <input type="text" id="nota-examen-input" placeholder="Ej: 35.50 / 60 ó 7.25" value="${notaGuardada}"
        style="flex:1;background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:7px 10px;font-family:inherit;font-size:.85rem;outline:none" />
      <button onclick="opos_guardarNota('${(r.convocatoria||'').replace(/'/g,"\\'")}','${notaKey}')"
        style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:7px 16px;cursor:pointer;font-weight:600;font-size:.8rem;font-family:inherit;white-space:nowrap">
        💾 Guardar
      </button>
    </div>
  </div>` : ''}

  ${r.notas ? `
  <div style="margin-top:14px;padding:14px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
    <div style="font-weight:700;font-size:.82rem;color:var(--accent2);margin-bottom:8px">📋 Bases / Baremo</div>
    <div style="font-size:.81rem;color:var(--text2);line-height:1.55">${r.notas}</div>
  </div>` : ''}

  <div style="margin-top:14px;padding:14px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
    <div style="font-weight:700;font-size:.82rem;color:var(--accent2);margin-bottom:10px">📍 Ubicación el día del examen</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div class="form-group" style="margin:0">
        <label style="font-size:.72rem">Lugar / Recinto</label>
        <input type="text" id="ub-lugar" placeholder="Ej: BEC Barakaldo" value="${ub.lugar||''}"
          style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:7px 10px;font-family:inherit;font-size:.82rem;width:100%;outline:none" />
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:.72rem">Pabellón / Sala</label>
        <input type="text" id="ub-pabellon" placeholder="Ej: Pabellón 3" value="${ub.pabellon||''}"
          style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:7px 10px;font-family:inherit;font-size:.82rem;width:100%;outline:none" />
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:.72rem">Aula</label>
        <input type="text" id="ub-aula" placeholder="Ej: Aula 12-B" value="${ub.aula||''}"
          style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:7px 10px;font-family:inherit;font-size:.82rem;width:100%;outline:none" />
      </div>
      <div class="form-group" style="margin:0">
        <label style="font-size:.72rem">Número de asiento</label>
        <input type="text" id="ub-asiento" placeholder="Ej: 247" value="${ub.asiento||''}"
          style="background:var(--bg4);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:7px 10px;font-family:inherit;font-size:.82rem;width:100%;outline:none" />
      </div>
    </div>
    <button onclick="guardarUbicacionExamen('${(r.convocatoria||'').replace(/'/g,"\\'")}','${ubKey}')"
      style="margin-top:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;padding:7px 18px;cursor:pointer;font-weight:600;font-size:.8rem;font-family:inherit">
      💾 Guardar ubicación
    </button>
    ${ub.lugar ? `<div style="margin-top:8px;font-size:.75rem;color:var(--green)">✓ Guardado: ${[ub.lugar,ub.pabellon,ub.aula,ub.asiento].filter(Boolean).join(' · ')}</div>` : ''}
  </div>`;
}

/* ── Panel: Documentación ── */
/* helpers docs extra */
function _docsExtKey(r) { return 'opos_docs_ext_' + (r.convocatoria||'').replace(/\s+/g,'_'); }
function _getDocsExt(r) { return Store.get(_docsExtKey(r), []); }

function opos_docExtEstado(convKey, idx, val) {
  const docs = Store.get('opos_docs_ext_' + convKey, []);
  if (docs[idx]) { docs[idx].estado = val; Store.set('opos_docs_ext_' + convKey, docs); }
  const badge = document.getElementById(`opos-dext-badge-${convKey}-${idx}`);
  if (badge) { badge.textContent = val || '—'; badge.className = 'badge ' + (_docEstadoCls(val)); }
}
function opos_docExtRemove(convKey, idx) {
  const docs = Store.get('opos_docs_ext_' + convKey, []);
  docs.splice(idx, 1);
  Store.set('opos_docs_ext_' + convKey, docs);
  const row = document.getElementById(`opos-dext-row-${convKey}-${idx}`);
  if (row) row.remove();
}
function opos_docExtAdd(convKey) {
  const inp = document.getElementById('opos-dext-input-' + convKey);
  const nombre = inp?.value.trim();
  if (!nombre) return;
  const docs = Store.get('opos_docs_ext_' + convKey, []);
  docs.push({ nombre, estado: '' });
  Store.set('opos_docs_ext_' + convKey, docs);
  inp.value = '';
  const list = document.getElementById('opos-dext-list-' + convKey);
  if (list) {
    const idx = docs.length - 1;
    const div = document.createElement('div');
    div.id = `opos-dext-row-${convKey}-${idx}`;
    div.innerHTML = _docExtRowHTML(convKey, { nombre, estado: '' }, idx);
    list.appendChild(div);
  }
}
function _docEstadoCls(e) {
  return e === 'Listo' ? 'badge--green' : e === 'Pendiente' ? 'badge--yellow' : e === 'No aplica' ? 'badge--red' : 'badge--blue';
}
function _docExtRowHTML(convKey, d, idx) {
  return `<div class="det-doc-card" style="display:flex;align-items:center;gap:8px">
    <span class="det-doc-label" style="flex:1">${d.nombre}</span>
    <select onchange="opos_docExtEstado('${convKey}',${idx},this.value)"
      style="font-size:.74rem;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:3px 6px;font-family:inherit">
      ${['','Pendiente','Listo','No aplica'].map(o=>`<option value="${o}" ${d.estado===o?'selected':''}>${o||'—'}</option>`).join('')}
    </select>
    <button onclick="opos_docExtRemove('${convKey}',${idx})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem;padding:2px 4px">✕</button>
  </div>`;
}

function renderDocsPanel(r) {
  const reqEusk   = r.req_euskera !== false;
  const reqTit    = r.req_titulacion !== false;
  const nivelEusk = r.nivel_euskera ? ` (${r.nivel_euskera})` : '';
  const esCO      = r.tipo_proceso === 'concurso' || r.tipo_proceso === 'concurso-oposicion';
  const colorEstado = { 'Listo':'badge--green','Pendiente':'badge--yellow','No aplica':'badge--red','':'badge--blue' };
  const docs = [
    { key:'doc_solicitud',  label:'Solicitud / Instancia',              show:true },
    { key:'doc_dni',        label:'DNI / NIF',                          show:true },
    { key:'doc_titulacion', label:`Titulación requerida`,               show:reqTit },
    { key:'doc_euskera',    label:`Acreditación euskera${nivelEusk}`,   show:reqEusk },
    { key:'doc_cv',         label:'Currículum vitae',                   show:true },
    { key:'doc_meritos',    label:'Hoja de méritos / autobaremo',       show:esCO },
    { key:'doc_discap',     label:'Certificado discapacidad',           show:true },
    { key:'doc_extra1',     label:r.doc_extra1_nombre||'Documento extra 1', show:!!r.doc_extra1 },
    { key:'doc_extra2',     label:r.doc_extra2_nombre||'Documento extra 2', show:!!r.doc_extra2 },
    { key:'doc_extra3',     label:r.doc_extra3_nombre||'Documento extra 3', show:!!r.doc_extra3 },
  ].filter(d => d.show);

  const ckKey    = 'opos_checklist_' + (r.convocatoria||'').replace(/\s+/g,'_');
  const ck       = Store.get(ckKey);
  const convKey  = (r.convocatoria||'').replace(/\s+/g,'_');
  const docsExt  = _getDocsExt(r);

  const checkItems = [
    { id:'dni',    label:'DNI / Pasaporte en vigor' },
    { id:'tasa',   label:'Justificante de tasa pagada' },
    { id:'boli',   label:'Bolígrafo azul o negro' },
    { id:'lista',  label:'Comprobante de lista definitiva de admitidos' },
  ];

  const itBlock = (() => {
    if (!r.req_it_txartelas?.length || typeof it_validarRequisitos !== 'function') return '';
    const check    = it_validarRequisitos(r.req_it_txartelas);
    const allNames = r.req_it_txartelas.map(id => typeof it_getNombreModulo === 'function' ? it_getNombreModulo(id) : id);
    return check.ok
      ? `<div style="margin-top:10px;padding:10px 14px;background:#00ff0010;border:1px solid var(--green);border-radius:8px;font-size:.82rem;color:var(--green)">🖥️ ✅ IT Txartela: requisitos cumplidos (${allNames.join(', ')})</div>`
      : `<div style="margin-top:10px;padding:10px 14px;background:#ff000010;border:1px solid var(--red);border-radius:8px;font-size:.82rem">
           <div style="color:var(--red);font-weight:600;margin-bottom:4px">🖥️ ⚠️ IT Txartela: faltan módulos</div>
           ${check.nombres.map(n=>`<div style="color:var(--red)">▸ ${n}</div>`).join('')}
         </div>`;
  })();

  return `
  <!-- Checklist día del examen -->
  <div style="margin-bottom:14px;padding:12px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
    <div style="font-weight:700;font-size:.78rem;color:var(--accent2);margin-bottom:8px;text-transform:uppercase;letter-spacing:.05em">✅ Día del examen</div>
    ${checkItems.map(item => `
    <label style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border2);cursor:pointer;font-size:.83rem;color:var(--text)">
      <input type="checkbox" ${ck[item.id]?'checked':''} onchange="opos_toggleCheck('${ckKey}','${item.id}',this.checked)"
        style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0" />
      <span style="${ck[item.id]?'text-decoration:line-through;color:var(--text3)':''}">${item.label}</span>
    </label>`).join('')}
  </div>

  <!-- Documentación para la inscripción -->
  <div style="font-weight:700;font-size:.78rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">📁 Documentación para inscripción</div>
  <div class="det-docs-grid" style="margin-bottom:10px">
    ${docs.map(d => {
      const est = r[d.key] || '';
      return `<div class="det-doc-card">
        <span class="det-doc-label">${d.label}</span>
        <span class="badge ${colorEstado[est]||'badge--blue'}">${est||'—'}</span>
      </div>`;
    }).join('')}
  </div>

  <!-- Documentos específicos de estas bases -->
  <div style="font-weight:700;font-size:.78rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">📌 Específicos de estas bases</div>
  <div id="opos-dext-list-${convKey}">
    ${docsExt.length ? docsExt.map((d,i) => `<div id="opos-dext-row-${convKey}-${i}">${_docExtRowHTML(convKey,d,i)}</div>`).join('')
      : '<p style="font-size:.78rem;color:var(--text3);margin-bottom:8px">Sin documentos añadidos. Añade los que pidan las bases específicas.</p>'}
  </div>
  <div style="display:flex;gap:8px;margin-top:8px">
    <input id="opos-dext-input-${convKey}" type="text" placeholder="Ej: Certificado de empadronamiento…"
      style="flex:1;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:6px 10px;font-size:.78rem;font-family:inherit;outline:none"
      onkeydown="if(event.key==='Enter')opos_docExtAdd('${convKey}')" />
    <button onclick="opos_docExtAdd('${convKey}')"
      style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:6px 12px;font-size:.78rem;cursor:pointer;font-weight:600;font-family:inherit;white-space:nowrap">+ Añadir</button>
  </div>
  ${itBlock}`;
}

/* ── Baremo por convocatoria ── */
const _BAREMO_DEF = {
  misma_pts:0.10, misma_max:4.00,
  otras_pts:0.05, otras_max:2.00,
  priv_pts:0.02,  priv_max:0.50,
  euskera_ega:2.00, euskera_b2:1.50, euskera_b1:1.00, euskera_a2:0.50,
  tit_doc:2.00, tit_mas:1.00, tit_lic:1.50, tit_otro:0.50,
  cursos_max:3.00,
  tope:null,
  configurado:false
};
function _baremoKey(r) { return 'opos_baremo_' + (r.convocatoria||'').replace(/\s+/g,'_'); }
function _getBaremo(r) { return Object.assign({}, _BAREMO_DEF, Store.get(_baremoKey(r), {})); }

function opos_guardarBaremo(convKey) {
  const b = Store.get('opos_baremo_' + convKey, {});
  const fields = ['misma_pts','misma_max','otras_pts','otras_max','priv_pts','priv_max',
    'euskera_ega','euskera_b2','euskera_b1','euskera_a2',
    'tit_doc','tit_mas','tit_lic','tit_otro','cursos_max','tope'];
  fields.forEach(f => {
    const el = document.getElementById('opos-bar-' + f + '-' + convKey);
    if (el) b[f] = el.value === '' ? null : parseFloat(el.value);
  });
  b.configurado = true;
  Store.set('opos_baremo_' + convKey, b);
  // Re-render result
  const res = document.getElementById('opos-bar-result-' + convKey);
  if (res) res.innerHTML = _calcMeritosHTML(Store.get('opos_bar_data_' + convKey, {}), b);
  const badge = document.getElementById('opos-bar-badge-' + convKey);
  if (badge) { badge.textContent = '✅ Guardado'; badge.style.color = 'var(--green)'; setTimeout(()=>{ if(badge) badge.textContent=''; }, 2000); }
}

function _calcMeritosFromBaremo(m, b) {
  const mesesMisma = parseFloat(m.meses_misma||0);
  const mesesOtras = parseFloat(m.meses_otras||0);
  const mesesPriv  = parseFloat(m.meses_priv||0);
  const ptsMisma   = Math.min(b.misma_max, mesesMisma * b.misma_pts);
  const ptsOtras   = Math.min(b.otras_max, mesesOtras * b.otras_pts);
  const ptsPriv    = Math.min(b.priv_max,  mesesPriv  * b.priv_pts);
  const ptsEusk    = { 'EGA/C1':b.euskera_ega,'B2':b.euskera_b2,'B1':b.euskera_b1,'A2':b.euskera_a2,'':0 }[m.euskera||''] || 0;
  const ptsTit     = { 'Doctorado':b.tit_doc,'Máster':b.tit_mas,'Licenciatura/Grado':b.tit_lic,'Otro':b.tit_otro,'':0 }[m.tit_extra||''] || 0;
  const ptsCursos  = Math.min(b.cursos_max, (m.cursos||[]).reduce((acc,c) => {
    const h = parseInt(c.horas||0);
    return acc + (h>=120?.8:h>=80?.6:h>=40?.4:h>=20?.2:h>=10?.1:0);
  }, 0));
  const raw   = ptsMisma + ptsOtras + ptsPriv + ptsEusk + ptsTit + ptsCursos;
  const total = b.tope != null ? Math.min(b.tope, raw) : raw;
  return { ptsMisma, ptsOtras, ptsPriv, ptsEusk, ptsTit, ptsCursos, raw, total };
}

function _calcMeritosHTML(m, b) {
  const { ptsMisma, ptsOtras, ptsPriv, ptsEusk, ptsTit, ptsCursos, raw, total } = _calcMeritosFromBaremo(m, b);
  const cursos = m.cursos || [];
  return `
  <div class="meritos-layout">
    <div class="meritos-calc">
      <div class="meritos-bloque">
        <div class="meritos-bloque-title">💼 Servicios prestados</div>
        <div class="meritos-row"><span>Misma categoría (${b.misma_pts} pts/mes, máx ${b.misma_max})</span><strong style="color:var(--green)">${ptsMisma.toFixed(2)}</strong></div>
        <div class="meritos-row"><span>Otras adm. públicas (${b.otras_pts} pts/mes, máx ${b.otras_max})</span><strong style="color:var(--green)">${ptsOtras.toFixed(2)}</strong></div>
        <div class="meritos-row"><span>Empresa privada (${b.priv_pts} pts/mes, máx ${b.priv_max})</span><strong style="color:var(--green)">${ptsPriv.toFixed(2)}</strong></div>
      </div>
      <div class="meritos-bloque">
        <div class="meritos-bloque-title">🎓 Formación</div>
        <div class="meritos-row"><span>Euskera: ${m.euskera||'—'}</span><strong style="color:var(--blue)">${ptsEusk.toFixed(2)}</strong></div>
        <div class="meritos-row"><span>Titulación extra: ${m.tit_extra||'—'}</span><strong style="color:var(--blue)">${ptsTit.toFixed(2)}</strong></div>
        <div class="meritos-row"><span>Cursos (máx ${b.cursos_max})</span><strong style="color:var(--blue)">${ptsCursos.toFixed(2)}</strong></div>
        ${cursos.length ? `<div style="margin-top:6px;display:flex;flex-direction:column;gap:3px">
          ${cursos.map((c,ci) => `<div style="font-size:.75rem;color:var(--text2);padding:3px 8px;background:var(--bg4);border-radius:5px;display:flex;justify-content:space-between"><span>${c.nombre||'Curso '+(ci+1)}</span><span>${c.horas}h</span></div>`).join('')}
        </div>` : ''}
      </div>
    </div>
    <div class="meritos-total">
      <div class="meritos-total-label">TOTAL</div>
      <div class="meritos-total-val">${total.toFixed(2)}</div>
      <div class="meritos-total-sub">puntos</div>
      ${b.tope!=null && raw>b.tope ? `<div style="margin-top:8px;font-size:.72rem;color:var(--orange)">Bruto: ${raw.toFixed(2)} · recortado al tope ${b.tope}</div>` : ''}
    </div>
  </div>`;
}

/* ── Panel: Méritos ── */
function renderMeritosPanel(r, i) {
  if (r.tipo_proceso === 'libre') return `
  <div style="padding:20px;text-align:center;color:var(--text3)">
    <div style="font-size:2rem;margin-bottom:8px">📋</div>
    <div style="font-size:.9rem;font-weight:600;color:var(--text2)">Oposición libre</div>
    <div style="font-size:.82rem;margin-top:6px">Sin fase de concurso de méritos.</div>
  </div>`;

  const convKey = (r.convocatoria||'').replace(/\s+/g,'_');
  const b = _getBaremo(r);
  const m = r.meritos_calc || {};
  Store.set('opos_bar_data_' + convKey, m);

  const inp = (field, label, val) => `
  <div style="display:flex;flex-direction:column;gap:2px">
    <label style="font-size:.67rem;color:var(--text3)">${label}</label>
    <input id="opos-bar-${field}-${convKey}" type="number" step="0.01" value="${val??''}"
      style="width:70px;background:var(--bg3);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:4px 7px;font-size:.78rem;font-family:inherit;outline:none" />
  </div>`;

  return `
  <!-- Baremo de estas bases -->
  <details style="margin-bottom:14px" ${!b.configurado?'open':''}>
    <summary style="cursor:pointer;font-weight:700;font-size:.78rem;color:${b.configurado?'var(--green)':'var(--orange)'};text-transform:uppercase;letter-spacing:.05em;padding:8px 0;list-style:none;display:flex;align-items:center;gap:8px">
      ⚙️ Baremo de estas bases ${b.configurado?'<span style="color:var(--text3);font-weight:400;text-transform:none">(configurado)</span>':'<span style="color:var(--orange);font-weight:400;text-transform:none">— configura para calcular correctamente</span>'}
    </summary>
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px;margin-top:6px">
      <div style="font-size:.75rem;color:var(--text3);margin-bottom:12px">Introduce los valores exactos de las bases oficiales de esta convocatoria.</div>

      <div style="font-size:.76rem;font-weight:700;color:var(--text2);margin-bottom:8px">💼 Servicios prestados (admón. pública)</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px">
        ${inp('misma_pts','Misma categoría (pts/mes)',b.misma_pts)}
        ${inp('misma_max','Máximo (pts)',b.misma_max)}
        ${inp('otras_pts','Otras categorías (pts/mes)',b.otras_pts)}
        ${inp('otras_max','Máximo (pts)',b.otras_max)}
        ${inp('priv_pts','Empresa privada (pts/mes)',b.priv_pts)}
        ${inp('priv_max','Máximo (pts)',b.priv_max)}
      </div>

      <div style="font-size:.76rem;font-weight:700;color:var(--text2);margin-bottom:8px">🗣️ Euskera</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px">
        ${inp('euskera_ega','EGA / C1 (pts)',b.euskera_ega)}
        ${inp('euskera_b2','B2 (pts)',b.euskera_b2)}
        ${inp('euskera_b1','B1 (pts)',b.euskera_b1)}
        ${inp('euskera_a2','A2 (pts)',b.euskera_a2)}
      </div>

      <div style="font-size:.76rem;font-weight:700;color:var(--text2);margin-bottom:8px">🎓 Formación</div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px">
        ${inp('tit_doc','Doctorado (pts)',b.tit_doc)}
        ${inp('tit_mas','Máster (pts)',b.tit_mas)}
        ${inp('tit_lic','Licenciatura/Grado (pts)',b.tit_lic)}
        ${inp('tit_otro','Otra titulación (pts)',b.tit_otro)}
        ${inp('cursos_max','Cursos máx. total (pts)',b.cursos_max)}
      </div>

      <div style="font-size:.76rem;font-weight:700;color:var(--text2);margin-bottom:8px">🎯 Tope total</div>
      <div style="display:flex;gap:12px;margin-bottom:14px">
        ${inp('tope','Tope total méritos (vacío = sin tope)',b.tope)}
      </div>

      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="opos_guardarBaremo('${convKey}')"
          style="background:var(--accent);color:#fff;border:none;border-radius:7px;padding:7px 16px;font-size:.8rem;font-weight:700;cursor:pointer;font-family:inherit">
          💾 Guardar baremo
        </button>
        <span id="opos-bar-badge-${convKey}" style="font-size:.78rem"></span>
      </div>
    </div>
  </details>

  <!-- Resultado del cálculo -->
  ${!b.configurado ? `<div style="padding:12px 14px;background:var(--bg3);border:1px dashed var(--orange);border-radius:8px;font-size:.82rem;color:var(--orange)">
    ⚠️ Configura el baremo de estas bases arriba para obtener un cálculo preciso. Los valores por defecto son aproximaciones genéricas.
  </div>` : ''}
  <div id="opos-bar-result-${convKey}" style="margin-top:12px">
    ${_calcMeritosHTML(m, b)}
  </div>
  ${r.notas ? `<div style="margin-top:12px;padding:10px 14px;background:var(--bg3);border-radius:8px;border:1px solid var(--border);font-size:.78rem;color:var(--text2);line-height:1.55">
    <strong style="color:var(--accent2);display:block;margin-bottom:4px">📋 Notas de las bases</strong>${r.notas}
  </div>` : ''}`;
}

function calcMeritosTotal(r) {
  if (r.tipo_proceso === 'libre') return 0;
  const m = r.meritos_calc || {};
  const ptsMisma  = Math.min(4.00, parseFloat(m.meses_misma ||0) * 0.10);
  const ptsOtras  = Math.min(2.00, parseFloat(m.meses_otras ||0) * 0.05);
  const ptsPriv   = Math.min(0.50, parseFloat(m.meses_priv  ||0) * 0.02);
  const ptsEusk   = { 'EGA/C1':2,'B2':1.5,'B1':1,'A2':0.5,'':0 }[m.euskera||''] || 0;
  const ptsTit    = { 'Doctorado':2,'Máster':1,'Licenciatura/Grado':1.5,'Otro':0.5,'':0 }[m.tit_extra||''] || 0;
  const ptsCursos = Math.min(3.00, (m.cursos||[]).reduce((acc,c) => {
    const h = parseInt(c.horas||0);
    return acc + (h>=120?.8:h>=80?.6:h>=40?.4:h>=20?.2:h>=10?.1:0);
  }, 0));
  const total = ptsMisma + ptsOtras + ptsPriv + ptsEusk + ptsTit + ptsCursos;
  return r.tope_meritos != null ? Math.min(r.tope_meritos, total) : total;
}

/* ── Panel: Bolsa ── */
function renderBolsaPanel(r) {
  const entra = r.bolsa_entrada === true || r.bolsa_entrada === 'true';
  return `
  <div class="det-bolsa">
    <div class="bolsa-estado ${entra ? 'bolsa-si' : 'bolsa-no'}">
      <span class="bolsa-icon">${entra ? '✅' : '⏳'}</span>
      <div>
        <div class="bolsa-titulo">${entra ? 'En bolsa' : 'Sin bolsa / Pendiente'}</div>
        ${entra ? `
          <div class="bolsa-dato">📅 Fecha de entrada: <strong>${r.bolsa_fecha ? formatFecha(r.bolsa_fecha) : '—'}</strong></div>
          <div class="bolsa-dato">🏅 Posición: <strong>${r.bolsa_posicion ? '#'+r.bolsa_posicion : '—'}</strong></div>
          <div class="bolsa-dato">🔄 Llamadas recibidas: <strong>${r.bolsa_llamadas || '0'}</strong></div>
          <div class="bolsa-dato">📝 Notas: <span style="color:var(--text2)">${r.bolsa_notas || '—'}</span></div>
        ` : `<div style="color:var(--text3);font-size:.87rem;margin-top:4px">Actualiza cuando entre en bolsa</div>`}
      </div>
    </div>
  </div>`;
}

/* ── Panel: Enlaces ── */
function renderEnlacesPanel(r) {
  const links = [
    { label: 'BOE / BOE-A',    val: r.url_boe,    icon: '📰' },
    { label: 'Bases de la convocatoria', val: r.url_bases, icon: '📋' },
    { label: 'Temario oficial', val: r.url_temario, icon: '📚' },
    { label: 'Enlace extra 1',  val: r.url_extra1, icon: '🔗' },
    { label: 'Enlace extra 2',  val: r.url_extra2, icon: '🔗' },
  ];
  const activos = links.filter(l => l.val);
  if (!activos.length) return `<p style="color:var(--text3);font-size:.87rem;padding:12px 0">Sin enlaces guardados.</p>`;
  return `<div class="det-enlaces">${activos.map(l => `
    <a href="${l.val}" target="_blank" rel="noopener" class="det-enlace-card">
      <span class="det-enlace-icon">${l.icon}</span>
      <span class="det-enlace-label">${l.label}</span>
      <span style="margin-left:auto;color:var(--text3)">↗</span>
    </a>`).join('')}</div>`;
}

/* ── Panel: Historial ── */
function renderHistorialPanel(r, i) {
  const hist = r.historial || [];
  return `
  <div>
    <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap">
      <input id="hist-nota-${i}" type="text" placeholder="Describe el cambio o evento…" style="flex:1;min-width:200px;background:var(--bg3);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);padding:9px 12px;font-family:inherit;outline:none;" />
      <button class="btn-primary" onclick="addHistorial(${i})">+ Añadir</button>
    </div>
    <div class="det-historial" id="det-hist-list-${i}">
      ${hist.length ? hist.slice().reverse().map(h => `
        <div class="hist-item">
          <div class="hist-fecha">${h.fecha}</div>
          <div class="hist-texto">${h.texto}</div>
        </div>`).join('') : '<p style="color:var(--text3);font-size:.87rem">Sin entradas en el historial.</p>'}
    </div>
  </div>`;
}

function addHistorial(i) {
  const input = document.getElementById('hist-nota-' + i);
  const texto = input.value.trim();
  if (!texto) return;
  const lista = getOposLocal();
  if (!lista[i]) return;
  if (!lista[i].historial) lista[i].historial = [];
  lista[i].historial.push({ fecha: new Date().toLocaleDateString('es-ES'), texto });
  saveOposLocal(lista);
  input.value = '';
  // Re-render sólo el panel historial
  const el = document.getElementById('det-hist-list-' + i);
  if (el) el.innerHTML = lista[i].historial.slice().reverse().map(h => `
    <div class="hist-item">
      <div class="hist-fecha">${h.fecha}</div>
      <div class="hist-texto">${h.texto}</div>
    </div>`).join('');
  // Auto-añade al historial: "Historial actualizado"
}

/* ── Temas ── */
function getOposTemas() { return Store.get('opos_temas', []); }
function saveOposTemas(t) { Store.set('opos_temas', t); }

function renderOposTemas() {
  const temas    = getOposTemas();
  const sesiones = getOposSesiones();
  const el  = document.getElementById('opos-temas');
  const sel = document.getElementById('opos-sesion-tema');
  if (!temas.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem;padding:8px 0">No hay temas. Añade uno abajo para registrar tu progreso.</p>';
    sel.innerHTML = '<option value="">— Tema —</option>';
    return;
  }

  // Acumular horas por tema desde el registro de sesiones
  const horasPorTema = {};
  sesiones.forEach(s => {
    if (!s.tema) return;
    horasPorTema[s.tema] = (horasPorTema[s.tema] || 0) + (parseFloat(s.horas) || 0);
  });

  const avgPct = temas.length ? Math.round(temas.reduce((s,t) => s + (t.pct||0), 0) / temas.length) : 0;
  const totalHoras = Object.values(horasPorTema).reduce((s,h) => s + h, 0);
  const temasCompletos = temas.filter(t => t.pct >= 100).length;
  el.innerHTML = `
  <div style="background:var(--card2);border-radius:10px;padding:12px 14px;margin-bottom:12px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:.85rem;font-weight:600;color:var(--text2)">Progreso global</span>
      <span style="font-size:1.1rem;font-weight:700;color:${avgPct>=80?'var(--green)':avgPct>=40?'var(--accent)':'var(--text1)'}">${avgPct}%</span>
    </div>
    <div class="progress-bar" style="height:8px">
      <div class="progress-fill" style="width:${avgPct}%;background:${avgPct>=80?'var(--green)':avgPct>=40?'var(--accent)':'var(--red)'}"></div>
    </div>
    <div style="display:flex;gap:16px;margin-top:8px;font-size:.75rem;color:var(--text3)">
      <span>📚 ${temasCompletos}/${temas.length} temas al 100%</span>
      ${totalHoras > 0 ? `<span>⏱ ${totalHoras}h totales</span>` : ''}
    </div>
  </div>` +
  temas.map((t,i) => {
    const hAcum = horasPorTema[t.nombre] || 0;
    return `
    <div class="tema-row">
      <span class="tema-nombre">${t.nombre}${hAcum > 0 ? `<span style="font-size:.7rem;color:var(--accent2);font-weight:400;margin-left:6px">${hAcum}h</span>` : ''}</span>
      <div class="tema-prog">
        <div class="progress-bar"><div class="progress-fill" style="width:${t.pct}%"></div></div>
      </div>
      <span class="tema-pct">${t.pct}%</span>
      <div class="tema-controls">
        <button class="tema-btn" onclick="cambiarPct(${i},-10)">−</button>
        <button class="tema-btn" onclick="cambiarPct(${i},10)">+</button>
        <button class="tema-btn" onclick="borrarTema(${i})" style="color:var(--red)">✕</button>
      </div>
    </div>`;
  }).join('');
  sel.innerHTML = '<option value="">— Tema —</option>' +
    temas.map(t => `<option value="${t.nombre}">${t.nombre}</option>`).join('');
}

function cambiarPct(i, d) {
  const t = getOposTemas(); t[i].pct = Math.min(100, Math.max(0,(t[i].pct||0)+d));
  saveOposTemas(t); renderOposTemas();
}
function borrarTema(i) {
  const t = getOposTemas(); t.splice(i,1); saveOposTemas(t); renderOposTemas();
}
function setupOposTemas() {
  document.getElementById('opos-tema-add').addEventListener('click', () => {
    const input = document.getElementById('opos-tema-input');
    const nombre = input.value.trim();
    if (!nombre) return;
    const t = getOposTemas();
    if (t.find(x => x.nombre === nombre)) { input.value=''; return; }
    t.push({ nombre, pct:0 }); saveOposTemas(t); renderOposTemas(); input.value='';
  });
  document.getElementById('opos-tema-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('opos-tema-add').click();
  });
}

/* ── Sesiones ── */
function getOposSesiones() { return Store.get('opos_sesiones', []); }
function saveOposSesiones(s) { Store.set('opos_sesiones', s); }

function renderOposSesiones() {
  const todas   = getOposSesiones();
  const sesiones = todas.slice(-20).reverse();
  const el = document.getElementById('opos-sesiones');
  const totalH = todas.reduce((a, s) => a + (parseFloat(s.horas) || 0), 0);
  const headerHTML = todas.length
    ? `<li style="list-style:none;padding:6px 0 10px;border-bottom:1px solid var(--border);margin-bottom:4px;font-size:.8rem;color:var(--text3)">
        Total acumulado: <strong style="color:var(--accent2)">${totalH}h</strong> en ${todas.length} sesión${todas.length!==1?'es':''}
       </li>`
    : '';
  if (!sesiones.length) {
    el.innerHTML = '<li style="color:var(--text3);font-size:.87rem">Sin sesiones registradas aún.</li>'; return;
  }
  el.innerHTML = headerHTML + sesiones.map((s,i) => `
    <li>
      <span style="flex:1"><strong>${s.tema}</strong>${s.horas?` · <span style="color:var(--accent2)">${s.horas}h</span>`:''}${s.nota?` · <span style="color:var(--text2)">${s.nota}</span>`:''}</span>
      <span style="display:flex;align-items:center;gap:6px">
        <span style="font-size:.73rem;color:var(--text3)">${s.fecha}</span>
        <button onclick="opos_borrarSesion(${todas.length-1-i})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem;padding:1px 4px;line-height:1" title="Eliminar">✕</button>
      </span>
    </li>`).join('');
}

function setupOposSesiones() {
  document.getElementById('opos-sesion-add').addEventListener('click', () => {
    const tema  = document.getElementById('opos-sesion-tema').value;
    const horas = document.getElementById('opos-sesion-horas').value;
    const nota  = document.getElementById('opos-sesion-nota').value.trim();
    if (!tema) return;
    const s = getOposSesiones();
    s.push({ tema, horas: horas||'', nota, fecha: new Date().toLocaleDateString('es-ES') });
    saveOposSesiones(s);
    renderOposSesiones();
    renderOposTemas(); // actualiza horas acumuladas en temas
    document.getElementById('opos-sesion-horas').value = '';
    document.getElementById('opos-sesion-nota').value  = '';
  });
}

function opos_borrarSesion(i) {
  const s = getOposSesiones();
  s.splice(i, 1);
  saveOposSesiones(s);
  renderOposSesiones();
  renderOposTemas();
}

/* ── Local storage ── */
function getOposLocal()       { return Store.get('opos_convocatorias', []); }
function saveOposLocal(lista) { Store.set('opos_convocatorias', lista); }

/* ── Helpers ── */
function _excelSerialToDate(serial) {
  // Excel epoch = Jan 1 1900, JS epoch = Jan 1 1970. Offset = 25569 days.
  // Excel incorrectly counts 1900 as leap year, hence the -1 correction for serials >= 60.
  const corrected = serial >= 60 ? serial - 1 : serial;
  return new Date(Math.round((corrected - 25568) * 86400 * 1000));
}
function formatFecha(f) {
  if (!f) return '—';
  const num = parseFloat(f);
  if (!isNaN(num) && num > 40000 && num < 60000 && String(f).match(/^\d/)) {
    return _excelSerialToDate(num).toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  }
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

function badgePerfil(perfil) {
  const p = (perfil||'').toUpperCase();
  if (p==='KERMAN') return '<span class="badge badge--blue">Kerman</span>';
  if (['YO','TU','TÚ'].includes(p)) return '<span class="badge badge--green">Yo</span>';
  if (p==='AMBOS') return '<span class="badge badge--purple">Ambos</span>';
  return perfil || '—';
}

function badgeEstado(estado) {
  const map = {
    'ABIERTA':         'badge--green',
    'PENDIENTE':       'badge--yellow',
    'CERRADA':         'badge--red',
    'EN PROCESO':      'badge--blue',
    'EN SEGUIMIENTO':  'badge--gray',
    'PREVISTA':        'badge--orange',
  };
  const cls = map[(estado||'').toUpperCase()] || 'badge--yellow';
  return `<span class="badge ${cls}">${estado||'—'}</span>`;
}

function guardarUbicacionExamen(conv, key) {
  const ub = {
    lugar:    document.getElementById('ub-lugar')?.value.trim()   || '',
    pabellon: document.getElementById('ub-pabellon')?.value.trim()|| '',
    aula:     document.getElementById('ub-aula')?.value.trim()    || '',
    asiento:  document.getElementById('ub-asiento')?.value.trim() || '',
  };
  Store.set(key, ub);
  // Re-render el panel fechas del opos activo
  const data = window._oposData || [];
  const idx  = data.findIndex(r => r.convocatoria === conv);
  if (idx >= 0) {
    const panel = document.getElementById('det-fechas-' + idx);
    if (panel) panel.innerHTML = renderFechasPanel(data[idx]);
  }
}

function opos_guardarNota(conv, key) {
  const nota = document.getElementById('nota-examen-input')?.value.trim() || '';
  if (nota) localStorage.setItem(key, nota);
  else localStorage.removeItem(key);
  const data = window._oposData || [];
  const idx  = data.findIndex(r => r.convocatoria === conv);
  if (idx >= 0) {
    const panel = document.getElementById('det-fechas-' + idx);
    if (panel) panel.innerHTML = renderFechasPanel(data[idx]);
  }
}

function opos_setInscrita(key, val) {
  localStorage.setItem(key, val);
  const cols = { si: 'var(--green)', no: 'var(--red)', pendiente: 'var(--yellow)' };
  const bgs  = { si: '#00ff0022',    no: '#ff000022',  pendiente: '#f59e0b22' };
  document.querySelectorAll(`[data-inscr-key="${CSS.escape(key)}"]`).forEach(btn => {
    const bv = btn.getAttribute('data-inscr-val');
    const active = bv === val;
    btn.style.border     = `2px solid ${active ? cols[bv] : 'var(--border)'}`;
    btn.style.background = active ? bgs[bv]  : 'var(--bg4)';
    btn.style.color      = active ? cols[bv] : 'var(--text2)';
    btn.style.fontWeight = active ? '700' : '400';
  });
}

function opos_toggleCheck(key, field, checked) {
  const ck = Store.get(key);
  ck[field] = checked;
  Store.set(key, ck);
  // actualiza estilo del label sin re-render completo
  const label = event?.target?.closest('label');
  if (label) {
    const span = label.querySelector('span');
    if (span) span.style.cssText = checked ? 'text-decoration:line-through;color:var(--text3)' : '';
  }
}

/* ══════════════════════════════════════════════════════
   RADAR DE ORGANISMOS
══════════════════════════════════════════════════════ */
const RADAR_KEY = 'opos_radar';

const RADAR_INICIAL = [
  { organismo:'Diputación Foral de Bizkaia', puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Gobierno Vasco',              puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Bilbao',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Barakaldo',             puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Basauri',               puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Sestao',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Erandio',               puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Durango',               puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Galdakao',              puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Mungia',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Ermua',                 puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Muskiz',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Ortuella',              puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Balmaseda',             puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Zalla',                 puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Gernika-Lumo',          puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Bermeo',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Ondarroa',              puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Amorebieta-Etxano',     puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Sopelana',              puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Plentzia',              puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Urduliz',               puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Meñaka',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Ayto. Igorre',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Bilbao Ekintza',              puesto:'Administrativo / Auxiliar', nota:'OAL Bilbao' },
  { organismo:'Bilbao Kirolak',              puesto:'Administrativo / Auxiliar', nota:'OAL Bilbao' },
  { organismo:'UPV/EHU',                     puesto:'Administración universitaria', nota:'' },
  { organismo:'Lanbide',                     puesto:'Administrativo / Auxiliar', nota:'Servicio Vasco de Empleo' },
  { organismo:'Metro Bilbao',                puesto:'Administrativo / Auxiliar', nota:'' },
  { organismo:'Autoridad Portuaria Bilbao',  puesto:'Administrativo / Auxiliar', nota:'' },
];

function radarInit() {
  const stored = Store.get(RADAR_KEY, null);
  if (!stored || (Array.isArray(stored) && stored.length === 0)) {
    Store.set(RADAR_KEY, RADAR_INICIAL.map((r, i) => ({ ...r, id: 'rad_' + i })));
  }
  radarRender();
}

function radarRender() {
  const el = document.getElementById('opos-radar-list');
  if (!el) return;
  const lista = Store.get(RADAR_KEY, []);
  const cnt = document.getElementById('opos-radar-count');
  if (cnt) cnt.textContent = lista.length;
  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.75rem">Sin organismos en el radar.</p>';
    return;
  }
  el.innerHTML = lista.map((r, i) => `
    <div style="display:flex;align-items:center;gap:6px;padding:2px 0;border-bottom:1px solid var(--border)22">
      <span style="font-size:.74rem;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><span style="font-weight:600">${r.organismo}</span><span style="color:var(--text3)"> · ${r.puesto}</span>${r.nota ? `<span style="color:var(--text3);font-size:.68rem"> (${r.nota})</span>` : ''}</span>
      <button onclick="radarConvertir(${i})" title="Ha salido convocatoria" style="background:none;border:none;color:var(--green);cursor:pointer;padding:1px 4px;font-size:.78rem;flex-shrink:0">➕</button>
      <button onclick="radarBorrar(${i})" title="Quitar" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:1px 4px;font-size:.75rem;flex-shrink:0">✕</button>
    </div>`).join('');
}

function radarAnadir() {
  const organismo = document.getElementById('radar-organismo')?.value.trim();
  const puesto    = document.getElementById('radar-puesto')?.value.trim();
  const nota      = document.getElementById('radar-nota')?.value.trim() || '';
  if (!organismo || !puesto) { alert('Indica organismo y puesto.'); return; }
  const lista = Store.get(RADAR_KEY, []);
  lista.push({ id: 'rad_' + Date.now(), organismo, puesto, nota });
  Store.set(RADAR_KEY, lista);
  document.getElementById('radar-organismo').value = '';
  document.getElementById('radar-puesto').value    = '';
  document.getElementById('radar-nota').value      = '';
  radarRender();
}

function radarQuickAdd(val) {
  if (!val?.trim()) return;
  const parts = val.split('/').map(s => s.trim());
  const organismo = parts[0] || val.trim();
  const puesto    = parts[1] || 'Administrativo / Auxiliar';
  const lista = Store.get(RADAR_KEY, []);
  lista.push({ id: 'rad_' + Date.now(), organismo, puesto, nota: '' });
  Store.set(RADAR_KEY, lista);
  const el = document.getElementById('radar-quick-add');
  if (el) el.value = '';
  radarRender();
}

function radarBorrar(i) {
  if (!confirm('¿Quitar este organismo del radar?')) return;
  const lista = Store.get(RADAR_KEY, []);
  lista.splice(i, 1);
  Store.set(RADAR_KEY, lista);
  radarRender();
}

function radarConvertir(i) {
  const r = Store.get(RADAR_KEY, [])[i];
  if (!r) return;
  const lista = getOposLocal();
  const existe = lista.some(o => (o.convocatoria || '').toLowerCase().includes((r.organismo || '').toLowerCase()));
  if (existe) { alert('Ya hay una convocatoria de este organismo.'); return; }
  lista.push({ convocatoria: r.organismo, estado: 'pendiente', perfil: 'Yo', _id: Date.now(), historial: [{ fecha: new Date().toLocaleDateString('es-ES'), texto: 'Añadida desde radar' }] });
  Store.set('opos_convocatorias', lista);
  loadOposiciones();
  alert(`Añadida: ${r.organismo}`);
}
