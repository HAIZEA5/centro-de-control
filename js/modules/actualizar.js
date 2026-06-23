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
   FINANZAS
════════════════════════════════ */
function setupUpdFinanzas() {
  const _d = new Date();
  const hoy = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;

  const fmdFecha = document.getElementById('fin-fmd-fecha');
  if (fmdFecha) fmdFecha.value = hoy;

  const intFecha = document.getElementById('ufin-int-fecha');
  if (intFecha) intFecha.value = hoy;

  const fin = Store.get('local_finanzas', null);
  const comprasEl = document.getElementById('upd-fin-compras');
  if (comprasEl && fin?.compras) comprasEl.value = fin.compras;

  ufin_cargarSaldosInputs();
  ufin_renderInteresFM();
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
  ids.forEach(id => {
    if (data[id] !== prev[id]) data[id + '_ts'] = now;
    else if (prev[id + '_ts']) data[id + '_ts'] = prev[id + '_ts'];
  });
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

/* ════════════════════════════════
   INTERESES FONDO MONETARIO
   Clave localStorage: cdc_intereses_fm
   Formato: [{ fecha, importe }]
════════════════════════════════ */
function ufin_getInteresFM() {
  return Store.get('cdc_intereses_fm', []);
}

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

function ufin_addInteresFM() {
  const fecha   = document.getElementById('ufin-int-fecha')?.value;
  const importe = parseFloat(document.getElementById('ufin-int-importe')?.value);
  if (!fecha || isNaN(importe) || importe <= 0) { alert('Indica fecha e importe válido.'); return; }

  const lista = ufin_getInteresFM();
  const idx = lista.findIndex(e => e.fecha === fecha);
  const importeAnterior = idx >= 0 ? (parseFloat(lista[idx].importe) || 0) : 0;
  if (idx >= 0) lista[idx].importe = importe;
  else lista.push({ fecha, importe });

  Store.set('cdc_intereses_fm', lista);

  const saldos = Store.get('fin_saldos', {});
  saldos.fm = parseFloat(((saldos.fm || 0) + importe - importeAnterior).toFixed(2));
  saldos.fm_ts = Date.now();
  saldos._ts = Date.now();
  Store.set('fin_saldos', saldos);

  document.getElementById('ufin-int-importe').value = '';
  mostrarOk('ufin-int-ok');
  ufin_renderInteresFM();
  if (typeof renderFinSinking === 'function') renderFinSinking();
  if (typeof renderFinStats === 'function') renderFinStats();
}

function ufin_delInteresFM(fecha) {
  const lista = ufin_getInteresFM();
  const entrada = lista.find(e => e.fecha === fecha);
  const importeEntrada = entrada ? (parseFloat(entrada.importe) || 0) : 0;
  Store.set('cdc_intereses_fm', lista.filter(e => e.fecha !== fecha));
  const saldos = Store.get('fin_saldos', {});
  saldos.fm = parseFloat(((saldos.fm || 0) - importeEntrada).toFixed(2));
  saldos._ts = Date.now();
  Store.set('fin_saldos', saldos);
  ufin_renderInteresFM();
  if (typeof renderFinSinking === 'function') renderFinSinking();
  if (typeof renderFinStats === 'function') renderFinStats();
}

function ufin_guardarWishlist() {
  const compras = document.getElementById('upd-fin-compras')?.value || '';
  const datos = Store.get('local_finanzas');
  datos.compras = compras;
  Store.set('local_finanzas', datos);
  mostrarOk('upd-fin-ok');
}

/* ════════════════════════════════
   AGENDA
════════════════════════════════ */
function age_getDatos() { return Store.get('local_agenda'); }
function age_saveDatos(d) { Store.set('local_agenda', d); loadAgenda(); }

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

  const ev = { id: Date.now(), nombre, fecha: fechaISO, hora, cat, ubicacion, notas };
  const lista = Store.get('age_eventos_struct', []);
  lista.push(ev);
  Store.set('age_eventos_struct', lista);

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

function age_renderEventosList() {
  const el = document.getElementById('age-eventos-list'); if (!el) return;

  const struct = Store.get('age_eventos_struct', []);
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

/* ── Helpers ── */
function mostrarOk(id) {
  const el = document.getElementById(id); if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}

function formatEuros(val) {
  return Fmt.eur2(val);
}
