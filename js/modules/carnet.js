// ─── MÓDULO CARNET ───

// Inicializar estado teórico como aprobado si aún no está definido
(function _carnetInit() {
  const cfg = Store.get('car_config');
  if (!cfg.teorico_estado) {
    cfg.teorico_estado = 'aprobado';
    Store.set('car_config', cfg);
  }
})();

function _fmtFecha(f) {
  if (!f) return '—';
  const num = parseFloat(f);
  if (!isNaN(num) && num > 40000 && num < 60000 && String(f).match(/^\d/)) {
    const corrected = num >= 60 ? num - 1 : num;
    const d = new Date(Math.round((corrected - 25568) * 86400 * 1000));
    return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  }
  const d = new Date(String(f).length === 10 ? f + 'T12:00:00' : f);
  if (isNaN(d)) return String(f);
  return d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Storage ──
function car_getPracticas() { return Store.get('car_practicas', []); }
function car_getConfig()    { return Store.get('car_config'); }
function car_savePracticas(d) { Store.set('car_practicas', d); }


function car_borrarPractica(i) { const d = car_getPracticas(); d.splice(i,1); car_savePracticas(d); loadCarnet(); }

// ── Carga principal ──
function loadCarnet() {
  const practicas = car_getPracticas().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const cfg       = car_getConfig();

  // Rellenar inputs de estado teórico
  const selTeorico     = document.getElementById('upd-car-teorico-estado');
  const inpTeoricoFech = document.getElementById('upd-car-teorico-fecha');
  if (selTeorico     && cfg.teorico_estado !== undefined) selTeorico.value     = cfg.teorico_estado;
  if (inpTeoricoFech && cfg.teorico_fecha)                inpTeoricoFech.value = cfg.teorico_fecha;

  // Rellenar inputs de examen práctico
  const selEstado = document.getElementById('upd-car-prox-estado');
  const inpFecha  = document.getElementById('upd-car-prox-fecha');
  if (selEstado && cfg.prox_estado !== undefined) selEstado.value = cfg.prox_estado;
  if (inpFecha  && cfg.prox_fecha)                inpFecha.value  = cfg.prox_fecha;

  renderCarStats(practicas, cfg);
  renderCarPracticas(practicas);
  coche_renderAhorro();
}

// ── Stats ──
function renderCarStats(practicas, cfg = {}) {
  const estadoEl = document.getElementById('car-teorico-estado');
  if (estadoEl) {
    const ts = cfg.teorico_estado;
    if (ts === 'aprobado') {
      const fechaStr = cfg.teorico_fecha
        ? ' · ' + new Date(cfg.teorico_fecha + 'T12:00:00').toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })
        : '';
      estadoEl.innerHTML = `✅ Aprobado<div style="font-size:.7rem;color:var(--text3);font-weight:400;margin-top:3px">${fechaStr}</div>`;
      estadoEl.style.color = 'var(--green)';
      estadoEl.style.fontSize = '1rem';
    } else if (ts === 'suspendido') {
      estadoEl.textContent = '❌ Suspendido';
      estadoEl.style.color = 'var(--red)';
      estadoEl.style.fontSize = '1rem';
    } else {
      estadoEl.textContent = '—';
      estadoEl.style.color = '';
      estadoEl.style.fontSize = '';
    }
  }

  const proxEl = document.getElementById('car-proxima');
  if (proxEl) {
    const estadoLabel = { pendiente:'⏳ Pendiente', en_proceso:'🔄 En proceso', convocado:'📅 Convocado' };
    if (cfg.prox_estado || cfg.prox_fecha) {
      const label = estadoLabel[cfg.prox_estado] || '';
      const fecha = cfg.prox_fecha ? new Date(cfg.prox_fecha + 'T12:00:00').toLocaleDateString('es-ES', {day:'2-digit',month:'short',year:'numeric'}) : '';
      const dias = cfg.prox_fecha ? (() => {
        const d = new Date(cfg.prox_fecha); d.setHours(0,0,0,0);
        const h = new Date(); h.setHours(0,0,0,0);
        const diff = Math.round((d-h)/86400000);
        return diff > 0 ? ` (en ${diff}d)` : diff === 0 ? ' (¡HOY!)' : '';
      })() : '';
      proxEl.innerHTML = `${label}${label && fecha ? '<br>' : ''}<span style="font-size:.85rem">${fecha}${dias}</span>`;
      proxEl.style.lineHeight = '1.4';
    } else {
      proxEl.textContent = '—';
    }
  }
}

// ── Panel Prácticas ──
function renderCarPracticas(practicas) {
  const el = document.getElementById('car-practicas-lista');
  if (!el) return;
  if (!practicas.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem">Sin clases registradas.</p>';
    return;
  }
  const totalMin = practicas.reduce((s,p) => s+(p.min||0), 0);
  const horas = Math.floor(totalMin/60), mins = totalMin%60;
  el.innerHTML = `
    <div style="margin-bottom:14px;font-size:.85rem;color:var(--text2)">
      <strong style="color:var(--accent2)">${practicas.length} clase${practicas.length!==1?'s':''}</strong> realizadas
      ${totalMin ? ` · <strong style="color:var(--accent2)">${horas}h${mins>0?' '+mins+'min':''}</strong> en total` : ''}
    </div>
    ${[...practicas].reverse().map((p, revI) => {
      const realIdx = practicas.length - 1 - revI;
      return `
      <div style="display:grid;grid-template-columns:100px auto 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:.8rem;color:var(--text3)">${_fmtFecha(p.fecha)}</span>
        ${p.min?`<span style="font-size:.78rem;color:var(--accent2);font-weight:600">${p.min} min</span>`:'<span></span>'}
        <span style="font-size:.82rem;color:var(--text2)">${p.nota||'—'}</span>
        <button onclick="car_borrarPractica(${realIdx})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.9rem;padding:2px 6px">✕</button>
      </div>`;
    }).join('')}`;
}

// ═══════════════════════════════════════════════════════════
//  AHORRO PARA EL COCHE
// ═══════════════════════════════════════════════════════════

const COCHE_META = 3000;

// ── Storage ──
function coche_getAportaciones() { return Store.get('cdc_ahorro_coche', []); }
function coche_saveAportaciones(data) { Store.set('cdc_ahorro_coche', data); }

// ── Render progreso e histórico ──
function coche_renderAhorro() {
  const aportaciones = coche_getAportaciones()
    .slice()
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  const total = aportaciones.reduce((s, a) => s + (parseFloat(a.importe) || 0), 0);
  const pct   = Math.min(100, (total / COCHE_META) * 100);
  const falta = Math.max(0, COCHE_META - total);

  // Barra y etiquetas
  const barraEl  = document.getElementById('coche-barra');
  const totalEl  = document.getElementById('coche-total-label');
  const pctEl    = document.getElementById('coche-pct-label');
  const faltaEl  = document.getElementById('coche-falta-label');

  if (barraEl)  barraEl.style.width  = pct.toFixed(1) + '%';
  if (barraEl)  barraEl.style.background = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--accent2)' : 'var(--accent)';
  if (totalEl)  totalEl.textContent  = _cocheEur(total);
  if (pctEl)    pctEl.textContent    = pct.toFixed(1) + '%';
  if (faltaEl)  faltaEl.textContent  = pct >= 100 ? '¡Meta alcanzada! 🎉' : `Faltan ${_cocheEur(falta)}`;

  // Histórico
  const histEl = document.getElementById('coche-historial');
  if (!histEl) return;

  if (!aportaciones.length) {
    histEl.innerHTML = '<p style="color:var(--text3);font-size:.87rem">Sin aportaciones registradas.</p>';
    return;
  }

  const allSorted = coche_getAportaciones().slice().sort((a, b) => a.fecha.localeCompare(b.fecha));

  histEl.innerHTML = `
    <div style="font-size:.78rem;color:var(--text3);margin-bottom:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em">
      ${aportaciones.length} aportación${aportaciones.length !== 1 ? 'es' : ''} · Total: ${_cocheEur(total)}
    </div>
    ${aportaciones.map((a, i) => {
      const realIdx = allSorted.length - 1 - i;
      return `
      <div style="display:grid;grid-template-columns:100px 80px 1fr auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:.8rem;color:var(--text3)">${_fmtFecha(a.fecha)}</span>
        <span style="font-size:.88rem;font-weight:700;color:var(--green)">+${_cocheEur(parseFloat(a.importe)||0)}</span>
        <span style="font-size:.82rem;color:var(--text2)">${a.nota || '—'}</span>
        <button onclick="coche_borrarAportacion(${realIdx})"
          style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.9rem;padding:2px 6px">✕</button>
      </div>`;
    }).join('')}`;
}

// ── Añadir aportación ──
function coche_addAportacion() {
  const fecha   = document.getElementById('coche-fecha')?.value;
  const importe = parseFloat(document.getElementById('coche-importe')?.value);
  const nota    = document.getElementById('coche-nota')?.value.trim() || '';

  if (!fecha || isNaN(importe) || importe <= 0) {
    alert('Indica fecha e importe válidos.');
    return;
  }

  const data = coche_getAportaciones();
  data.push({ fecha, importe: importe.toFixed(2), nota });
  coche_saveAportaciones(data);

  // Limpiar formulario
  const fechaEl = document.getElementById('coche-fecha');
  if (fechaEl) fechaEl.value = '';
  const importeEl = document.getElementById('coche-importe');
  if (importeEl) importeEl.value = '';
  const notaEl = document.getElementById('coche-nota');
  if (notaEl) notaEl.value = '';

  coche_renderAhorro();
}

// ── Borrar aportación ──
function coche_borrarAportacion(i) {
  const data = coche_getAportaciones().slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  data.splice(i, 1);
  coche_saveAportaciones(data);
  coche_renderAhorro();
}

// ── Helper formato € ──
function _cocheEur(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

