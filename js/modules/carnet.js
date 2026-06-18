// ─── MÓDULO CARNET ───

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
function car_getExamenes()  { return Store.get('car_examenes', []); }
function car_getPracticas() { return Store.get('car_practicas', []); }
function car_getConfig()    { return Store.get('car_config'); }
function car_saveExamenes(d)  { Store.set('car_examenes', d); }
function car_savePracticas(d) { Store.set('car_practicas', d); }

// ── Guardar estado examen teórico ──
function car_guardarTeoricoEstado() {
  const estado = document.getElementById('upd-car-teorico-estado')?.value;
  const fecha  = document.getElementById('upd-car-teorico-fecha')?.value;
  const cfg = car_getConfig();
  cfg.teorico_estado = estado;
  cfg.teorico_fecha  = fecha;
  Store.set('car_config', cfg);
  mostrarOk('upd-car-teorico-ok');
  loadCarnet();
}

// ── Guardar próxima convocatoria ──
function car_guardarProxima() {
  const estado = document.getElementById('upd-car-prox-estado')?.value;
  const fecha  = document.getElementById('upd-car-prox-fecha')?.value;
  const cfg = car_getConfig();
  cfg.prox_estado = estado;
  cfg.prox_fecha  = fecha;
  Store.set('car_config', cfg);
  mostrarOk('upd-car-prox-ok');
  loadCarnet();
}

// ── Guardar examen ──
function car_guardarExamen() {
  const fecha     = document.getElementById('upd-car-exam-fecha')?.value;
  const resultado = document.getElementById('upd-car-exam-resultado')?.value;
  const fallos    = parseInt(document.getElementById('upd-car-exam-fallos')?.value ?? '0');
  const nota      = document.getElementById('upd-car-exam-nota')?.value?.trim();

  if (!fecha) { alert('Indica la fecha del examen.'); return; }

  const examenes = car_getExamenes();
  examenes.push({ fecha, resultado, fallos: isNaN(fallos) ? 0 : fallos, nota: nota || '' });
  car_saveExamenes(examenes);

  document.getElementById('upd-car-exam-fallos').value = '';
  document.getElementById('upd-car-exam-nota').value = '';
  mostrarOk('upd-car-exam-ok');
  loadCarnet();
}

// ── Guardar práctica ──
function car_guardarPractica() {
  const fecha = document.getElementById('upd-car-prac-fecha')?.value;
  const min   = parseInt(document.getElementById('upd-car-prac-min')?.value ?? '0');
  const nota  = document.getElementById('upd-car-prac-nota')?.value?.trim();

  if (!fecha) { alert('Indica la fecha de la práctica.'); return; }

  const practicas = car_getPracticas();
  practicas.push({ fecha, min: isNaN(min) ? 0 : min, nota: nota || '' });
  car_savePracticas(practicas);

  document.getElementById('upd-car-prac-min').value = '';
  document.getElementById('upd-car-prac-nota').value = '';
  mostrarOk('upd-car-prac-ok');
  loadCarnet();
}

function car_borrarExamen(i)   { const d = car_getExamenes();  d.splice(i,1); car_saveExamenes(d);  loadCarnet(); }
function car_borrarPractica(i) { const d = car_getPracticas(); d.splice(i,1); car_savePracticas(d); loadCarnet(); }

// ── Carga principal ──
function loadCarnet() {
  const examenes  = car_getExamenes().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const practicas = car_getPracticas().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const cfg       = car_getConfig();

  // Rellenar inputs de estado teórico
  const selTeorico     = document.getElementById('upd-car-teorico-estado');
  const inpTeoricoFech = document.getElementById('upd-car-teorico-fecha');
  if (selTeorico     && cfg.teorico_estado !== undefined) selTeorico.value     = cfg.teorico_estado;
  if (inpTeoricoFech && cfg.teorico_fecha)                inpTeoricoFech.value = cfg.teorico_fecha;

  // Rellenar inputs de próxima convocatoria
  const selEstado = document.getElementById('upd-car-prox-estado');
  const inpFecha  = document.getElementById('upd-car-prox-fecha');
  if (selEstado && cfg.prox_estado !== undefined) selEstado.value = cfg.prox_estado;
  if (inpFecha  && cfg.prox_fecha)                inpFecha.value  = cfg.prox_fecha;

  renderCarStats(examenes, practicas, cfg);
  renderCarExamenes(examenes);
  renderCarPracticas(practicas);
  setupCarTabs();
}

// ── Stats ──
function renderCarStats(examenes, practicas, cfg = {}) {
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

// ── Panel Examen ──
function renderCarExamenes(examenes) {
  const el = document.getElementById('car-examenes-lista');
  if (!el) return;
  if (!examenes.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem">Sin intentos registrados. Añade desde ✏️ Actualizar → Carnet.</p>';
    return;
  }
  const aprobado = examenes.some(e => e.resultado === 'aprobado');
  el.innerHTML = `
    <div style="margin-bottom:16px;padding:12px 16px;background:${aprobado?'rgba(52,211,153,.1)':'rgba(239,68,68,.08)'};border:1px solid ${aprobado?'var(--green)':'var(--red)'};border-radius:var(--radius);font-weight:600;font-size:.95rem;color:${aprobado?'var(--green)':'var(--red)'}">
      ${aprobado ? '✅ Examen teórico APROBADO' : `❌ Examen teórico pendiente — ${examenes.length} intento${examenes.length!==1?'s':''}`}
    </div>
    ${[...examenes].reverse().map((e, revI) => {
      const realIdx = examenes.length - 1 - revI;
      return `
      <div style="display:grid;grid-template-columns:100px auto 1fr auto;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:.8rem;color:var(--text3)">${_fmtFecha(e.fecha)}</span>
        <span class="badge ${e.resultado==='aprobado'?'badge--green':'badge--red'}">${e.resultado==='aprobado'?'✅ Aprobado':'❌ Suspendido'}</span>
        <span style="font-size:.82rem;color:var(--text2)">${e.fallos?e.fallos+' fallos':''}${e.nota?(e.fallos?' · ':'')+e.nota:''}</span>
        <button onclick="car_borrarExamen(${realIdx})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.9rem;padding:2px 6px">✕</button>
      </div>`;
    }).join('')}`;
}

// ── Panel Prácticas ──
function renderCarPracticas(practicas) {
  const el = document.getElementById('car-practicas-lista');
  if (!el) return;
  if (!practicas.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem">Sin prácticas registradas. Añade desde ✏️ Actualizar → Carnet.</p>';
    return;
  }
  const totalMin = practicas.reduce((s,p) => s+(p.min||0), 0);
  const horas = Math.floor(totalMin/60), mins = totalMin%60;
  el.innerHTML = `
    <div style="margin-bottom:14px;font-size:.85rem;color:var(--text2)">
      <strong style="color:var(--accent2)">${practicas.length} prácticas</strong> realizadas
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

// ── Tabs ──
function setupCarTabs() {
  document.querySelectorAll('.car-tab').forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll('.car-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.car-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.cartab)?.classList.add('active');
    };
  });
}
