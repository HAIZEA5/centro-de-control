// ─── MÓDULO ACTUALIZAR ───

function initActualizar() {
  setupUpdateTabs();
}

/* ── Tabs principales ── */
function setupUpdateTabs() {
  document.querySelectorAll('.update-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.update-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.update-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab)?.classList.add('active');
    });
  });
}

/* ════════════════════════════════
   OPOSICIONES
════════════════════════════════ */
let _editIdx = null; // índice de la convocatoria que se está editando

function setupUpdOposiciones() {
  document.getElementById('upd-opos-guardar').addEventListener('click', guardarOpos);
  document.getElementById('upd-opos-cancelar').addEventListener('click', cancelarEditOpos);
  document.getElementById('upd-opos-add-curso').addEventListener('click', () => { addCursoFila(); opos_liveMeritos(); });
  renderUpdOposList();
}

function opos_toggleItReqs(checked) {
  const el = document.getElementById('upd-opos-it-modulos');
  if (el) el.style.display = checked ? 'flex' : 'none';
  if (checked) opos_itSemaforo();
}

function opos_itSemaforo() {
  const el = document.getElementById('upd-opos-it-semaforo');
  if (!el || typeof it_validarRequisitos !== 'function') return;
  const marcados = [...document.querySelectorAll('.it-req-check:checked')].map(c => c.value);
  if (!marcados.length) { el.innerHTML = ''; return; }
  const check = it_validarRequisitos(marcados);
  if (check.ok) {
    el.innerHTML = '<span style="color:var(--green)">✅ Tienes todos los módulos requeridos</span>';
  } else {
    el.innerHTML = `<span style="color:var(--red)">⚠️ Te faltan: <strong>${check.nombres.join(', ')}</strong></span>`;
  }
  document.querySelectorAll('.it-req-check').forEach(cb => {
    const label = cb.closest('label');
    if (!label) return;
    if (!cb.checked) { label.style.color = ''; label.style.fontWeight = ''; return; }
    const tienes = typeof it_tieneModulo === 'function' && it_tieneModulo(cb.value);
    label.style.color = tienes ? 'var(--green)' : 'var(--red)';
    label.style.fontWeight = '600';
  });
}

function opos_toggleDocsExtra() {
  const el  = document.getElementById('opos-docs-extra');
  const btn = document.getElementById('opos-docs-extra-btn');
  if (!el) return;
  const shown = el.style.display !== 'none';
  el.style.display = shown ? 'none' : 'block';
  if (btn) btn.textContent = shown ? '＋ Añadir documento extra' : '－ Ocultar documentos extra';
}

function opos_liveMeritos() {
  const get = id => parseFloat(document.getElementById(id)?.value || 0) || 0;
  const getv = id => document.getElementById(id)?.value || '';

  const ptsMisma  = Math.min(4.00, get('upd-opos-m-misma') * 0.10);
  const ptsOtras  = Math.min(2.00, get('upd-opos-m-otras') * 0.05);
  const ptsPriv   = Math.min(0.50, get('upd-opos-m-priv')  * 0.02);
  const ptsServ   = ptsMisma + ptsOtras + ptsPriv;

  const ptsEusk = { 'EGA/C1':2,'B2':1.5,'B1':1,'A2':0.5 }[getv('upd-opos-m-euskera')] || 0;
  const ptsTit  = { 'Doctorado':2,'Máster':1,'Licenciatura/Grado':1.5,'Otro':0.5 }[getv('upd-opos-m-tit')] || 0;

  const cursoFilas = document.querySelectorAll('#upd-opos-cursos-container .curso-fila');
  const ptsCursos  = Math.min(3.00, [...cursoFilas].reduce((acc, fila) => {
    const h = parseInt(fila.querySelector('.curso-horas')?.value || 0);
    return acc + (h>=120?.8:h>=80?.6:h>=40?.4:h>=20?.2:h>=10?.1:0);
  }, 0));

  const ptsForm  = ptsEusk + ptsTit;
  const rawTotal = ptsServ + ptsForm + ptsCursos;
  const tipo  = document.getElementById('upd-opos-tipo-proceso')?.value || '';
  const topeV = parseFloat(document.getElementById('upd-opos-tope-meritos')?.value || '') || null;
  const total = tipo === 'libre' ? 0 : (topeV != null ? Math.min(topeV, rawTotal) : rawTotal);
  const fmt = v => v.toFixed(2).replace('.',',');

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('lm-servicios', fmt(ptsServ));
  set('lm-formacion', fmt(ptsForm));
  set('lm-cursos',    fmt(ptsCursos));
  const topeWarn = tipo !== 'libre' && topeV != null && rawTotal > topeV
    ? ` <span style="color:var(--red);font-size:.75rem">(tope ${topeV})</span>` : '';
  const totalEl = document.getElementById('lm-total');
  if (totalEl) totalEl.innerHTML = fmt(total) + ' pts' + topeWarn;
}

function _opos_setListaVisible(visible) {
  const el = document.getElementById('upd-opos-lista-card');
  if (el) el.style.display = visible ? '' : 'none';
}

function guardarOpos() {
  const get = id => document.getElementById(id)?.value?.trim() || '';
  const getv = id => document.getElementById(id)?.value || '';

  // Cursos
  const cursos = [];
  document.querySelectorAll('.curso-fila').forEach(fila => {
    const nombre = fila.querySelector('.curso-nombre')?.value?.trim();
    const horas  = fila.querySelector('.curso-horas')?.value;
    if (nombre || horas) cursos.push({ nombre: nombre||'', horas: horas||'0' });
  });

  const _reqEusk = getv('upd-opos-req-euskera');
  const _tope    = get('upd-opos-tope-meritos');

  const entry = {
    // Básico
    perfil:        getv('upd-opos-perfil'),
    convocatoria:  get('upd-opos-conv'),
    grupo:         get('upd-opos-grupo'),
    estado:        getv('upd-opos-estado'),
    tasa_pagada:   getv('upd-opos-tasa'),
    fase:          getv('upd-opos-fase'),
    tipo_proceso:  getv('upd-opos-tipo-proceso'),
    tope_meritos:  _tope ? parseFloat(_tope) : null,
    req_euskera:   _reqEusk === 'true' ? true : _reqEusk === 'false' ? false : undefined,
    nivel_euskera: getv('upd-opos-nivel-euskera'),
    req_titulacion: true,
    req_it_txartelas: (() => {
      const cb = document.getElementById('upd-opos-req-it');
      if (!cb?.checked) return [];
      return [...document.querySelectorAll('.it-req-check:checked')].map(c => c.value);
    })(),
    // Fechas
    fecha_examen:      getv('upd-opos-fecha-examen'),
    hora_examen:       getv('upd-opos-hora-examen'),
    fecha_apertura:    getv('upd-opos-fecha-apertura'),
    fecha_fin_inscr:   getv('upd-opos-fecha-fin'),
    fecha_lista_prov:  getv('upd-opos-fecha-lprov'),
    fecha_alegaciones: getv('upd-opos-fecha-aleg'),
    fecha_lista_def:   getv('upd-opos-fecha-ldef'),
    // Documentación
    doc_solicitud:      getv('upd-opos-doc-solicitud'),
    doc_titulacion:     getv('upd-opos-doc-titulacion'),
    doc_euskera:        getv('upd-opos-doc-euskera'),
    doc_dni:            getv('upd-opos-doc-dni'),
    doc_cv:             getv('upd-opos-doc-cv'),
    doc_meritos:        getv('upd-opos-doc-meritos'),
    doc_discap:         getv('upd-opos-doc-discap'),
    doc_extra1_nombre:  get('upd-opos-doc-e1-nombre'),
    doc_extra1:         getv('upd-opos-doc-e1'),
    doc_extra2_nombre:  get('upd-opos-doc-e2-nombre'),
    doc_extra2:         getv('upd-opos-doc-e2'),
    doc_extra3_nombre:  get('upd-opos-doc-e3-nombre'),
    doc_extra3:         getv('upd-opos-doc-e3'),
    // Méritos
    meritos_calc: {
      meses_misma: get('upd-opos-m-misma'),
      meses_otras: get('upd-opos-m-otras'),
      meses_priv:  get('upd-opos-m-priv'),
      euskera:     getv('upd-opos-m-euskera'),
      tit_extra:   getv('upd-opos-m-tit'),
      cursos,
    },
    // Bolsa
    bolsa_entrada:  document.getElementById('upd-opos-bolsa-entra')?.checked || false,
    bolsa_fecha:    getv('upd-opos-bolsa-fecha'),
    bolsa_posicion: get('upd-opos-bolsa-pos'),
    bolsa_llamadas: get('upd-opos-bolsa-llamadas'),
    bolsa_notas:    get('upd-opos-bolsa-notas'),
    // Enlaces
    url_boe:     get('upd-opos-url-boe'),
    url_bases:   get('upd-opos-url-bases'),
    url_temario: get('upd-opos-url-temario'),
    url_extra1:  get('upd-opos-url-e1'),
    url_extra2:  get('upd-opos-url-e2'),
    _id: Date.now(),
  };

  if (!entry.convocatoria) { alert('El campo "Nombre de la convocatoria" es obligatorio.'); return; }

  const lista = getOposLocal();
  if (_editIdx !== null) {
    entry.historial = lista[_editIdx]?.historial || [];
    entry._id = lista[_editIdx]?._id || entry._id;
    // Auto entrada en historial al editar
    entry.historial.push({ fecha: new Date().toLocaleDateString('es-ES'), texto: 'Datos actualizados' });
    lista[_editIdx] = entry;
  } else {
    entry.historial = [{ fecha: new Date().toLocaleDateString('es-ES'), texto: 'Convocatoria añadida' }];
    lista.push(entry);
  }
  saveOposLocal(lista);

  limpiarFormOpos();
  _opos_setListaVisible(true);
  mostrarOk('upd-opos-ok');
  renderUpdOposList();
  loadOposiciones();
}

function limpiarFormOpos() {
  _editIdx = null;
  document.getElementById('upd-opos-cancelar').style.display = 'none';
  document.getElementById('upd-opos-form-title').textContent = 'Nueva convocatoria';
  const campos = ['upd-opos-conv','upd-opos-grupo','upd-opos-fecha-examen','upd-opos-hora-examen','upd-opos-fecha-apertura',
    'upd-opos-fecha-fin','upd-opos-fecha-lprov','upd-opos-fecha-aleg','upd-opos-fecha-ldef',
    'upd-opos-doc-e1-nombre','upd-opos-doc-e2-nombre','upd-opos-doc-e3-nombre',
    'upd-opos-m-misma','upd-opos-m-otras','upd-opos-m-priv',
    'upd-opos-bolsa-pos','upd-opos-bolsa-llamadas','upd-opos-bolsa-notas','upd-opos-bolsa-fecha',
    'upd-opos-url-boe','upd-opos-url-bases','upd-opos-url-temario','upd-opos-url-e1','upd-opos-url-e2',
    'upd-opos-tope-meritos','upd-opos-nivel-euskera'];
  campos.forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const cb = document.getElementById('upd-opos-bolsa-entra'); if (cb) cb.checked = false;
  const itCb = document.getElementById('upd-opos-req-it'); if (itCb) { itCb.checked = false; opos_toggleItReqs(false); }
  document.querySelectorAll('.it-req-check').forEach(c => { c.checked = false; });
  document.getElementById('upd-opos-cursos-container').innerHTML = '';
}

function cancelarEditOpos() { limpiarFormOpos(); _opos_setListaVisible(true); }

function editarOpos(i) {
  const lista = getOposLocal();
  const r = lista[i];
  if (!r) return;
  _editIdx = i;

  document.getElementById('upd-opos-form-title').textContent = 'Editando: ' + r.convocatoria;
  document.getElementById('upd-opos-cancelar').style.display = 'inline-flex';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val||''; };
  set('upd-opos-perfil',        r.perfil);
  set('upd-opos-conv',          r.convocatoria);
  set('upd-opos-grupo',         r.grupo);
  set('upd-opos-estado',        r.estado);
  set('upd-opos-tasa',          r.tasa_pagada);
  set('upd-opos-fase',          r.fase);
  set('upd-opos-tipo-proceso',  r.tipo_proceso);
  set('upd-opos-tope-meritos',  r.tope_meritos != null ? String(r.tope_meritos) : '');
  set('upd-opos-req-euskera',   r.req_euskera === true ? 'true' : r.req_euskera === false ? 'false' : '');
  set('upd-opos-nivel-euskera', r.nivel_euskera);
  // IT Txartelas
  const itReqs = r.req_it_txartelas || [];
  const itCb = document.getElementById('upd-opos-req-it');
  if (itCb) { itCb.checked = itReqs.length > 0; opos_toggleItReqs(itReqs.length > 0); }
  document.querySelectorAll('.it-req-check').forEach(c => { c.checked = itReqs.includes(c.value); });
  if (itReqs.length > 0) opos_itSemaforo();
  set('upd-opos-fecha-examen', r.fecha_examen);
  set('upd-opos-hora-examen',  r.hora_examen);
  set('upd-opos-fecha-apertura',r.fecha_apertura);
  set('upd-opos-fecha-fin',    r.fecha_fin_inscr);
  set('upd-opos-fecha-lprov',  r.fecha_lista_prov);
  set('upd-opos-fecha-aleg',   r.fecha_alegaciones);
  set('upd-opos-fecha-ldef',   r.fecha_lista_def);
  // Docs
  ['solicitud','titulacion','euskera','dni','cv','meritos','discap'].forEach(k => set('upd-opos-doc-'+k, r['doc_'+k]));
  set('upd-opos-doc-e1-nombre', r.doc_extra1_nombre); set('upd-opos-doc-e1', r.doc_extra1);
  set('upd-opos-doc-e2-nombre', r.doc_extra2_nombre); set('upd-opos-doc-e2', r.doc_extra2);
  set('upd-opos-doc-e3-nombre', r.doc_extra3_nombre); set('upd-opos-doc-e3', r.doc_extra3);
  // Méritos
  const m = r.meritos_calc || {};
  set('upd-opos-m-misma',   m.meses_misma);
  set('upd-opos-m-otras',   m.meses_otras);
  set('upd-opos-m-priv',    m.meses_priv);
  set('upd-opos-m-euskera', m.euskera);
  set('upd-opos-m-tit',     m.tit_extra);
  // Cursos
  const cont = document.getElementById('upd-opos-cursos-container');
  cont.innerHTML = '';
  (m.cursos||[]).forEach(c => addCursoFila(c));
  // Bolsa
  const cb = document.getElementById('upd-opos-bolsa-entra'); if (cb) cb.checked = r.bolsa_entrada||false;
  set('upd-opos-bolsa-fecha',    r.bolsa_fecha);
  set('upd-opos-bolsa-pos',      r.bolsa_posicion);
  set('upd-opos-bolsa-llamadas', r.bolsa_llamadas);
  set('upd-opos-bolsa-notas',    r.bolsa_notas);
  // URLs
  set('upd-opos-url-boe',     r.url_boe);
  set('upd-opos-url-bases',   r.url_bases);
  set('upd-opos-url-temario', r.url_temario);
  set('upd-opos-url-e1',      r.url_extra1);
  set('upd-opos-url-e2',      r.url_extra2);

  // Scroll al formulario
  document.getElementById('upd-opos-form-title').scrollIntoView({ behavior:'smooth', block:'start' });

  // Activar tab de la sección actualizar
  document.querySelector('[data-tab="upd-oposiciones"]')?.click();

  // Ocultar lista mientras se edita
  _opos_setListaVisible(false);
  opos_liveMeritos();
}

function addCursoFila(datos) {
  const cont = document.getElementById('upd-opos-cursos-container');
  const div = document.createElement('div');
  div.className = 'curso-fila';
  div.innerHTML = `
    <input type="text"   class="curso-nombre" placeholder="Nombre del curso" value="${(datos && datos.nombre) || ''}" />
    <input type="number" class="curso-horas"  placeholder="Horas" min="1" max="999" value="${(datos && datos.horas) || ''}" oninput="opos_liveMeritos()" />
    <button class="btn-danger" onclick="this.parentElement.remove()" style="flex-shrink:0">✕</button>`;
  cont.appendChild(div);
}

function borrarOposLocal(i) {
  const lista = getOposLocal();
  lista.splice(i, 1);
  saveOposLocal(lista);
  renderUpdOposList();
  loadOposiciones();
}

function renderUpdOposList() {
  const lista = getOposLocal();
  const el = document.getElementById('upd-opos-lista');
  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem;padding:8px 0">No hay convocatorias guardadas localmente.</p>';
    return;
  }
  el.innerHTML = lista.map((e, i) => `
    <div class="update-list-item">
      <div class="update-list-item-info">
        <div class="update-list-item-title">${e.convocatoria}</div>
        <div class="update-list-item-sub">
          ${badgePerfil(e.perfil)} &nbsp; ${badgeEstado(e.estado)}
          ${e.fecha_examen ? ` · ${formatFecha(e.fecha_examen)}` : ''}
          ${calcMeritosTotal(e) > 0 ? ` · <span style="color:var(--accent2)">${calcMeritosTotal(e).toFixed(2)} pts</span>` : ''}
        </div>
      </div>
      <div class="update-list-item-actions">
        <button class="btn-secondary" onclick="editarOpos(${i})" style="padding:6px 12px;font-size:.8rem">Editar</button>
        <button class="btn-danger" onclick="borrarOposLocal(${i})">Eliminar</button>
      </div>
    </div>`).join('');
}

/* ════════════════════════════════
   FINANZAS
════════════════════════════════ */
function setupUpdFinanzas() {
  const _d = new Date(); const hoy = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
  const fechaEl = document.getElementById('ufin-fecha');
  if (fechaEl) fechaEl.value = hoy;
  const fmdFecha = document.getElementById('fin-fmd-fecha');
  if (fmdFecha) fmdFecha.value = hoy;

  // Cargar wishlist guardada
  const fin = Store.get('local_finanzas', null);
  const comprasEl = document.getElementById('upd-fin-compras');
  if (comprasEl && fin?.compras) comprasEl.value = fin.compras;

  // Load saved saldos into inputs
  ufin_cargarSaldosInputs();
  // Load custom categories
  ufin_renderCatsExtra();
  // Load recent manual transactions
  ufin_renderRecientes();
  // Load iPhone info
  ufin_renderIphoneInfo();
  // Poner fecha de hoy en el input de intereses FM y cargar histórico
  const intFecha = document.getElementById('ufin-int-fecha');
  if (intFecha) intFecha.value = hoy;
  ufin_renderInteresFM();
  // Poner mes actual en el input de patrimonio y cargar lista
  const patrMes = document.getElementById('ufin-patr-mes');
  if (patrMes) {
    const _d2 = new Date();
    patrMes.value = `${_d2.getFullYear()}-${String(_d2.getMonth()+1).padStart(2,'0')}`;
  }
  ufin_renderPatrimonio();
}

/* ══ CATEGORÍAS EXTRA ══ */
function ufin_getCatsExtra() {
  return Store.get('fin_cats_extra', []);
}

function ufin_renderCatsExtra() {
  const cats = ufin_getCatsExtra();
  const container = document.getElementById('ufin-cats-extra');
  if (!container) return;
  const select = document.getElementById('ufin-cat');

  // Remove old custom options from select
  Array.from(select?.options || []).forEach(opt => { if (opt.dataset.custom) opt.remove(); });

  cats.forEach(cat => {
    // Add to select
    if (select) {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.icon + ' ' + cat.label;
      opt.dataset.custom = '1';
      select.appendChild(opt);
    }
    // Show pill with delete
    const pill = document.createElement('span');
    pill.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:var(--bg4);border:1px solid var(--border);border-radius:99px;padding:3px 10px;font-size:.75rem;color:var(--text2)';
    pill.innerHTML = `${cat.icon} ${cat.label} <button onclick="ufin_borrarCat('${cat.id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:0;font-size:.85rem;line-height:1">✕</button>`;
    container.appendChild(pill);
  });
}

function ufin_nuevaCat() {
  const label = prompt('Nombre de la nueva categoría (ej: Mascotas):');
  if (!label?.trim()) return;
  const icon = prompt('Emoji/icono (ej: 🐶):') || '•';
  const id = 'custom_' + label.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  const cats = ufin_getCatsExtra();
  if (cats.find(c => c.id === id)) { alert('Ya existe esa categoría.'); return; }
  cats.push({ id, label: label.trim(), icon: icon.trim() });
  Store.set('fin_cats_extra', cats);
  const container = document.getElementById('ufin-cats-extra');
  if (container) container.innerHTML = '';
  ufin_renderCatsExtra();
  // Also register in CAT_META if finanzas module loaded
  if (typeof CAT_META !== 'undefined') CAT_META[id] = { label: label.trim(), icon: icon.trim(), color: 'var(--text2)' };
}

function ufin_borrarCat(id) {
  const cats = ufin_getCatsExtra().filter(c => c.id !== id);
  Store.set('fin_cats_extra', cats);
  const container = document.getElementById('ufin-cats-extra');
  if (container) container.innerHTML = '';
  ufin_renderCatsExtra();
}

/* ══ TIPO TOGGLE ══ */
let _ufinTipo = 'gasto';
function ufinSetTipo(tipo) {
  _ufinTipo = tipo;
  const btnG = document.getElementById('ufin-btn-gasto');
  const btnI = document.getElementById('ufin-btn-ingreso');
  if (!btnG || !btnI) return;
  btnG.className = 'ufin-tipo-btn' + (tipo === 'gasto'   ? ' ufin-tipo-btn--active-red'   : '');
  btnI.className = 'ufin-tipo-btn' + (tipo === 'ingreso' ? ' ufin-tipo-btn--active-green' : '');
}

/* ══ GUARDAR MOVIMIENTO ══ */
function ufin_guardarMovimiento() {
  const fecha  = document.getElementById('ufin-fecha')?.value;
  const impRaw = parseFloat(document.getElementById('ufin-importe')?.value);
  const desc   = document.getElementById('ufin-desc')?.value?.trim();
  const cat    = document.getElementById('ufin-cat')?.value;
  const cuenta = document.getElementById('ufin-cuenta')?.value;
  const nota   = document.getElementById('ufin-nota')?.value?.trim();

  if (!fecha || isNaN(impRaw) || impRaw <= 0 || !desc || !cat || !cuenta) {
    alert('Rellena fecha, importe, descripción, categoría y cuenta.'); return;
  }
  const importe = _ufinTipo === 'ingreso' ? impRaw : -impRaw;
  const local = Store.get('fin_txns', []);
  local.push({ f: fecha, i: importe, d: desc, c: cat, ct: cuenta, ref: nota || undefined });
  Store.set('fin_txns', local);

  // Clear fields (keep fecha, cuenta, cat)
  document.getElementById('ufin-importe').value = '';
  document.getElementById('ufin-desc').value = '';
  document.getElementById('ufin-nota').value = '';

  const ok = document.getElementById('ufin-ok');
  if (ok) { ok.style.display = 'inline'; setTimeout(() => ok.style.display = 'none', 2500); }

  // Auto-sync: ajustar el input de saldo de la cuenta usada
  const cuentaMap = { KTX:'ufin-s-ktx', RVP:'ufin-s-rvp', RVC:'ufin-s-rvc', CTV:'ufin-s-ctv', BP:'ufin-s-bp' };
  const saldoInputId = cuentaMap[cuenta];
  if (saldoInputId) {
    const saldoEl = document.getElementById(saldoInputId);
    if (saldoEl && saldoEl.value) {
      const saldoActual = parseFloat(saldoEl.value) || 0;
      saldoEl.value = (saldoActual + importe).toFixed(2);
      saldoEl.style.background = 'var(--green)18';
      setTimeout(() => saldoEl.style.background = '', 2000);
    }
  }

  ufin_renderRecientes();

  // Refresh finanzas panels if loaded
  if (typeof renderFinTransacciones === 'function') renderFinTransacciones();
  if (typeof renderFinResumen === 'function') renderFinResumen();
  if (typeof renderFinStats === 'function') renderFinStats();
}

/* ══ RECIENTES ══ */
function ufin_renderRecientes() {
  const el = document.getElementById('ufin-recientes');
  if (!el) return;
  const local = Store.get('fin_txns', []);
  if (local.length === 0) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.82rem">Sin movimientos añadidos todavía.</p>';
    return;
  }

  // Custom cats from localStorage
  const catsExtra = ufin_getCatsExtra();
  const getLabel = c => {
    if (typeof CAT_META !== 'undefined' && CAT_META[c]) return CAT_META[c].icon + ' ' + CAT_META[c].label;
    const ec = catsExtra.find(x => x.id === c);
    return ec ? ec.icon + ' ' + ec.label : c;
  };
  const getCtaColor = ct => {
    const colors = { KTX:'#60a5fa', RVP:'#a78bfa', RVC:'#f472b6', CTV:'#34d399', BP:'#fbbf24' };
    return colors[ct] || 'var(--text2)';
  };

  const sorted = [...local].reverse();
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:.78rem;color:var(--text3)">
      <span>${local.length} movimiento${local.length!==1?'s':''} guardado${local.length!==1?'s':''}</span>
      <button onclick="ufin_borrarTodos()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:.75rem">🗑 Borrar todos</button>
    </div>
    ${sorted.slice(0,20).map((t, revIdx) => {
      const realIdx = local.length - 1 - revIdx;
      return `
      <div style="display:grid;grid-template-columns:80px 1fr auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:.78rem;color:var(--text3)">${t.f}</span>
        <div>
          <div style="font-size:.85rem;font-weight:600">${t.d}</div>
          <div style="font-size:.72rem;color:var(--text3)">${getLabel(t.c)} · <span style="color:${getCtaColor(t.ct)}">${t.ct}</span>${t.ref?' · '+t.ref:''}</div>
        </div>
        <span style="font-weight:700;color:${t.i>=0?'var(--green)':'var(--red)'};font-size:.9rem">${t.i>=0?'+':''}${Fmt.eur2(t.i)}</span>
        <button onclick="ufin_borrar(${realIdx})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.9rem;padding:2px 6px" title="Eliminar">✕</button>
      </div>`;
    }).join('')}
    ${local.length > 20 ? `<p style="font-size:.75rem;color:var(--text3);margin-top:8px">… y ${local.length-20} más. Ve a Finanzas → Transacciones para verlos todos.</p>` : ''}`;
}

function ufin_borrar(idx) {
  const local = Store.get('fin_txns', []);
  local.splice(idx, 1);
  Store.set('fin_txns', local);
  ufin_renderRecientes();
  if (typeof renderFinTransacciones === 'function') renderFinTransacciones();
  if (typeof renderFinResumen === 'function') renderFinResumen();
}

function ufin_borrarTodos() {
  if (!confirm('¿Borrar todos los movimientos añadidos manualmente?')) return;
  localStorage.removeItem('fin_txns');
  ufin_renderRecientes();
  if (typeof renderFinTransacciones === 'function') renderFinTransacciones();
  if (typeof renderFinResumen === 'function') renderFinResumen();
}

/* ══ SALDOS ══ */
function ufin_cargarSaldosInputs() {
  if (typeof getSaldosActuales !== 'function') return;
  const s = getSaldosActuales();
  const map = { ktx:'ufin-s-ktx', rvp:'ufin-s-rvp', rvc:'ufin-s-rvc', ctv:'ufin-s-ctv', bp:'ufin-s-bp', fm:'ufin-s-fm' };
  Object.entries(map).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el && s[k] !== undefined) el.value = s[k].toFixed(2);
  });
}

function ufin_guardarSaldos() {
  const ids = ['ktx','rvp','rvc','ctv','bp','fm'];
  const data = {};
  let ok = true;
  ids.forEach(id => {
    const v = parseFloat(document.getElementById('ufin-s-'+id)?.value);
    if (isNaN(v)) { ok = false; }
    else data[id] = v;
  });
  if (!ok) { alert('Revisa los valores — deben ser números.'); return; }
  const prev = Store.get('fin_saldos', {});
  const now  = Date.now();
  ids.forEach(id => { if (data[id] !== prev[id]) data[id + '_ts'] = now; else if (prev[id + '_ts']) data[id + '_ts'] = prev[id + '_ts']; });
  data._ts = now;
  Store.set('fin_saldos', data);
  const okEl = document.getElementById('ufin-saldos-ok');
  if (okEl) { okEl.style.display='inline'; setTimeout(()=>okEl.style.display='none',2500); }
  if (typeof renderFinStats === 'function') renderFinStats();
  if (typeof renderFinSinking === 'function') renderFinSinking();

}

function ufin_resetSaldos() {
  if (!confirm('¿Restaurar los saldos originales de los PDFs?')) return;
  localStorage.removeItem('fin_saldos');
  ufin_cargarSaldosInputs();
  if (typeof renderFinStats === 'function') renderFinStats();
  if (typeof renderFinSinking === 'function') renderFinSinking();

}

/* ══ CUOTA IPHONE ══ */
function ufin_renderIphoneInfo() {
  const el = document.getElementById('ufin-iphone-info');
  if (!el || typeof FIN_DATA === 'undefined') return;
  const d = FIN_DATA.deudas[0];
  const extra = parseInt(Store.get('fin_cuotas_extra', '0'));
  const pagadas = d.cuotas_pagadas + extra;
  const restantes = Math.max(0, d.cuotas_total - pagadas);
  const pct = Math.min(100, Math.round(pagadas / d.cuotas_total * 100));
  const col = pct >= 80 ? 'var(--green)' : pct >= 40 ? 'var(--accent)' : 'var(--yellow)';
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:.82rem;color:var(--text3)">
        <strong style="color:${col};font-size:1.05rem">${pagadas}</strong>/${d.cuotas_total} cuotas pagadas
      </span>
      <span style="font-size:.8rem;color:var(--red);font-weight:600">${fmt(restantes * d.importe_cuota)} pendiente</span>
    </div>
    <div style="height:10px;border-radius:99px;background:var(--surface2);overflow:hidden;margin-bottom:10px">
      <div style="height:100%;width:${pct}%;background:${col};border-radius:99px;transition:.4s"></div>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn-primary" onclick="ufin_cuotaIphone(1)" style="padding:6px 14px;font-size:.82rem">✅ Marcar cuota pagada</button>
      <button onclick="ufin_cuotaIphone(-1)" style="background:transparent;border:1px solid var(--border);color:var(--text2);padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.8rem">↩ Deshacer</button>
    </div>`;
}

function ufin_cuotaIphone(delta) {
  const actual = parseInt(Store.get('fin_cuotas_extra', '0'));
  const nuevo = Math.max(0, actual + delta);
  Store.set('fin_cuotas_extra', String(nuevo));
  ufin_renderIphoneInfo();
  if (typeof renderFinDeudas === 'function') renderFinDeudas();
  if (typeof renderFinStats === 'function') renderFinStats();

}

/* ════════════════════════════════
   INTERESES FONDO MONETARIO
   Clave localStorage: cdc_intereses_fm
   Formato: [{ fecha, importe }]
════════════════════════════════ */

// Devuelve el listado de intereses guardados
function ufin_getInteresFM() {
  return Store.get('cdc_intereses_fm', []);
}

// Renderiza el histórico de intereses y el total acumulado
function ufin_renderInteresFM() {
  const lista = ufin_getInteresFM();
  const total = lista.reduce((s, e) => s + (parseFloat(e.importe) || 0), 0);

  const totalEl = document.getElementById('ufin-int-total');
  if (totalEl) totalEl.textContent = lista.length
    ? `Total acumulado: ${total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €`
    : '';

  const listaEl = document.getElementById('ufin-int-lista');
  if (!listaEl) return;
  if (!lista.length) { listaEl.innerHTML = '<p style="font-size:.75rem;color:var(--text3)">Sin registros aún.</p>'; return; }

  const sorted = [...lista].sort((a, b) => b.fecha.localeCompare(a.fecha));
  listaEl.innerHTML = sorted.map(e => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:.8rem">
      <span style="color:var(--text2)">${e.fecha}</span>
      <span style="color:var(--green);font-weight:600">+${parseFloat(e.importe).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €</span>
      <button onclick="ufin_delInteresFM('${e.fecha}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem;padding:0 4px">✕</button>
    </div>`).join('');
}

// Guarda un nuevo registro de interés FM
function ufin_addInteresFM() {
  const fecha   = document.getElementById('ufin-int-fecha')?.value;
  const importe = parseFloat(document.getElementById('ufin-int-importe')?.value);
  if (!fecha || isNaN(importe) || importe <= 0) { alert('Indica fecha e importe válido.'); return; }

  const lista = ufin_getInteresFM();
  // Reemplaza si ya existe entrada para la misma fecha
  const idx = lista.findIndex(e => e.fecha === fecha);
  if (idx >= 0) lista[idx].importe = importe;
  else lista.push({ fecha, importe });

  Store.set('cdc_intereses_fm', lista);

  // Actualizar fin_saldos.fm con el nuevo total para que Supabase lo persista
  if (typeof getSaldosActuales === 'function') {
    const s = getSaldosActuales();
    const saldos = Store.get('fin_saldos', {});
    saldos.fm = s.fm;
    saldos._ts = Date.now();
    Store.set('fin_saldos', saldos);
  }

  document.getElementById('ufin-int-importe').value = '';
  mostrarOk('ufin-int-ok');
  ufin_renderInteresFM();
  if (typeof renderFinSinking === 'function') renderFinSinking();
  if (typeof renderFinStats === 'function') renderFinStats();
}

// Borra el registro de interés de una fecha concreta
function ufin_delInteresFM(fecha) {
  const lista = ufin_getInteresFM().filter(e => e.fecha !== fecha);
  Store.set('cdc_intereses_fm', lista);
  ufin_renderInteresFM();
}

/* ════════════════════════════════
   HISTORIAL PATRIMONIO MANUAL
   Clave localStorage: cdc_patrimonio_hist
════════════════════════════════ */

// Renderiza la lista de snapshots guardados
function ufin_renderPatrimonio() {
  const el = document.getElementById('ufin-patr-lista');
  if (!el) return;
  const hist = Store.get('cdc_patrimonio_hist', []).sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!hist.length) { el.innerHTML = '<p style="font-size:.75rem;color:var(--text3)">Sin registros aún.</p>'; return; }
  const fmt2 = v => (parseFloat(v)||0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  el.innerHTML = hist.map(h => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:.78rem;gap:8px;flex-wrap:wrap">
      <span style="color:var(--text2);min-width:70px;font-weight:600">${h.mes}</span>
      <span style="color:var(--accent2);font-weight:700">${fmt2(h.total)} €</span>
      <span style="color:var(--text3);font-size:.72rem">KTX ${fmt2(h.ktx)} · RVP ${fmt2(h.rvp)} · CTV ${fmt2(h.ctv)} · FM ${fmt2(h.fm)}</span>
      <button onclick="ufin_delPatrimonio('${h.fecha}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem;padding:0 4px">✕</button>
    </div>`).join('');
}

// Guarda un snapshot manual de un mes pasado
function ufin_addPatrimonio() {
  const mes = document.getElementById('ufin-patr-mes')?.value; // YYYY-MM
  if (!mes) { alert('Indica el mes.'); return; }
  const get = id => parseFloat(document.getElementById('ufin-patr-'+id)?.value) || 0;
  const ktx = get('ktx'), rvp = get('rvp'), rvc = get('rvc'), ctv = get('ctv'), bp = get('bp'), fm = get('fm');
  const total = ktx + rvp + rvc + ctv + bp + fm;
  const d = new Date(mes + '-01');
  const mesLabel = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const hist = Store.get('cdc_patrimonio_hist', []);
  const idx = hist.findIndex(h => h.fecha === mes);
  const snap = { fecha: mes, mes: mesLabel, total, ktx, rvp, rvc, ctv, bp, fm };
  if (idx >= 0) hist[idx] = snap; else hist.push(snap);
  Store.set('cdc_patrimonio_hist', hist);
  ['ktx','rvp','rvc','ctv','bp','fm'].forEach(id => { const e = document.getElementById('ufin-patr-'+id); if(e) e.value=''; });
  mostrarOk('ufin-patr-ok');
  ufin_renderPatrimonio();
  if (typeof fin_patrRenderChart === 'function') fin_patrRenderChart();
}

// Borra un snapshot por su clave de fecha (YYYY-MM)
function ufin_delPatrimonio(fecha) {
  const hist = Store.get('cdc_patrimonio_hist', []).filter(h => h.fecha !== fecha);
  Store.set('cdc_patrimonio_hist', hist);
  ufin_renderPatrimonio();
  if (typeof fin_patrRenderChart === 'function') fin_patrRenderChart();
}

function aplicarFinanzasLocales(datos) {
  if (datos.compras) {
    const ul = document.getElementById('fin-compras');
    if (ul) ul.innerHTML = datos.compras.split('\n').filter(l=>l.trim()).map(l=>`<li>${l.trim()}</li>`).join('');
  }
}

/* ════════════════════════════════
   CASA
════════════════════════════════ */

/* ════════════════════════════════
   CARNET
════════════════════════════════ */
function setupUpdCarnet() {
  const _d = new Date(); const hoy = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
  ['upd-car-prac-fecha'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = hoy;
  });
}

/* ════════════════════════════════
   AGENDA
════════════════════════════════ */
// ── Helpers de agenda ──
function age_getDatos() { return Store.get('local_agenda'); }
function age_saveDatos(d) { Store.set('local_agenda', d); loadAgenda(); }

function age_parseCumples(txt) {
  return (txt || '').split('\n').filter(l => l.trim()).map(l => {
    const m = l.match(/(\d{1,2})[\/\-](\d{1,2})/);
    const nombre = l.replace(/[\-—]\s*\d{1,2}[\/\-]\d{1,2}/, '').replace(/\d{1,2}[\/\-]\d{1,2}/, '').trim() || l.trim();
    return { nombre, fecha: m ? m[1].padStart(2,'0') + '/' + m[2].padStart(2,'0') : '' };
  });
}
function age_parseEventos(txt) {
  return (txt || '').split('\n').filter(l => l.trim()).map(l => {
    const m = l.match(/(\d{4}-\d{2}-\d{2})|(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?/);
    const nombre = l.replace(/[\-—]\s*[\d\/\-]{5,}/, '').trim() || l.trim();
    let fecha = '';
    if (m) {
      if (m[1]) { const p = m[1].split('-'); fecha = p[2]+'/'+p[1]+'/'+p[0]; }
      else fecha = m[2].padStart(2,'0')+'/'+m[3].padStart(2,'0')+(m[4]?'/'+m[4]:'');
    }
    return { nombre, fecha };
  });
}

function setupUpdAgenda() {
  age_renderCumplesList();
  age_renderEventosList();
  age_renderVencList();
}

function age_addCumple() {
  const nombre = document.getElementById('age-new-cumple-nombre')?.value.trim();
  const fecha  = document.getElementById('age-new-cumple-fecha')?.value.trim();
  if (!nombre || !fecha) { alert('Rellena nombre y fecha (DD/MM)'); return; }
  if (!/^\d{2}\/\d{2}$/.test(fecha)) { alert('Formato de fecha: DD/MM (ej: 14/03)'); return; }
  const d = age_getDatos();
  const lineas = (d.cumples || '').split('\n').filter(l => l.trim());
  lineas.push(`${nombre} — ${fecha}`);
  d.cumples = lineas.join('\n');
  age_saveDatos(d);
  document.getElementById('age-new-cumple-nombre').value = '';
  document.getElementById('age-new-cumple-fecha').value = '';
  age_renderCumplesList();
}

function age_addEvento() {
  const nombre    = document.getElementById('age-new-evento-nombre')?.value.trim();
  const fechaISO  = document.getElementById('age-new-evento-fecha')?.value;
  const hora      = document.getElementById('age-new-evento-hora')?.value || '';
  const cat       = document.getElementById('age-new-evento-cat')?.value || 'personal';
  const ubicacion = document.getElementById('age-new-evento-ubicacion')?.value.trim() || '';
  const notas     = document.getElementById('age-new-evento-notas')?.value.trim() || '';
  if (!nombre || !fechaISO) { alert('Rellena descripción y fecha'); return; }

  // Guardar como estructura JSON
  const ev = { id: Date.now(), nombre, fecha: fechaISO, hora, cat, ubicacion, notas };
  const lista = Store.get('age_eventos_struct', []);
  lista.push(ev);
  Store.set('age_eventos_struct', lista);

  // También actualizar el texto legacy para compatibilidad con parser de calendario antiguo
  const [y, m, dd] = fechaISO.split('-');
  const d = age_getDatos();
  const lineas = (d.eventos || '').split('\n').filter(l => l.trim());
  lineas.push(`${nombre} — ${dd}/${m}/${y}`);
  d.eventos = lineas.join('\n');
  age_saveDatos(d);

  ['age-new-evento-nombre','age-new-evento-fecha','age-new-evento-hora','age-new-evento-ubicacion','age-new-evento-notas'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  age_renderEventosList();
}

function age_addVenc() {
  const nombre = document.getElementById('age-new-venc-nombre')?.value.trim();
  const fechaISO = document.getElementById('age-new-venc-fecha')?.value;
  if (!nombre || !fechaISO) { alert('Rellena descripción y fecha'); return; }
  const [y, m, dd] = fechaISO.split('-');
  const d = age_getDatos();
  const lineas = (d.vencimientos || '').split('\n').filter(l => l.trim());
  lineas.push(`${nombre} — ${dd}/${m}/${y}`);
  d.vencimientos = lineas.join('\n');
  age_saveDatos(d);
  document.getElementById('age-new-venc-nombre').value = '';
  document.getElementById('age-new-venc-fecha').value = '';
  age_renderVencList();
}

function age_deleteCumple(idx) {
  const d = age_getDatos();
  const lineas = (d.cumples || '').split('\n').filter(l => l.trim());
  lineas.splice(idx, 1);
  d.cumples = lineas.join('\n');
  age_saveDatos(d);
  age_renderCumplesList();
}
function age_deleteEventoStruct(idx) {
  const lista = Store.get('age_eventos_struct', []);
  lista.splice(idx, 1);
  Store.set('age_eventos_struct', lista);
  age_renderEventosList();
}
function age_deleteEvento(idx) {
  const d = age_getDatos();
  const lineas = (d.eventos || '').split('\n').filter(l => l.trim());
  lineas.splice(idx, 1);
  d.eventos = lineas.join('\n');
  age_saveDatos(d);
  age_renderEventosList();
}
function age_deleteVenc(idx) {
  const d = age_getDatos();
  const lineas = (d.vencimientos || '').split('\n').filter(l => l.trim());
  lineas.splice(idx, 1);
  d.vencimientos = lineas.join('\n');
  age_saveDatos(d);
  age_renderVencList();
}

function age_renderCumplesList() {
  const el = document.getElementById('age-cumples-list'); if (!el) return;
  const d = age_getDatos();
  const lineas = (d.cumples || '').split('\n').filter(l => l.trim());
  if (!lineas.length) { el.innerHTML = '<p style="color:var(--text3);font-size:.82rem">Sin cumpleaños añadidos.</p>'; return; }
  el.innerHTML = lineas.map((l, i) => `
    <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:var(--radius-sm);padding:7px 10px">
      <span style="flex:1;font-size:.85rem">${l.trim()}</span>
      <button class="btn-danger" onclick="age_deleteCumple(${i})" style="padding:3px 8px;font-size:.75rem">✕</button>
    </div>`).join('');
}
const _AGE_CAT_META = {
  personal:    { icon:'💙', color:'var(--blue)',    label:'Personal' },
  oposiciones: { icon:'📚', color:'var(--accent2)', label:'Oposiciones' },
  finanzas:    { icon:'💚', color:'var(--green)',   label:'Finanzas' },
  carnet:      { icon:'🚗', color:'var(--accent)',  label:'Carnet' },
  medico:      { icon:'💊', color:'var(--pink)',    label:'Médico' },
  familia:     { icon:'👨‍👩‍👧', color:'var(--yellow)', label:'Familia' },
  ocio:        { icon:'🎭', color:'var(--purple)',  label:'Ocio' },
  otro:        { icon:'📌', color:'var(--text3)',   label:'Otro' },
};
function age_renderEventosList() {
  const el = document.getElementById('age-eventos-list'); if (!el) return;

  // Eventos estructurados (nuevos)
  const struct = Store.get('age_eventos_struct', []);

  // Eventos legacy (texto)
  const d = age_getDatos();
  const lineas = (d.eventos || '').split('\n').filter(l => l.trim());

  if (!struct.length && !lineas.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.82rem">Sin eventos añadidos.</p>'; return;
  }

  const structHTML = struct.map((ev, i) => {
    const cm = _AGE_CAT_META[ev.cat] || _AGE_CAT_META.otro;
    return `<div style="background:var(--bg3);border-radius:var(--radius-sm);padding:9px 12px;border-left:3px solid ${cm.color}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:${ev.ubicacion||ev.notas?'5':'0'}px">
        <span style="font-size:.87rem;font-weight:600;flex:1">${cm.icon} ${ev.nombre}</span>
        <span style="font-size:.73rem;color:var(--text3)">${ev.fecha}${ev.hora?' · '+ev.hora:''}</span>
        <button class="btn-danger" onclick="age_deleteEventoStruct(${i})" style="padding:2px 7px;font-size:.72rem">✕</button>
      </div>
      ${ev.ubicacion?`<div style="font-size:.75rem;color:var(--text2)">📍 ${ev.ubicacion}</div>`:''}
      ${ev.notas?`<div style="font-size:.75rem;color:var(--text3);margin-top:3px">📝 ${ev.notas}</div>`:''}
    </div>`;
  }).join('');

  const legacyHTML = lineas.map((l, i) => `
    <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:var(--radius-sm);padding:7px 10px;opacity:.7">
      <span style="flex:1;font-size:.83rem;color:var(--text2)">📌 ${l.trim()}</span>
      <button class="btn-danger" onclick="age_deleteEvento(${i})" style="padding:3px 8px;font-size:.75rem">✕</button>
    </div>`).join('');

  el.innerHTML = structHTML + legacyHTML;
}
function age_renderVencList() {
  const el = document.getElementById('age-venc-list'); if (!el) return;
  const d = age_getDatos();
  const lineas = (d.vencimientos || '').split('\n').filter(l => l.trim());
  if (!lineas.length) { el.innerHTML = '<p style="color:var(--text3);font-size:.82rem">Sin vencimientos añadidos.</p>'; return; }
  el.innerHTML = lineas.map((l, i) => `
    <div style="display:flex;align-items:center;gap:8px;background:var(--bg3);border-radius:var(--radius-sm);padding:7px 10px">
      <span style="flex:1;font-size:.85rem">${l.trim()}</span>
      <button class="btn-danger" onclick="age_deleteVenc(${i})" style="padding:3px 8px;font-size:.75rem">✕</button>
    </div>`).join('');
}

/* ════════════════════════════════
   CARGA INICIAL
════════════════════════════════ */
function cargarValoresGuardados() {
  const fin = Store.get('local_finanzas', null);
  if (fin) {
    const comprasEl = document.getElementById('upd-fin-compras');
    if (comprasEl && fin.compras) comprasEl.value = fin.compras;
    aplicarFinanzasLocales(fin);
  }
  // Restaurar estado carnet desde car_config
  const carCfg        = Store.get('car_config');
  const selTeorico    = document.getElementById('upd-car-teorico-estado');
  const inpTeoricoF   = document.getElementById('upd-car-teorico-fecha');
  const selEstado     = document.getElementById('upd-car-prox-estado');
  const inpFecha      = document.getElementById('upd-car-prox-fecha');
  if (selTeorico  && carCfg.teorico_estado) selTeorico.value  = carCfg.teorico_estado;
  if (inpTeoricoF && carCfg.teorico_fecha)  inpTeoricoF.value = carCfg.teorico_fecha;
  if (selEstado   && carCfg.prox_estado)    selEstado.value   = carCfg.prox_estado;
  if (inpFecha    && carCfg.prox_fecha)     inpFecha.value    = carCfg.prox_fecha;
  // Cargar listas de agenda
  age_renderCumplesList();
  age_renderEventosList();
  age_renderVencList();
}

function ufin_guardarWishlist() {
  const compras = document.getElementById('upd-fin-compras')?.value || '';
  const datos = Store.get('local_finanzas');
  datos.compras = compras;
  Store.set('local_finanzas', datos);
  mostrarOk('upd-fin-ok');
}

/* ── Helpers ── */
function mostrarOk(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function formatEuros(val) {
  return Fmt.eur2(val);
}
