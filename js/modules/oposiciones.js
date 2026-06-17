// ─── MÓDULO OPOSICIONES ───

async function loadOposiciones() {
  if (typeof opos_applySeed === 'function') opos_applySeed();

  let data = [];
  const rows = await fetchSheet(CONFIG.SHEETS.OPOSICIONES, 'Oposiciones!A:I');
  if (rows) data = rowsToObjects(rows);

  const locales = getOposLocal();
  if (!data.length && locales.length) data = locales;
  else if (locales.length) data = [...data, ...locales];

  renderOposStats(data);
  renderOposCountdown(data);
  renderOposTable(data);
  setupRevisiones(data);
  renderOposTemas();
  renderOposSesiones();
  setupOposTemas();
  setupOposSesiones();
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

  const conFecha = data.filter(r => r.fecha_examen).sort((a,b) =>
    new Date(a.fecha_examen) - new Date(b.fecha_examen)
  );
  const proxEl = document.getElementById('opos-prox-fecha');
  if (conFecha.length) {
    const next = conFecha[0];
    const mismaFecha = conFecha.filter(r => r.fecha_examen === next.fecha_examen);
    const nombresHTML = mismaFecha.map(r =>
      `<div style="font-size:.68rem;color:var(--text3);margin-top:3px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.convocatoria || ''}</div>`
    ).join('');
    proxEl.innerHTML = `${formatFecha(next.fecha_examen)}${nombresHTML}`;
    const dashOposEl = document.getElementById('dash-opos') || document.getElementById('dash-opos-content');
    if (dashOposEl) dashOposEl.textContent = formatFecha(next.fecha_examen);
  } else {
    proxEl.textContent = '—';
  }

  // Horas estudiadas: mes actual y semana actual
  const _sesiones = Store.get('opos_sesiones', []);
  const _hoy = new Date(); _hoy.setHours(0,0,0,0);
  const _parseDate = str => {
    const p = str?.split('/');
    return p?.length >= 3 ? new Date(`${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`) : null;
  };
  const _horasMes = _sesiones.filter(s => {
    const d = _parseDate(s.fecha);
    return d && d.getFullYear() === _hoy.getFullYear() && d.getMonth() === _hoy.getMonth();
  }).reduce((a, s) => a + (parseFloat(s.horas) || 0), 0);
  const _lunes = new Date(_hoy);
  _lunes.setDate(_hoy.getDate() - ((_hoy.getDay() || 7) - 1));
  const _horasSemana = _sesiones.filter(s => {
    const d = _parseDate(s.fecha);
    return d && d >= _lunes;
  }).reduce((a, s) => a + (parseFloat(s.horas) || 0), 0);
  const horasEl = document.getElementById('opos-horas-mes');
  if (horasEl) {
    const col = _horasMes >= 20 ? 'var(--green)' : _horasMes >= 10 ? 'var(--yellow)' : 'var(--text)';
    horasEl.innerHTML = `<span style="color:${col}">${_horasMes}h</span><div style="font-size:.68rem;color:var(--text3);margin-top:3px;font-weight:400">${_horasSemana}h esta semana</div>`;
  }
}

/* ── Countdown ── */
function renderOposCountdown(data) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const proximos = data
    .filter(r => r.fecha_examen && new Date(r.fecha_examen) >= hoy)
    .sort((a,b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
  const cd = document.getElementById('opos-countdown');
  if (!proximos.length) { cd.style.display='none'; return; }
  const next = proximos[0];
  const dias = Math.round((new Date(next.fecha_examen) - hoy) / 86400000);
  const mismodia = proximos.filter(r => r.fecha_examen === next.fecha_examen);
  cd.style.display = 'flex';
  const nombreEl = document.getElementById('opos-cd-nombre');
  if (nombreEl) {
    if (mismodia.length > 1) {
      nombreEl.innerHTML = mismodia.map((r, i) =>
        `<div style="${i > 0 ? 'margin-top:4px;padding-top:4px;border-top:1px solid rgba(255,255,255,.1)' : ''}">${r.convocatoria || '—'}</div>`
      ).join('');
    } else {
      nombreEl.textContent = next.convocatoria || '—';
    }
  }
  document.getElementById('opos-cd-dias').textContent = dias;
  const horaEl = document.getElementById('opos-cd-hora');
  if (horaEl) {
    if (mismodia.length > 1) {
      horaEl.innerHTML = mismodia.filter(r => r.hora_examen).map(r =>
        `<span style="margin-right:10px">🕐 ${r.hora_examen}</span>`
      ).join('');
    } else {
      horaEl.textContent = next.hora_examen ? `🕐 ${next.hora_examen}` : '';
    }
  }

  // Próximo hito administrativo (la fecha más cercana que no sea el examen)
  const hitos = [
    { label: 'Fin inscripción',   val: next.fecha_fin_inscr,   icon: '🔴' },
    { label: 'Lista provisional', val: next.fecha_lista_prov,  icon: '📄' },
    { label: 'Alegaciones',       val: next.fecha_alegaciones, icon: '✍️' },
    { label: 'Lista definitiva',  val: next.fecha_lista_def,   icon: '✅' },
  ].filter(h => h.val)
   .map(h => ({ ...h, d: new Date(h.val) }))
   .filter(h => h.d >= hoy)
   .sort((a,b) => a.d - b.d);

  const hitoEl = document.getElementById('opos-cd-hito');
  if (hitoEl) {
    if (hitos.length) {
      const h = hitos[0];
      const dh = Math.round((h.d - hoy) / 86400000);
      hitoEl.textContent = `${h.icon} ${h.label}: ${formatFecha(h.val)}${dh === 0 ? ' — ¡Hoy!' : dh === 1 ? ' — mañana' : ` — en ${dh}d`}`;
    } else {
      hitoEl.textContent = '';
    }
  }
}

/* ── Tabla principal ── */
function renderOposTable(data) {
  const tbody = document.getElementById('opos-tbody');
  if (!data.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="empty-row">Sin datos — añade convocatorias en ✏️ Actualizar</td></tr>';
    return;
  }
  tbody.innerHTML = data.map((r, i) => `
    <tr class="opos-row" onclick="toggleOposDetalle(${i}, this)" data-idx="${i}" style="cursor:pointer">
      <td data-label="Perfil">${badgePerfil(r.perfil)}</td>
      <td data-label="Convocatoria"><strong>${r.convocatoria || '—'}</strong></td>
      <td data-label="Grupo">${r.grupo || '—'}</td>
      <td data-label="Estado">${badgeEstado(r.estado)}</td>
      <td data-label="Examen">${r.fecha_examen ? formatFecha(r.fecha_examen) : '—'}</td>
      <td data-label="Tasa">${r.tasa_pagada === 'SI' ? '<span class="badge badge--green">✓ Pagada</span>' : r.tasa_pagada === 'NO' ? '<span class="badge badge--red">✗ No</span>' : '—'}</td>
      <td data-label="Bolsa">${r.bolsa_entrada === true || r.bolsa_entrada === 'true' ? `<span class="badge badge--green">Sí ${r.bolsa_posicion ? '#'+r.bolsa_posicion : ''}</span>` : '<span class="badge badge--yellow">—</span>'}</td>
      <td data-label="Méritos">${calcMeritosTotal(r) > 0 ? `<span style="color:var(--accent2);font-weight:700">${calcMeritosTotal(r).toFixed(2)} pts</span>` : '—'}</td>
      <td data-label="Fase">${r.fase ? `<span class="chip">${r.fase}</span>` : '—'}</td>
    </tr>
    <tr class="opos-detalle-row hidden" id="opos-det-${i}">
      <td colspan="9" style="padding:0">${renderDetalleHTML(r, i)}</td>
    </tr>
  `).join('');

  // Guardar datos para referencia en detalle
  window._oposData = data;
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
  const fechas = [
    { label: 'Apertura inscripción',  val: r.fecha_apertura,    icon: '🟢' },
    { label: 'Fin inscripción',       val: r.fecha_fin_inscr,   icon: '🔴' },
    { label: 'Lista provisional',     val: r.fecha_lista_prov,  icon: '📄' },
    { label: 'Alegaciones',           val: r.fecha_alegaciones, icon: '✍️' },
    { label: 'Lista definitiva',      val: r.fecha_lista_def,   icon: '✅' },
    { label: 'Examen',                val: r.fecha_examen,      icon: '📝', extra: r.hora_examen ? `🕐 ${r.hora_examen}` : null },
  ];
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  // Ubicación del examen (guardada en localStorage por convocatoria)
  const ubKey = 'opos_ubicacion_' + (r.convocatoria || '').replace(/\s+/g,'_');
  const ub = Store.get(ubKey);

  return `
  <div class="det-fechas-grid">
    ${fechas.map(f => {
      const d = f.val ? new Date(f.val) : null;
      const pasado = d && d < hoy;
      const hoyEs  = d && d.getTime() === hoy.getTime();
      const dias   = d ? Math.round((d - hoy) / 86400000) : null;
      return `
      <div class="det-fecha-card ${pasado ? 'pasado' : hoyEs ? 'hoy' : f.val ? 'futuro' : 'vacio'}">
        <span class="det-fecha-icon">${f.icon}</span>
        <div class="det-fecha-info">
          <div class="det-fecha-label">${f.label}</div>
          <div class="det-fecha-val">${f.val ? formatFecha(f.val) : '—'}</div>
          ${f.extra ? `<div class="det-fecha-dias" style="color:var(--text2)">${f.extra}</div>` : ''}
          ${d && !pasado && dias !== null ? `<div class="det-fecha-dias">${dias === 0 ? '¡Hoy!' : 'en '+dias+' días'}</div>` : ''}
          ${pasado ? '<div class="det-fecha-dias pasado-txt">Pasado</div>' : ''}
        </div>
      </div>`;
    }).join('')}
  </div>

  <div style="margin-top:18px;padding:14px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
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
function renderDocsPanel(r) {
  const docs = [
    { key: 'doc_solicitud',  label: 'Solicitud / Instancia' },
    { key: 'doc_titulacion', label: 'Titulación requerida' },
    { key: 'doc_euskera',    label: 'Acreditación euskera' },
    { key: 'doc_dni',        label: 'DNI / NIF' },
    { key: 'doc_cv',         label: 'Currículum vitae' },
    { key: 'doc_meritos',    label: 'Hoja de méritos / autobaremo' },
    { key: 'doc_discap',     label: 'Certificado discapacidad' },
    { key: 'doc_extra1',     label: r.doc_extra1_nombre || 'Documento extra 1' },
    { key: 'doc_extra2',     label: r.doc_extra2_nombre || 'Documento extra 2' },
    { key: 'doc_extra3',     label: r.doc_extra3_nombre || 'Documento extra 3' },
  ];
  const colorEstado = { 'Listo': 'badge--green', 'Pendiente': 'badge--yellow', 'No aplica': 'badge--red', '': 'badge--blue' };
  const ckKey = 'opos_checklist_' + (r.convocatoria || '').replace(/\s+/g,'_');
  const ck = Store.get(ckKey);
  const checkItems = [
    { id:'dni',    label:'DNI / Pasaporte en vigor' },
    { id:'tasa',   label:'Justificante de tasa pagada / resguardo de inscripción' },
    { id:'boli',   label:'Bolígrafo azul o negro' },
    { id:'lista',  label:'Comprobante de lista definitiva de admitidos' },
  ];

  return `
  <div style="margin-bottom:16px;padding:14px 16px;background:var(--bg3);border-radius:10px;border:1px solid var(--border)">
    <div style="font-weight:700;font-size:.82rem;color:var(--accent2);margin-bottom:10px">✅ Checklist día del examen</div>
    ${checkItems.map(item => `
    <label style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border2);cursor:pointer;font-size:.85rem;color:var(--text)">
      <input type="checkbox" ${ck[item.id]?'checked':''} onchange="opos_toggleCheck('${ckKey}','${item.id}',this.checked)"
        style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0" />
      <span style="${ck[item.id]?'text-decoration:line-through;color:var(--text3)':''}">${item.label}</span>
    </label>`).join('')}
  </div>

  <div class="det-docs-grid">
    ${docs.map(d => {
      const est = r[d.key] || '';
      const cls = colorEstado[est] || 'badge--blue';
      return `
      <div class="det-doc-card">
        <span class="det-doc-label">${d.label}</span>
        <span class="badge ${cls}">${est || '—'}</span>
      </div>`;
    }).join('')}
  </div>
  <p style="font-size:.75rem;color:var(--text3);margin-top:12px">Edita los estados en ✏️ Actualizar → Oposiciones → editar</p>`;
}

/* ── Panel: Méritos ── */
function renderMeritosPanel(r, i) {
  const m = r.meritos_calc || {};
  const mesesMisma  = parseFloat(m.meses_misma  || 0);
  const mesesOtras  = parseFloat(m.meses_otras  || 0);
  const mesesPriv   = parseFloat(m.meses_priv   || 0);
  const euskeraNivel = m.euskera || '';
  const titExtra    = m.tit_extra || '';
  const cursos      = m.cursos || [];

  const ptsMisma  = Math.min(4.00, mesesMisma  * 0.10);
  const ptsOtras  = Math.min(2.00, mesesOtras  * 0.05);
  const ptsPriv   = Math.min(0.50, mesesPriv   * 0.02);
  const ptsEusk   = { 'EGA/C1': 2.00, 'B2': 1.50, 'B1': 1.00, 'A2': 0.50, '': 0 }[euskeraNivel] || 0;
  const ptsTit    = { 'Doctorado': 2.00, 'Máster': 1.00, 'Licenciatura/Grado': 1.50, 'Otro': 0.50, '': 0 }[titExtra] || 0;
  const ptsCursos = Math.min(3.00, cursos.reduce((acc, c) => {
    const h = parseInt(c.horas || 0);
    let p = 0;
    if (h >= 120) p = 0.80;
    else if (h >= 80) p = 0.60;
    else if (h >= 40) p = 0.40;
    else if (h >= 20) p = 0.20;
    else if (h >= 10) p = 0.10;
    return acc + p;
  }, 0));
  const total = ptsMisma + ptsOtras + ptsPriv + ptsEusk + ptsTit + ptsCursos;

  return `
  <div class="meritos-layout">
    <div class="meritos-calc">
      <div class="meritos-bloque">
        <div class="meritos-bloque-title">💼 Servicios prestados</div>
        <div class="meritos-row">
          <span>Misma categoría (0,10 pts/mes, máx 4)</span>
          <strong style="color:var(--green)">${ptsMisma.toFixed(2)}</strong>
        </div>
        <div class="meritos-row">
          <span>Otras categorías admin. (0,05 pts/mes, máx 2)</span>
          <strong style="color:var(--green)">${ptsOtras.toFixed(2)}</strong>
        </div>
        <div class="meritos-row">
          <span>Empresa privada (0,02 pts/mes, máx 0,50)</span>
          <strong style="color:var(--green)">${ptsPriv.toFixed(2)}</strong>
        </div>
      </div>
      <div class="meritos-bloque">
        <div class="meritos-bloque-title">🎓 Formación</div>
        <div class="meritos-row">
          <span>Euskera: ${euskeraNivel || '—'}</span>
          <strong style="color:var(--blue)">${ptsEusk.toFixed(2)}</strong>
        </div>
        <div class="meritos-row">
          <span>Titulación extra: ${titExtra || '—'}</span>
          <strong style="color:var(--blue)">${ptsTit.toFixed(2)}</strong>
        </div>
        <div class="meritos-row">
          <span>Cursos de formación (máx 3)</span>
          <strong style="color:var(--blue)">${ptsCursos.toFixed(2)}</strong>
        </div>
        ${cursos.length ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px">
          ${cursos.map((c,ci) => `<div style="font-size:.78rem;color:var(--text2);padding:4px 8px;background:var(--bg4);border-radius:6px;display:flex;justify-content:space-between">
            <span>${c.nombre || 'Curso '+(ci+1)}</span><span>${c.horas}h</span>
          </div>`).join('')}
        </div>` : ''}
      </div>
    </div>
    <div class="meritos-total">
      <div class="meritos-total-label">TOTAL MÉRITOS</div>
      <div class="meritos-total-val">${total.toFixed(2)}</div>
      <div class="meritos-total-sub">puntos</div>
      <div style="margin-top:16px;font-size:.75rem;color:var(--text3);text-align:center">Edita los datos en ✏️ Actualizar</div>
    </div>
  </div>
  <div style="margin-top:12px;padding:10px 14px;background:var(--bg4);border-radius:8px;font-size:.76rem;color:var(--text3)">
    ℹ️ Baremo orientativo basado en convocatorias de Administración Pública vasca. Verifica siempre las bases de la convocatoria concreta.
  </div>`;
}

function calcMeritosTotal(r) {
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
  return ptsMisma + ptsOtras + ptsPriv + ptsEusk + ptsTit + ptsCursos;
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
        ` : `<div style="color:var(--text3);font-size:.87rem;margin-top:4px">Actualiza cuando entre en bolsa desde ✏️ Actualizar</div>`}
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
  if (!activos.length) return `<p style="color:var(--text3);font-size:.87rem;padding:12px 0">Sin enlaces guardados. Añádelos en ✏️ Actualizar.</p>`;
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

/* ── Revisiones de estado ── */
function getRevisiones() { return Store.get('opos_revisiones', []); }
function saveRevisiones(r) { Store.set('opos_revisiones', r); }

function setupRevisiones(data) {
  // Rellena el select de oposiciones
  const sel = document.getElementById('rev-opos-sel');
  sel.innerHTML = '<option value="">— Oposición —</option>' +
    data.map(r => `<option value="${r.convocatoria}">${r.convocatoria}</option>`).join('');

  document.getElementById('rev-guardar').addEventListener('click', () => {
    const opos   = document.getElementById('rev-opos-sel').value;
    const estado = document.getElementById('rev-estado-sel').value;
    const nota   = document.getElementById('rev-nota').value.trim();
    if (!opos || !estado) return;

    const hoy = new Date();
    const fecha = hoy.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });

    const revs = getRevisiones();
    revs.unshift({ opos, estado, nota, fecha, ts: hoy.getTime() });
    saveRevisiones(revs);

    document.getElementById('rev-opos-sel').value   = '';
    document.getElementById('rev-estado-sel').value = '';
    document.getElementById('rev-nota').value        = '';
    renderRevisiones();
  });

  renderRevisiones();
}

function renderRevisiones() {
  const revs = getRevisiones();
  const el   = document.getElementById('rev-log');
  if (!revs.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem">Sin revisiones registradas aún.</p>';
    return;
  }
  el.innerHTML = revs.map((r, i) => `
    <div class="rev-item">
      <span class="rev-fecha">${r.fecha}</span>
      <div class="rev-body">
        <div class="rev-opos">${r.opos} &nbsp; ${badgeEstado(r.estado)}</div>
        ${r.nota ? `<div class="rev-nota">${r.nota}</div>` : ''}
      </div>
      <button class="rev-del" onclick="borrarRevision(${i})" title="Eliminar">✕</button>
    </div>`).join('');
}

function borrarRevision(i) {
  const revs = getRevisiones();
  revs.splice(i, 1);
  saveRevisiones(revs);
  renderRevisiones();
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

  el.innerHTML = temas.map((t,i) => {
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
