// ─── MÓDULO CARNET ───

let carChart = null;

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

// Temas del temario DGT
const CAR_TEMAS_DGT = [
  'Señales de tráfico',
  'Preferencia de paso',
  'Velocidad y distancias',
  'Incorporación y cambio de carril',
  'Adelantamientos',
  'Alumbrado',
  'Cinturón, casco y SRI',
  'Alcohol, drogas y medicamentos',
  'Infracciones y sanciones',
  'Documentación y seguro',
  'Primeros auxilios',
  'Vías y calzadas',
  'Vehículos (carga y dimensiones)',
  'Medio ambiente y conducción eficiente',
  'Maniobras (aparcamiento, inversión de marcha)',
  'Autopistas y autovías',
  'Túneles y pasos a nivel',
  'Mixto / General',
];

// ── Storage ──
function car_getTests()     { return JSON.parse(localStorage.getItem('car_tests')     || '[]'); }
function car_getExamenes()  { return JSON.parse(localStorage.getItem('car_examenes')  || '[]'); }
function car_getPracticas() { return JSON.parse(localStorage.getItem('car_practicas') || '[]'); }
function car_getConfig()    { return JSON.parse(localStorage.getItem('car_config')    || '{}'); }
function car_getCatsExtra() { return JSON.parse(localStorage.getItem('car_cats_extra')|| '[]'); }
function car_saveTests(d)     { localStorage.setItem('car_tests',     JSON.stringify(d)); }
function car_saveExamenes(d)  { localStorage.setItem('car_examenes',  JSON.stringify(d)); }
function car_savePracticas(d) { localStorage.setItem('car_practicas', JSON.stringify(d)); }

function car_getTodosLosTemas() {
  return [...CAR_TEMAS_DGT, ...car_getCatsExtra().map(c => c.label)];
}

// ── Actualizar el select de temas en el formulario ──
function car_poblarSelectTema() {
  const sel = document.getElementById('upd-car-test-cat');
  if (!sel) return;
  const actual = sel.value;
  const temas = car_getTodosLosTemas();
  sel.innerHTML = '<option value="">— Categoría / Tema —</option>' +
    temas.map(t => `<option value="${t}"${t === actual ? ' selected' : ''}>${t}</option>`).join('') +
    '<option value="__nuevo__">+ Añadir categoría nueva…</option>';
}

// ── Actualizar el select de tests previos ──
function car_poblarSelectTest() {
  const sel = document.getElementById('upd-car-test-sel');
  if (!sel) return;
  const tests = car_getTests();
  const nums = [...new Set(tests.map(t => t.num))].sort((a, b) => a - b);
  sel.innerHTML = '<option value="">— Test nuevo —</option>' +
    nums.map(n => {
      const ultimo = tests.filter(t => t.num === n).sort((a,b) => b.fecha.localeCompare(a.fecha))[0];
      return `<option value="${n}">Test ${n}${ultimo.cat ? ' — ' + ultimo.cat : ultimo.tema ? ' — ' + ultimo.tema : ''}</option>`;
    }).join('');
}

// Cuando el usuario selecciona un test existente → rellena campos
function car_onSelectTest() {
  const sel = document.getElementById('upd-car-test-sel');
  const numInput = document.getElementById('upd-car-num');
  const catSel   = document.getElementById('upd-car-test-cat');
  const temaInput = document.getElementById('upd-car-test-tema');
  if (!sel) return;

  const num = parseInt(sel.value);
  if (!num) {
    if (numInput) numInput.value = '';
    return;
  }
  if (numInput) numInput.value = num;
  // Rellena categoría y tema del último intento
  const tests = car_getTests();
  const ultimo = tests.filter(t => t.num === num).sort((a,b) => b.fecha.localeCompare(a.fecha))[0];
  if (!ultimo) return;
  if (catSel && ultimo.cat) catSel.value = ultimo.cat;
  if (temaInput && ultimo.tema) temaInput.value = ultimo.tema;
}

// ── Guardar próxima convocatoria ──
function car_guardarProxima() {
  const estado = document.getElementById('upd-car-prox-estado')?.value;
  const fecha  = document.getElementById('upd-car-prox-fecha')?.value;
  const cfg = car_getConfig();
  cfg.prox_estado = estado;
  cfg.prox_fecha  = fecha;
  localStorage.setItem('car_config', JSON.stringify(cfg));
  mostrarOk('upd-car-prox-ok');
  loadCarnet();
}

// ── Guardar test ──
function car_guardarTest() {
  const selTest = document.getElementById('upd-car-test-sel');
  const numInput = document.getElementById('upd-car-num');
  let num = selTest?.value ? parseInt(selTest.value) : parseInt(numInput?.value);
  if (!num && numInput) num = parseInt(numInput.value);

  const fecha  = document.getElementById('upd-car-test-fecha')?.value;
  const fallos = parseInt(document.getElementById('upd-car-test-fallos')?.value ?? '0');
  let cat      = document.getElementById('upd-car-test-cat')?.value;
  const tema   = document.getElementById('upd-car-test-tema')?.value?.trim();

  if (!num || isNaN(num)) { alert('Indica el número de test.'); return; }
  if (!fecha) { alert('Indica la fecha.'); return; }

  // Si eligió "añadir nueva categoría"
  if (cat === '__nuevo__') {
    const nueva = prompt('Nombre de la nueva categoría:');
    if (!nueva?.trim()) { document.getElementById('upd-car-test-cat').value = ''; return; }
    const extras = car_getCatsExtra();
    if (!extras.find(c => c.label === nueva.trim())) {
      extras.push({ label: nueva.trim() });
      localStorage.setItem('car_cats_extra', JSON.stringify(extras));
    }
    cat = nueva.trim();
    car_poblarSelectTema();
    document.getElementById('upd-car-test-cat').value = cat;
  }

  const tests = car_getTests();
  tests.push({ num, fecha, fallos: isNaN(fallos) ? 0 : fallos, cat: cat || '', tema: tema || '' });
  car_saveTests(tests);

  // Limpiar (mantener fecha y categoría para el próximo)
  if (numInput) numInput.value = '';
  if (selTest) selTest.value = '';
  document.getElementById('upd-car-test-fallos').value = '';
  document.getElementById('upd-car-test-tema').value = '';

  mostrarOk('upd-car-test-ok');
  car_poblarSelectTest();
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

function car_borrarTest(i)     { const d = car_getTests().sort((a,b)=>a.fecha.localeCompare(b.fecha)); d.splice(i,1); car_saveTests(d); car_poblarSelectTest(); loadCarnet(); }
function car_borrarExamen(i)   { const d = car_getExamenes();  d.splice(i,1); car_saveExamenes(d);  loadCarnet(); }
function car_borrarPractica(i) { const d = car_getPracticas(); d.splice(i,1); car_savePracticas(d); loadCarnet(); }

// ── Carga principal ──
function loadCarnet() {
  const tests     = car_getTests().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const examenes  = car_getExamenes().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const practicas = car_getPracticas().sort((a,b) => a.fecha.localeCompare(b.fecha));
  const cfg       = car_getConfig();

  // Rellenar selects del formulario
  car_poblarSelectTema();
  car_poblarSelectTest();

  // Rellenar inputs de próxima convocatoria
  const selEstado = document.getElementById('upd-car-prox-estado');
  const inpFecha  = document.getElementById('upd-car-prox-fecha');
  if (selEstado && cfg.prox_estado !== undefined) selEstado.value = cfg.prox_estado;
  if (inpFecha  && cfg.prox_fecha)                inpFecha.value  = cfg.prox_fecha;

  renderCarStats(tests, examenes, practicas, cfg);
  renderCarTests(tests);
  renderCarExamenes(examenes);
  renderCarPracticas(practicas);
  renderCarChart(tests);
  setupCarTabs();
}

// ── Stats ──
function renderCarStats(tests, examenes, practicas, cfg = {}) {
  document.getElementById('car-tests').textContent = tests.length || '—';

  // Rendimiento: media fallos + % aprobados
  const fallosEl = document.getElementById('car-fallos');
  if (tests.length) {
    const media    = (tests.reduce((s,t) => s + t.fallos, 0) / tests.length).toFixed(1);
    const aprobados = tests.filter(t => t.fallos <= 3).length;
    const pct       = Math.round(aprobados / tests.length * 100);
    const mediaColor = parseFloat(media) <= 3 ? 'var(--green)' : 'var(--red)';
    const pctColor   = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--orange)' : 'var(--red)';
    fallosEl.innerHTML = `<span style="color:${mediaColor}">${media}</span><div style="font-size:.68rem;color:var(--text3);margin-top:3px;font-weight:400">media · <span style="color:${pctColor};font-weight:700">${pct}% aprobados</span></div>`;
  } else {
    fallosEl.textContent = '—';
  }

  // Racha reciente: últimos 10 tests por fecha
  const rachaEl = document.getElementById('car-practicas');
  if (rachaEl) {
    const recientes = [...tests].sort((a,b) => b.fecha.localeCompare(a.fecha)).slice(0, 10);
    if (recientes.length) {
      const apr = recientes.filter(t => t.fallos <= 3).length;
      const pctR = Math.round(apr / recientes.length * 100);
      const col  = pctR >= 80 ? 'var(--green)' : pctR >= 60 ? 'var(--orange)' : 'var(--red)';
      rachaEl.innerHTML = `<span style="color:${col}">${pctR}%</span><div style="font-size:.68rem;color:var(--text3);margin-top:3px;font-weight:400">${apr}/${recientes.length} aprobados</div>`;
    } else {
      rachaEl.textContent = '—';
    }
  }

  const estadoEl = document.getElementById('car-teorico-estado');
  if (examenes.length) {
    const ultimo = examenes[examenes.length - 1];
    estadoEl.textContent = ultimo.resultado === 'aprobado' ? '✅ Aprobado' : '❌ Suspendido';
    estadoEl.style.color = ultimo.resultado === 'aprobado' ? 'var(--green)' : 'var(--red)';
    estadoEl.style.fontSize = '1rem';
  } else {
    estadoEl.textContent = '—';
    estadoEl.style.color = '';
  }

  // Próxima convocatoria (stat card)
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

// ── Panel Tests ──
function renderCarTests(tests) {
  const el = document.getElementById('car-tests-lista');
  if (!el) return;

  if (!tests.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.87rem">Sin tests registrados. Añade desde ✏️ Actualizar → Carnet.</p>';
    return;
  }

  // Filtro por categoría
  const cats = [...new Set(tests.map(t => t.cat || t.tema || '').filter(Boolean))];
  const filtroActivo = el.dataset.filtro || '';

  // Agrupar por número
  const porNum = {};
  tests.forEach((t, i) => {
    if (!porNum[t.num]) porNum[t.num] = [];
    porNum[t.num].push({ ...t, _idx: i });
  });

  const testsFiltrados = Object.entries(porNum)
    .filter(([, entradas]) => !filtroActivo || entradas.some(e => (e.cat || e.tema || '') === filtroActivo))
    .sort(([a],[b]) => Number(a)-Number(b));

  const catColor = cat => {
    const idx = car_getTodosLosTemas().indexOf(cat);
    const colores = ['#60a5fa','#a78bfa','#f472b6','#34d399','#fbbf24','#fb923c','#38bdf8','#c084fc','#fb7185','#a3e635','#f9a8d4','#fde68a'];
    return idx >= 0 ? colores[idx % colores.length] : 'var(--text3)';
  };

  const totalCats = [...new Set(tests.map(t => t.cat || t.tema || '').filter(Boolean))];

  // Temas con más fallos (top 3, mínimo 1 fallo en total)
  const fallosPorCat = {};
  const testsPorCat  = {};
  tests.forEach(t => {
    const c = t.cat || t.tema || '';
    if (!c) return;
    fallosPorCat[c] = (fallosPorCat[c] || 0) + t.fallos;
    testsPorCat[c]  = (testsPorCat[c]  || 0) + 1;
  });
  const topFallos = Object.entries(fallosPorCat)
    .filter(([,f]) => f > 0)
    .sort(([,a],[,b]) => b - a)
    .slice(0, 3);

  const topFallosHTML = topFallos.length ? `
    <div style="margin-bottom:16px;padding:10px 14px;background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.25);border-radius:var(--radius)">
      <div style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">🎯 Categorías con más fallos acumulados</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${topFallos.map(([cat, fallos], i) => {
          const col = i === 0 ? 'var(--red)' : i === 1 ? 'var(--orange)' : 'var(--yellow)';
          const media = (fallos / testsPorCat[cat]).toFixed(1);
          return `<div style="background:${col}18;border:1px solid ${col}44;border-radius:8px;padding:5px 12px;font-size:.78rem">
            <span style="color:${col};font-weight:700">${cat}</span>
            <span style="color:var(--text3);margin-left:6px">${fallos} fallos · ${media}/test</span>
          </div>`;
        }).join('')}
      </div>
    </div>` : '';

  el.innerHTML = `
    ${topFallosHTML}
    ${totalCats.length > 1 ? `
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      <button onclick="car_filtrarTests('')" style="padding:4px 12px;border-radius:99px;border:1px solid var(--border);background:${!filtroActivo?'var(--accent)':'var(--bg3)'};color:${!filtroActivo?'#fff':'var(--text2)'};cursor:pointer;font-size:.78rem;font-family:inherit">Todos (${tests.length})</button>
      ${totalCats.map(c => `<button onclick="car_filtrarTests('${c.replace(/'/g,"\\'")}\')" style="padding:4px 12px;border-radius:99px;border:1px solid var(--border);background:${filtroActivo===c?catColor(c):'var(--bg3)'};color:${filtroActivo===c?'#fff':'var(--text2)'};cursor:pointer;font-size:.78rem;font-family:inherit">${c}</button>`).join('')}
    </div>` : ''}
    ${testsFiltrados.map(([num, entradas]) => {
      const mejor = Math.min(...entradas.map(e => e.fallos));
      const cat = entradas.find(e => e.cat)?.cat || entradas.find(e => e.tema)?.tema || '';
      return `
      <div style="border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;overflow:hidden">
        <div style="background:var(--bg3);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <span style="font-weight:700;font-size:1rem;color:var(--accent)">Test ${num}</span>
          ${cat ? `<span style="font-size:.78rem;font-weight:600;color:${catColor(cat)};background:${catColor(cat)}22;padding:2px 8px;border-radius:99px">${cat}</span>` : ''}
          <span style="margin-left:auto;font-size:.78rem;color:var(--text3)">${entradas.length} intento${entradas.length!==1?'s':''} · mejor: <strong style="color:${mejor<=3?'var(--green)':'var(--red)'}">${mejor} fallos — ${mejor<=3?'✅ Aprobado':'❌ Suspenso'}</strong></span>
        </div>
        ${entradas.map(e => `
        <div style="display:grid;grid-template-columns:90px 1fr auto auto;gap:6px;align-items:center;padding:5px 14px;border-top:1px solid var(--border)">
          <span style="font-size:.75rem;color:var(--text3)">${_fmtFecha(e.fecha)}</span>
          <span style="font-size:.78rem;color:var(--text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.tema || e.cat || '—'}</span>
          <span style="font-weight:700;font-size:.85rem;color:${e.fallos<=3?'var(--green)':'var(--red)'}">${e.fallos} fallos</span>
          <button onclick="car_borrarTest(${e._idx})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem;padding:1px 4px">✕</button>
        </div>`).join('')}
      </div>`;
    }).join('')}
    ${testsFiltrados.length === 0 ? '<p style="color:var(--text3);font-size:.85rem">Sin tests en esta categoría.</p>' : ''}`;
}

function car_filtrarTests(cat) {
  const el = document.getElementById('car-tests-lista');
  if (el) el.dataset.filtro = cat;
  const tests = car_getTests().sort((a,b) => a.fecha.localeCompare(b.fecha));
  renderCarTests(tests);
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

// ── Gráfica ──
function renderCarChart(tests) {
  const ctx = document.getElementById('car-chart')?.getContext('2d');
  if (!ctx) return;
  if (carChart) { carChart.destroy(); carChart = null; }
  if (!tests.length) return;

  // Sólo tests con fecha válida YYYY-MM-DD y fallos razonables
  const validos = tests
    .filter(t => /^\d{4}-\d{2}-\d{2}$/.test(t.fecha) && (parseInt(t.fallos) || 0) <= 40)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  if (!validos.length) return;

  // Si hay muchos, mostrar los últimos 30 para no saturar el eje X
  const datos = validos.length > 30 ? validos.slice(-30) : validos;

  const fmtFecha = f => {
    const p = f.split('-');
    return `${p[2]}/${p[1]}`;  // DD/MM
  };

  carChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: datos.map(t => `T${t.num} · ${fmtFecha(t.fecha)}`),
      datasets: [{
        label: 'Fallos por intento',
        data: datos.map(t => parseInt(t.fallos) || 0),
        borderColor: '#7c6af7',
        backgroundColor: 'rgba(124,106,247,.12)',
        tension: .3, fill: true,
        pointBackgroundColor: datos.map(t => (parseInt(t.fallos)||0) <= 3 ? '#34d399' : '#ef4444'),
        pointRadius: 5,
      }],
    },
    options: {
      plugins: { legend: { labels: { color:'#94a3b8' } } },
      scales: {
        x: {
          ticks: { color:'#94a3b8', maxRotation:45, minRotation:0, font:{ size:10 }, autoSkip: true, maxTicksLimit: 15 },
          grid: { color:'#2d3148' },
        },
        y: { ticks:{ color:'#94a3b8', stepSize:1 }, grid:{ color:'#2d3148' }, min:0, max: 20 },
      },
    },
  });
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
