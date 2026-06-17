// ─── MÓDULO FINANZAS ───────────────────────────────────────────

const CAT_META = {
  nomina:       { label:'Nómina',           icon:'💼', color:'var(--green)' },
  alimentacion: { label:'Alimentación',     icon:'🛒', color:'#a3e635' },
  hosteleria:   { label:'Hostelería',       icon:'☕', color:'#fb923c' },
  ropa:         { label:'Ropa & Moda',      icon:'👗', color:'#f472b6' },
  suscripciones:{ label:'Suscripciones',    icon:'📱', color:'#60a5fa' },
  ocio:         { label:'Ocio',             icon:'🎭', color:'#c084fc' },
  transporte:   { label:'Transporte',       icon:'🚆', color:'#38bdf8' },
  oposiciones:  { label:'Oposiciones',      icon:'📚', color:'#fbbf24' },
  belleza:      { label:'Belleza',          icon:'💄', color:'#fb7185' },
  salud:        { label:'Salud',            icon:'💊', color:'#34d399' },
  deuda:        { label:'Deuda / Klarna',   icon:'💳', color:'var(--red)' },
  ahorro:       { label:'Ahorro',           icon:'🐷', color:'#34d399' },
  hogar:        { label:'Hogar',            icon:'🏠', color:'#a78bfa' },
  regalo:       { label:'Regalos',          icon:'🎁', color:'#f9a8d4' },
  formacion:    { label:'Formación',        icon:'🎓', color:'#fde68a' },
  compras:      { label:'Compras Online',   icon:'🛍️', color:'#94a3b8' },
  interna:      { label:'Transferencia int',icon:'🔄', color:'var(--text3)' },
  otros:        { label:'Otros',            icon:'•',  color:'var(--text3)' },
};

function loadFinanzas() {
  renderFinStats();
  setupFinTabs();
  renderFinResumen();
  renderFinTransacciones();
  renderFinSinking();
  renderFinDeudas();
  renderFinPresupuestoYGastos();
  renderFinActualizar();
}

/* ══════════════════════════════════════════════════════
   STATS CARDS
══════════════════════════════════════════════════════ */
function getSaldosActuales() {
  const saved = Store.get('fin_saldos');
  const c = FIN_DATA.cuentas;
  const fmBase = saved.fm ?? (FIN_DATA.revolut_fondo_monetario.historial[FIN_DATA.revolut_fondo_monetario.historial.length-1]?.saldo_final ?? 291.28);
  const interesesDiarios = (Store.get('fin_revolut_intereses', [])).reduce((s, e) => s + (parseFloat(e.importe) || 0), 0);
  return {
    ktx: saved.ktx ?? c.kutxabank_personal.saldo,
    rvp: saved.rvp ?? c.revolut_personal.saldo,
    rvc: saved.rvc ?? c.revolut_conjunta.saldo,
    ctv: saved.ctv ?? c.ctv_vivienda.saldo,
    bp:  saved.bp  ?? c.baskepensiones.saldo,
    fm:  fmBase + interesesDiarios,
    fmBase,
    interesesDiarios,
  };
}

function renderFinStats() {
  const s = getSaldosActuales();
  const saldoTotal = s.ktx + s.rvp + s.rvc + s.ctv + s.bp;

  // Deuda iPhone restante
  const deuda = FIN_DATA.deudas?.[0];
  const extra  = parseInt(localStorage.getItem('fin_cuotas_extra') || '0');
  const cuotasRest = deuda ? Math.max(0, deuda.cuotas_total - deuda.cuotas_pagadas - extra) : 0;
  const deudaRest  = cuotasRest * (deuda?.importe_cuota || 0);
  const neto = saldoTotal - deudaRest;

  set('fin-total-patrimonio', fmt(saldoTotal));
  set('fin-neto-patrimonio',  fmt(neto));
  set('fin-ktx-saldo',  fmt(s.ktx));
  set('fin-rvp-saldo',  fmt(s.rvp));
  set('fin-rvc-saldo',  fmt(s.rvc));
  set('fin-ctv-saldo',  fmt(s.ctv));
  set('fin-bp-saldo',   fmt(s.bp));
  set('dash-ahorro',    fmt(saldoTotal));

  // Deuda restante iPhone — calculada desde transacciones reales
  const cuotasTxns = getFilteredReal().filter(t =>
    t.d?.toLowerCase().includes('cetelem') && t.i < 0 && t.ct === deuda.cuenta
  ).length;
  const pagadasReal = Math.max(cuotasTxns, deuda?.cuotas_pagadas || 0);
  const restantes   = Math.max(0, (deuda?.cuotas_total || 0) - pagadasReal);
  set('fin-deuda-restante', fmt(restantes * deuda.importe_cuota));
  set('fin-deuda-cuotas', `${pagadasReal}/${deuda.cuotas_total} cuotas`);

  // CTV progress — usa la meta real de compra (entrada 20% + ITP + gastos), no el límite anual de aportación
  const pisoCfgStat = Store.get('piso_config');
  let ctv_meta = 51500;
  if (pisoCfgStat.precio_ref) {
    const _p  = pisoCfgStat.precio_ref;
    const _hip = _p * ((pisoCfgStat.financiacion || 80) / 100);
    const _arr = _p * 0.10;
    const _itp = _p * ((pisoCfgStat.itp || 5) / 100);
    const _res = _p - _arr - 1000 - _hip;
    ctv_meta   = _arr + 1000 + (_res > 0 ? _res : 0) + _itp + (pisoCfgStat.notario || 1500);
  }
  const pct = Math.min(100, (s.ctv / ctv_meta) * 100);
  const bar = document.getElementById('fin-objetivo-bar'); if (bar) bar.style.width = pct.toFixed(1) + '%';
  const lbl = document.getElementById('fin-objetivo-pct'); if (lbl) lbl.textContent = pct.toFixed(1) + '%';
  const lblMeta = document.getElementById('fin-objetivo-meta'); if (lblMeta) lblMeta.textContent = 'META ENTRADA 20% + GASTOS';
}

/* ══════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════ */
function setupFinTabs() {
  document.querySelectorAll('.fin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.fin-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.fin-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.fintab)?.classList.add('active');
    });
  });
  // Set current month as default
  const mesSelect = document.getElementById('fin-mes-filter');
  if (mesSelect) {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
    if ([...mesSelect.options].some(o => o.value === mesActual)) mesSelect.value = mesActual;
  }
  document.getElementById('fin-mes-filter')?.addEventListener('change',  renderFinTransacciones);
  document.getElementById('fin-cat-filter')?.addEventListener('change',  renderFinTransacciones);
  document.getElementById('fin-cta-filter')?.addEventListener('change',  renderFinTransacciones);
  document.getElementById('fin-search')?.addEventListener('input',       renderFinTransacciones);
  document.getElementById('fin-hide-internal')?.addEventListener('change',renderFinTransacciones);
  document.getElementById('fin-add-txn')?.addEventListener('click',      addTransaccionManual);
}

/* ══════════════════════════════════════════════════════
   PANEL: RESUMEN ANUAL
══════════════════════════════════════════════════════ */
function renderFinResumen() {
  const el = document.getElementById('fin-resumen-content');
  if (!el) return;

  // Calcular totales reales de transacciones (excluyendo internas y movimientos de ahorro/inversión)
  const txns = getFilteredReal();
  const byMonth = {};
  txns.forEach(t => {
    const mes = t.f.substring(0, 7);
    if (!byMonth[mes]) byMonth[mes] = { nomina: 0, gastos: 0, ahorro: 0 };
    if (t.c === 'nomina') byMonth[mes].nomina += t.i;
    // Transferencias de ahorro/inversión: no son gasto destructivo, se contabilizan aparte
    else if ((t.c === 'ahorro' || t.c === 'interna') && t.i < 0) byMonth[mes].ahorro += Math.abs(t.i);
    else if (t.c !== 'interna' && t.i < 0) byMonth[mes].gastos += Math.abs(t.i);
  });

  // Ingreso previsto para el mes actual si aún no ha llegado la nómina
  const nominaPrevista = FIN_DATA.presupuesto.sueldo;

  // Meses dinámicos: desde el primero con datos hasta el mes actual
  const mesActual = (() => { const h=new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`; })();
  const mesesConDatos = [...new Set(txns.map(t => t.f.substring(0,7)))].sort();
  const primerMes = mesesConDatos[0] || mesActual;
  const meses = [];
  let cur = new Date(primerMes + '-01');
  const fin = new Date(mesActual + '-01');
  while (cur <= fin) {
    meses.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const labs = meses.map(m => MESES_ES[parseInt(m.split('-')[1])-1]);

  let totalNomina = 0, totalGastos = 0, totalAhorro = 0;
  meses.forEach(m => {
    if (byMonth[m]) {
      totalNomina  += byMonth[m].nomina;
      totalGastos  += byMonth[m].gastos;
      totalAhorro  += byMonth[m].ahorro || 0;
    }
  });
  // Si el mes actual aún no tiene nómina cobrada, sumamos la prevista para no inflar gastos artificialmente
  if (!(byMonth[mesActual]?.nomina)) {
    totalNomina += nominaPrevista;
  }

  // Gastos por categoría (excluye ahorro e internas del gráfico de tarta)
  const byCat = {};
  txns.filter(t => t.c !== 'interna' && t.c !== 'nomina' && t.c !== 'ahorro' && t.i < 0).forEach(t => {
    byCat[t.c] = (byCat[t.c] || 0) + Math.abs(t.i);
  });
  const topCats = Object.entries(byCat).sort((a,b) => b[1]-a[1]).slice(0,7);

  el.innerHTML = `
    <div class="fin-year-stats">
      <div class="fin-year-card"><div class="fin-year-label">Nómina total 2026</div><div class="fin-year-val green">${fmt(totalNomina)}</div></div>
      <div class="fin-year-card">
        <div class="fin-year-label">Gastos reales 2026</div>
        <div class="fin-year-val red">${fmt(totalGastos)}</div>
        <div style="font-size:.62rem;color:var(--text3)">Ahorro/inversión: ${fmt(totalAhorro)} aparte</div>
      </div>
      <div class="fin-year-card"><div class="fin-year-label">Ahorro neto 2026</div><div class="fin-year-val ${(totalNomina-totalGastos)>=0?'green':'red'}">${fmt(totalNomina-totalGastos)}</div></div>
    </div>

    <div class="fin-two-col">
      <div class="card">
        <h3 style="margin-bottom:14px">Ingresos vs Gastos mensuales</h3>
        <canvas id="fin-chart" height="160"></canvas>
      </div>
      <div class="card">
        <h3 style="margin-bottom:14px">Gastos por categoría</h3>
        <canvas id="fin-cat-chart" height="160"></canvas>
      </div>
    </div>

    <div class="card mt" style="overflow:auto">
      <table class="fin-monthly-table">
        <thead><tr><th>Mes</th><th>Nómina</th><th>Gastos</th><th>Balance</th></tr></thead>
        <tbody>
          ${[...meses].reverse().map((m,ri) => {
            const i = meses.length - 1 - ri;
            const d = byMonth[m] || {};
            const nom = d.nomina || 0;
            const gas = d.gastos || 0;
            const esMesActual = m === mesActual;
            // Si es el mes actual y aún no llegó la nómina, mostrar proyección
            const sinNomina = esMesActual && nom === 0;
            const nomMostrar = sinNomina ? nominaPrevista : nom;
            const bal = nomMostrar - gas;
            if (!sinNomina && !nom && !gas) return `<tr style="${esMesActual?'background:var(--bg3)':''}"><td><strong>${labs[i]}</strong>${esMesActual?' <span style="font-size:.68rem;color:var(--accent2);font-weight:600">MES ACTUAL</span>':''}</td><td colspan="3" style="color:var(--text3)">Sin datos aún</td></tr>`;
            return `<tr style="${esMesActual?'background:rgba(124,106,247,.08);outline:1px solid rgba(124,106,247,.25)':''}">
              <td>
                <strong>${labs[i]}</strong>
                ${esMesActual?' <span style="font-size:.68rem;color:var(--accent2);font-weight:600">MES ACTUAL</span>':''}
              </td>
              <td class="${sinNomina?'':'green'}" style="${sinNomina?'color:var(--text3);font-style:italic':''}">
                ${sinNomina?`<span title="Nómina prevista a fin de mes">~${fmt(nomMostrar)} 🕐</span>`:fmt(nom)}
              </td>
              <td class="red">${fmt(gas)}</td>
              <td class="${bal>=0?'green':'red'}" style="font-weight:700${sinNomina?';font-style:italic':''}">
                ${sinNomina?'~':''}${fmt(bal)}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;

  setTimeout(() => {
    renderChartBarras(byMonth, meses, labs);
    renderChartCategorias(topCats);
  }, 60);
}

// ── Gastos fijos en localStorage ──────────────────────────────────────────

const _FIN_DIAS_COBRO = {
  'Cetelem – iPhone': 5, 'Baskepensiones 60': 6, 'Netflix': 29, 'DAZN': 21,
  'Vodafone/Lowi': 13, 'Amazon Prime': 17, 'Twitch': 15,
  'Apple iCloud+': 10, 'Apple One/TV': 10, 'Nintendo Online': 26,
};
const _FIN_CAT_GF = {
  'Cetelem – iPhone': 'deuda', 'Baskepensiones 60': 'ahorro',
  'CTV – Transferencia': 'ahorro', 'Seguro Vida Kutxabank': 'salud',
  'Aporte cuenta conjunta': 'interna', 'Netflix': 'suscripciones',
  'DAZN': 'suscripciones', 'Vodafone/Lowi': 'suscripciones',
  'Amazon Prime': 'suscripciones', 'Twitch': 'suscripciones',
  'Apple iCloud+': 'suscripciones', 'Apple One/TV': 'suscripciones',
  'Nintendo Online': 'suscripciones', 'Mercadona (semanal)': 'alimentacion',
};

function fin_getGastosFijos() {
  const stored = localStorage.getItem('fin_gastos_fijos');
  if (stored) return JSON.parse(stored);
  // Primera vez: migrar desde FIN_DATA.presupuesto
  const p = FIN_DATA.presupuesto;
  let id = 0;
  const toEntry = (g, tipo) => ({
    id: 'gf_' + (id++),
    nombre: g.nombre, importe: g.importe, cuenta: g.cuenta,
    tipo, dia: _FIN_DIAS_COBRO[g.nombre] || null,
    cat: _FIN_CAT_GF[g.nombre] || 'otros',
    hasta: g.hasta || null, nota: g.nota || '', activo: true,
  });
  const list = [
    ...p.gastos_fijos.map(g => toEntry(g, 'personal')),
    ...p.gastos_fijos_conjunta.map(g => toEntry(g, 'conjunta')),
    ...p.suscripciones_personales.map(g => toEntry(g, 'suscripcion')),
  ];
  Store.set('fin_gastos_fijos', list);
  return list;
}

function fin_saveGastosFijos(list) {
  Store.set('fin_gastos_fijos', list);
}

// Auto-genera transacciones del mes actual para gastos fijos con día de cobro
function fin_autoTxns() {
  const gastos = fin_getGastosFijos().filter(g => g.activo && g.dia);
  const hoy = new Date();
  const diaHoy = hoy.getDate();
  const anho = hoy.getFullYear();
  const mes  = String(hoy.getMonth() + 1).padStart(2, '0');
  const mesStr = `${anho}-${mes}`;

  // Transacciones ya existentes este mes (historial + manuales)
  const existing = [
    ...FIN_DATA.transacciones,
    ...Store.get('fin_txns', []),
  ].filter(t => t.f?.startsWith(mesStr));

  return gastos
    .filter(g => g.dia <= diaHoy)
    .filter(g => !g.hasta || g.hasta >= mesStr)
    .filter(g => !existing.some(t =>
      t.d === g.nombre && t.ct === g.cuenta && !t._auto
    ))
    .map(g => ({
      f: `${mesStr}-${String(g.dia).padStart(2, '0')}`,
      i: -Math.abs(g.importe),
      d: g.nombre,
      c: g.cat || 'otros',
      ct: g.cuenta,
      _auto: true,
    }));
}

function getFilteredReal(opts={}) {
  const local = Store.get('fin_txns', []);
  const auto  = fin_autoTxns();
  return [...FIN_DATA.transacciones, ...local, ...auto];
}

function renderChartBarras(byMonth, meses, labs) {
  const ctx = document.getElementById('fin-chart'); if (!ctx) return;
  if (ctx._chart) ctx._chart.destroy();

  const nominaPrev = FIN_DATA.presupuesto.sueldo;
  const mesActual = (() => { const h=new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`; })();

  // Nómina real; si el mes actual no tiene nómina, barra punteada con el previsto
  const nominaData  = meses.map(m => byMonth[m]?.nomina || 0);
  const nominaPrevData = meses.map(m =>
    (m === mesActual && !(byMonth[m]?.nomina)) ? nominaPrev : 0
  );

  ctx._chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labs,
      datasets: [
        { label:'Nómina confirmada', data: nominaData,     backgroundColor:'rgba(52,211,153,.75)', borderRadius:6 },
        { label:'Nómina prevista',   data: nominaPrevData, backgroundColor:'rgba(52,211,153,.25)', borderRadius:6,
          borderColor:'rgba(52,211,153,.6)', borderWidth:1, borderDash:[4,3] },
        { label:'Gastos reales',     data: meses.map(m => byMonth[m]?.gastos||0), backgroundColor:'rgba(248,113,113,.7)', borderRadius:6 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { color:'#94a3b8', font:{ size:10 }, boxWidth:10, padding:8 } } },
      scales: {
        x: { ticks:{ color:'#64748b', font:{size:10} }, grid:{ color:'rgba(255,255,255,.04)' } },
        y: { ticks:{ color:'#64748b', callback:v=>'€'+v.toLocaleString('es-ES'), font:{size:10} }, grid:{ color:'rgba(255,255,255,.04)' } }
      }
    }
  });
}

function renderChartCategorias(topCats) {
  const ctx = document.getElementById('fin-cat-chart'); if (!ctx) return;
  if (ctx._chart) ctx._chart.destroy();
  ctx._chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: topCats.map(([k]) => CAT_META[k]?.label || k),
      datasets: [{ data: topCats.map(([,v]) => v),
        backgroundColor: ['#7c6af7','#f87171','#fb923c','#34d399','#60a5fa','#f472b6','#fbbf24'],
        borderWidth:0 }]
    },
    options: {
      responsive: true,
      layout: { padding: { right: 8, top: 4, bottom: 4 } },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: '#94a3b8',
            font: { size: 10, family: 'inherit' },
            boxWidth: 10,
            padding: 10,
            usePointStyle: true,
          }
        }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════
   PANEL: GASTOS FIJOS / RECURRENTES
══════════════════════════════════════════════════════ */
function renderFinGastosFijos() {
  const el = document.getElementById('fin-fijos-content');
  if (!el) return;

  const gastos  = fin_getGastosFijos();
  const activos = gastos.filter(g => g.activo);
  const personal  = activos.filter(g => g.tipo === 'personal');
  const conjunta  = activos.filter(g => g.tipo === 'conjunta');
  const subs      = activos.filter(g => g.tipo === 'suscripcion');
  const pausados  = gastos.filter(g => !g.activo);

  const renderRow = g => {
    const mesRestante = g.hasta ? calcMesesRestantes(g.hasta) : null;
    const etiqueta = g.hasta
      ? `<span class="badge badge--orange">Termina: ${g.hasta}</span> ${mesRestante > 0 ? mesRestante + ' meses' : 'finalizado'}`
      : `<span class="badge badge--green">Activo</span>`;
    const ctaColor = { KTX:'#60a5fa', RVP:'#a78bfa', RVC:'#f472b6', CTV:'#34d399', BP:'#fbbf24' }[g.cuenta] || 'var(--text2)';
    return `
    <div class="fin-fijo-row">
      <div class="fin-fijo-icon">${g.hasta && mesRestante <= 0 ? '✅' : g.hasta ? '⏳' : '🔄'}</div>
      <div class="fin-fijo-info">
        <div class="fin-fijo-nombre">${g.nombre}${g.dia ? ` <span style="font-size:.68rem;color:var(--text3)">· día ${g.dia}</span>` : ''}</div>
        <div class="fin-fijo-meta">${g.nota || ''} · <span style="color:${ctaColor}">${g.cuenta}</span></div>
        <div style="font-size:.73rem;color:var(--text3);margin-top:2px">${etiqueta}</div>
      </div>
      <div class="fin-fijo-importe red">-${fmt(g.importe)}/mes</div>
    </div>`;
  };

  const totalFijos = personal.reduce((a,g) => a + g.importe, 0);
  const totalConj  = conjunta.reduce((a,g) => a + g.importe, 0);
  const totalSubs  = subs.reduce((a,g) => a + g.importe, 0);
  const totalTodo  = totalFijos + totalSubs;

  el.innerHTML = `
    <div class="fin-year-stats" style="margin-bottom:16px">
      <div class="fin-year-card"><div class="fin-year-label">Fijos personales</div><div class="fin-year-val red">${fmt(totalFijos)}/mes</div></div>
      <div class="fin-year-card"><div class="fin-year-label">Suscripciones</div><div class="fin-year-val" style="color:var(--blue)">${fmt(totalSubs)}/mes</div></div>
      <div class="fin-year-card"><div class="fin-year-label">Conjunta estimado</div><div class="fin-year-val" style="color:var(--pink)">${fmt(totalConj)}/mes</div></div>
      <div class="fin-year-card"><div class="fin-year-label">Total comprometido</div><div class="fin-year-val red">${fmt(totalTodo)}/mes</div></div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <h3 style="margin-bottom:12px">💸 Gastos fijos personales</h3>
      ${personal.length ? personal.map(renderRow).join('') : '<p style="color:var(--text3);font-size:.85rem">Sin gastos fijos personales.</p>'}
    </div>

    <div class="card" style="margin-bottom:12px">
      <h3 style="margin-bottom:12px">📱 Suscripciones personales</h3>
      ${subs.length ? subs.map(renderRow).join('') : '<p style="color:var(--text3);font-size:.85rem">Sin suscripciones.</p>'}
    </div>

    <div class="card" style="margin-bottom:${pausados.length?'12':'0'}px">
      <h3 style="margin-bottom:12px">🏠 Cuenta conjunta (estimado mensual)</h3>
      ${conjunta.length ? conjunta.map(renderRow).join('') : '<p style="color:var(--text3);font-size:.85rem">Sin gastos conjuntos.</p>'}
      <div class="fin-fijo-row" style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px">
        <div></div>
        <div class="fin-fijo-info"><div class="fin-fijo-nombre" style="font-weight:700">Total conjunta estimado</div></div>
        <div class="fin-fijo-importe red" style="font-size:1.05rem;font-weight:800">-${fmt(totalConj)}/mes</div>
      </div>
    </div>
    ${pausados.length ? `
    <div class="card" style="opacity:.55">
      <h3 style="margin-bottom:10px;font-size:.9rem">⏸ Pausados (${pausados.length})</h3>
      ${pausados.map(renderRow).join('')}
    </div>` : ''}`;
}

function calcMesesRestantes(fechaFin) {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  return Math.max(0, (fin.getFullYear()-hoy.getFullYear())*12 + (fin.getMonth()-hoy.getMonth()));
}

/* ══════════════════════════════════════════════════════
   PANEL: TRANSACCIONES
══════════════════════════════════════════════════════ */
function renderFinTransacciones() {
  const mes     = document.getElementById('fin-mes-filter')?.value || '';
  const cat     = document.getElementById('fin-cat-filter')?.value || '';
  const cta     = document.getElementById('fin-cta-filter')?.value || '';
  const q       = (document.getElementById('fin-search')?.value || '').toLowerCase();
  const hideInt = document.getElementById('fin-hide-internal')?.checked ?? true;

  const local = Store.get('fin_txns', []).map(t=>({...t, _local:true}));
  const auto  = fin_autoTxns().map(t => ({...t, _auto:true}));
  let txns = [...FIN_DATA.transacciones, ...local, ...auto];

  if (hideInt) txns = txns.filter(t => t.c !== 'interna');
  if (mes)  txns = txns.filter(t => t.f.startsWith(mes));
  if (cat)  txns = txns.filter(t => t.c === cat);
  if (cta)  txns = txns.filter(t => t.ct === cta);
  if (q)    txns = txns.filter(t => t.d.toLowerCase().includes(q));
  txns = txns.sort((a,b) => b.f.localeCompare(a.f));

  const el = document.getElementById('fin-txns-list');
  if (!el) return;

  // Totales
  const ingresos = txns.filter(t=>t.i>0 && t.c!=='interna').reduce((a,t)=>a+t.i,0);
  const gastos   = txns.filter(t=>t.i<0 && t.c!=='interna').reduce((a,t)=>a+Math.abs(t.i),0);

  const hoyMes = (() => { const h=new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`; })();
  const MESES_ES2 = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesLabel = mes ? MESES_ES2[parseInt(mes.split('-')[1])-1] + ' ' + mes.split('-')[0] : 'Todos los meses';
  const esMesActual = mes === hoyMes;

  let localCount = 0;
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap">
      <span style="font-size:1rem;font-weight:700;color:${esMesActual?'var(--accent2)':'var(--text2)'}">${esMesActual?'📅 ':''}${mesLabel}${esMesActual?' — Mes actual':''}</span>
      ${!esMesActual?`<button onclick="document.getElementById('fin-mes-filter').value='${hoyMes}';renderFinTransacciones()" style="font-size:.72rem;padding:3px 10px;border-radius:99px;border:1px solid var(--accent2);background:transparent;color:var(--accent2);cursor:pointer;font-family:inherit">Ir al mes actual →</button>`:''}
    </div>
    <div class="fin-txn-totals">
      <span class="green">↑ ${fmt(ingresos)}</span>
      <span class="red">↓ ${fmt(gastos)}</span>
      <span class="${(ingresos-gastos)>=0?'green':'red'}" style="font-size:.78rem">Neto: ${fmt(ingresos-gastos)}</span>
      <span style="color:var(--text3);font-size:.75rem">${txns.length} movimientos</span>
    </div>
    ${txns.length === 0 ? '<p style="color:var(--text3);padding:12px 0;font-size:.85rem">Sin movimientos para los filtros seleccionados.</p>' :
    txns.map(t => {
      const m = CAT_META[t.c] || CAT_META.otros;
      const isLocal = !!t._local;
      const isAuto  = !!t._auto;
      const delBtn  = isLocal ? `<button class="rev-del" onclick="borrarTxnLocal(${localCount++})">✕</button>` : '<span></span>';
      const ctaMeta = Object.values(FIN_DATA.cuentas).find(c=>c.id===t.ct) || {};
      return `
      <div style="display:grid;grid-template-columns:46px 18px 1fr auto auto auto;align-items:center;gap:6px;padding:4px 6px;border-bottom:1px solid var(--border2);${isAuto?'border-left:2px solid var(--accent2);padding-left:6px;':''}" class="fin-txn-row">
        <span style="font-size:.7rem;color:var(--text3);white-space:nowrap">${fmtFechaShort(t.f)}</span>
        <span style="font-size:.78rem;text-align:center">${m.icon}</span>
        <span style="font-size:.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${t.d}${isAuto?' <span style="font-size:.6rem;color:var(--accent2)">⚡</span>':''}${isLocal?' <span style="font-size:.6rem;color:var(--text3)">✏️</span>':''}
          <span style="color:${ctaMeta.color||'var(--text3)'};font-size:.65rem;margin-left:4px">● ${t.ct}${t.ref?` · ${t.ref}`:''}</span>
        </span>
        <span style="font-size:.63rem;background:${m.color}18;color:${m.color};border:1px solid ${m.color}33;border-radius:99px;padding:1px 6px;white-space:nowrap">${m.label}</span>
        <span style="font-size:.82rem;font-weight:700;color:${t.i>=0?'var(--green)':'var(--red)'};white-space:nowrap;text-align:right">${t.i>=0?'+':''}${fmt(Math.abs(t.i))}</span>
        ${delBtn}
      </div>`;
    }).join('')}`;
}

function borrarTxnLocal(i) {
  const local = Store.get('fin_txns', []);
  local.splice(i, 1);
  Store.set('fin_txns', local);
  renderFinTransacciones();
}

function addTransaccionManual() {
  const fecha = document.getElementById('fin-new-fecha')?.value;
  const imp   = parseFloat(document.getElementById('fin-new-importe')?.value);
  const desc  = document.getElementById('fin-new-sub')?.value?.trim();
  const cat   = document.getElementById('fin-new-cat')?.value;
  const ct    = document.getElementById('fin-new-cuenta')?.value;
  const ref   = document.getElementById('fin-new-ref')?.value?.trim();
  if (!fecha || isNaN(imp) || !desc || !cat || !ct) {
    alert('Rellena fecha, importe, descripción, categoría y cuenta.'); return;
  }
  const local = Store.get('fin_txns', []);
  local.push({ f: fecha, i: imp, d: desc, c: cat, ct, ref });
  Store.set('fin_txns', local);
  ['fin-new-fecha','fin-new-importe','fin-new-sub','fin-new-ref'].forEach(id=>{
    const e=document.getElementById(id); if(e) e.value='';
  });
  renderFinTransacciones();
  renderFinResumen();
  renderFinStats();
}

/* ══════════════════════════════════════════════════════
   PANEL: SINKING FUNDS / AHORRO
══════════════════════════════════════════════════════ */
function renderFinSinking() {
  const el = document.getElementById('fin-sinking-content');
  if (!el) return;

  const fm = FIN_DATA.revolut_fondo_monetario;
  const fmExtra   = Store.get('fin_fm_extra', []);
  const fmDaily   = Store.get('fin_fm_daily', []).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const fmHistorial = [...fm.historial, ...fmExtra];
  const s = getSaldosActuales();
  const totalIntereses = fmHistorial.reduce((a,h) => a + (h.interes || 0), 0) + s.interesesDiarios;

  // Compras futuras planeadas
  const compras = Store.get('local_finanzas').compras || '';
  const listaCompras = compras.split('\n').map(l => l.trim()).filter(Boolean);
  const totalCompras = listaCompras.reduce((a, l) => {
    const m = l.match(/[\d.,]+/g);
    return a + (m ? parseFloat(m[m.length-1].replace(',','.')) : 0);
  }, 0);

  el.innerHTML = `
    ${listaCompras.length ? `
    <div class="card" style="margin-bottom:16px;border-left:3px solid var(--yellow)">
      <h3 style="margin-bottom:12px">🛒 Compras futuras planeadas</h3>
      <div style="margin-bottom:12px">
        ${listaCompras.map(l => {
          const m = l.match(/^(.+?)\s*[—-]\s*([\d.,]+)€?$/);
          const nombre = m ? m[1].trim() : l;
          const precio = m ? parseFloat(m[2].replace(',','.')) : null;
          return `<div class="dash-row" style="padding:6px 0;border-bottom:1px solid var(--border)">
            <span class="dash-row-label">🛍️ ${nombre}</span>
            ${precio ? `<span class="dash-row-val yellow" style="font-weight:700">${fmt(precio)}</span>` : ''}
          </div>`;
        }).join('')}
        ${totalCompras > 0 ? `<div class="dash-row" style="margin-top:8px;font-weight:700"><span class="dash-row-label">Total estimado</span><span class="dash-row-val red">${fmt(totalCompras)}</span></div>` : ''}
      </div>
      <a href="#" onclick="event.preventDefault();document.querySelector('[data-tab=upd-finanzas]')?.click();document.getElementById('upd-fin-compras')?.scrollIntoView({behavior:'smooth'})" style="font-size:.75rem;color:var(--accent2)">✏️ Editar en Actualizar → Finanzas</a>
    </div>` : ''}

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <h3>Revolut – Fondo Monetario Flexible</h3>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <input type="date" id="rv-fecha" value="${(() => { const _d=new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })()}" style="font-size:.78rem;padding:4px 8px;width:130px">
          <input type="number" id="rv-importe" step="0.01" min="0" placeholder="Interés ganado €"
            style="font-size:.82rem;width:130px;padding:4px 8px" onkeydown="if(event.key==='Enter') rv_anadir()">
          <button onclick="rv_anadir()" style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:5px 14px;cursor:pointer;font-weight:700;font-size:.8rem">+ Añadir interés</button>
          <span id="fin-fmd-ok" class="update-success" style="display:none;font-size:.78rem">✓</span>
        </div>
      </div>

      <div class="fin-year-stats" style="margin-bottom:14px">
        <div class="fin-year-card">
          <div class="fin-year-label">Saldo actual</div>
          <div class="fin-year-val accent2">${fmt(s.fm)}</div>
          ${s.interesesDiarios > 0 ? `<div style="font-size:.65rem;color:var(--green);margin-top:2px">+${fmt(s.interesesDiarios)} intereses acum.</div>` : ''}
        </div>
        <div class="fin-year-card"><div class="fin-year-label">Objetivo</div><div class="fin-year-val">${fmt(fm.objetivo)}</div></div>
        <div class="fin-year-card"><div class="fin-year-label">Intereses totales</div><div class="fin-year-val green">${fmt(totalIntereses)}</div></div>
        <div class="fin-year-card"><div class="fin-year-label">Rentabilidad est.</div><div class="fin-year-val" style="color:var(--text2)">~1.28%</div></div>
      </div>

      <!-- Gráfica de crecimiento hacia objetivo -->
      <canvas id="fin-fm-chart" height="90" style="margin-bottom:14px"></canvas>

      <!-- Historial mensual compacto -->
      <div style="overflow-y:auto;max-height:260px;border:1px solid var(--border);border-radius:8px">
        <table class="fin-monthly-table" style="font-size:.76rem">
          <thead style="position:sticky;top:0;background:var(--bg3)"><tr><th>Mes</th><th>Aportación</th><th>Interés</th><th>Saldo final</th><th>Nota</th></tr></thead>
          <tbody>${[...fmHistorial].reverse().map(r=>`<tr>
            <td><strong>${r.mes}</strong></td>
            <td style="color:${r.aportacion>0?'var(--green)':r.aportacion<0?'var(--red)':'var(--text3)'}">${r.aportacion!==0?(r.aportacion>0?'+':'')+fmt(Math.abs(r.aportacion)):'—'}</td>
            <td class="accent2">+${fmt(r.interes)}</td>
            <td style="font-weight:700">${fmt(r.saldo_final)}</td>
            <td style="color:var(--text3);font-size:.7rem">${r.nota||''}</td>
          </tr>`).join('')}</tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:12px">🏠 Simulador — Cuenta Vivienda Kutxabank</h3>
      <div id="fin-ctv-sim-inner"></div>
    </div>

    ${FIN_DATA.sinking_funds.filter(sf => sf.id !== 'ctv' && sf.id !== 'bp').map(sf => {
      const ahorrado = sf.id === 'ctv' ? s.ctv : sf.id === 'bp' ? s.bp : sf.ahorrado;
      const pct = sf.objetivo ? Math.min(100,(ahorrado/sf.objetivo)*100) : null;
      const ctaMeta = Object.values(FIN_DATA.cuentas).find(c=>c.id===sf.cuenta)||{color:'var(--text2)'};
      return `
      <div class="fin-sf-card">
        <div class="fin-sf-header">
          <div>
            <div class="fin-sf-nombre">${sf.nombre}</div>
            <div class="fin-sf-meta">${sf.objetivo?`Objetivo: ${fmt(sf.objetivo)} ·`:''} ${fmt(sf.mensual)}/mes · Cuenta: <span style="color:${ctaMeta.color}">${sf.cuenta}</span></div>
            ${sf.nota?`<div style="font-size:.72rem;color:var(--text3);margin-top:3px">${sf.nota}</div>`:''}
          </div>
          <div style="text-align:right">
            <div style="font-size:1.4rem;font-weight:800;color:${ctaMeta.color}">${fmt(ahorrado)}</div>
            ${pct!==null?`<div style="font-size:.73rem;color:var(--text3)">${pct.toFixed(1)}%</div>`:''}
          </div>
        </div>
        ${pct!==null?`<div style="margin:12px 0"><div class="progress-bar"><div class="progress-fill" style="width:${pct.toFixed(1)}%;background:${ctaMeta.color}"></div></div></div>
        <div class="fin-sf-footer">
          <span>Faltan <strong>${fmt(sf.objetivo-ahorrado)}</strong></span>
          <span>${sf.meses_restantes} meses · <strong>${sf.fecha_estimada||'—'}</strong></span>
        </div>`:''}
      </div>`;
    }).join('')}`;

  renderFinCTVSimulador();
  setTimeout(() => _renderFMChart(fmHistorial, fmExtra, s.fm, fm.objetivo), 60);
}

function _renderFMChart(fmHistorial, fmExtra, saldoActual, objetivo) {
  const ctx = document.getElementById('fin-fm-chart');
  if (!ctx) return;
  if (ctx._chart) ctx._chart.destroy();
  const hist = [...fmHistorial].sort((a,b) => {
    const order = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const parse = m => { const p=m.split(' '); return parseInt(p[1])*12+order.indexOf(p[0].substring(0,3)); };
    return parse(a.mes) - parse(b.mes);
  });
  const labels = hist.map(r => r.mes.substring(0,3)+' '+r.mes.split(' ')[1].slice(2));
  const data   = hist.map(r => r.saldo_final);
  // append current if not in history
  if (saldoActual > 0 && (data.length === 0 || data[data.length-1] !== saldoActual)) {
    labels.push('Hoy'); data.push(saldoActual);
  }
  ctx._chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label:'Saldo FM', data, borderColor:'#818cf8', backgroundColor:'rgba(129,140,248,.12)',
          borderWidth:2, pointRadius:2, fill:true, tension:0.3 },
        { label:'Objetivo', data: labels.map(() => objetivo), borderColor:'rgba(52,211,153,.4)',
          borderDash:[6,3], borderWidth:1.5, pointRadius:0, fill:false },
      ]
    },
    options: {
      responsive:true,
      plugins:{ legend:{ labels:{ color:'#94a3b8', font:{ size:10 } } } },
      scales:{
        x:{ ticks:{ color:'#64748b', font:{size:9}, maxRotation:45 }, grid:{ color:'rgba(255,255,255,.03)' } },
        y:{ ticks:{ color:'#64748b', callback:v=>'€'+v.toLocaleString('es-ES'), font:{size:9} }, grid:{ color:'rgba(255,255,255,.04)' } }
      }
    }
  });
}

/* ══════════════════════════════════════════════════════
   PANEL: DEUDAS
══════════════════════════════════════════════════════ */
function renderFinDeudas() {
  const el = document.getElementById('fin-deudas-content');
  if (!el) return;

  const cuotasExtra = parseInt(localStorage.getItem('fin_cuotas_extra') || '0');
  el.innerHTML = FIN_DATA.deudas.map(d => {
    const pagadas = d.cuotas_pagadas + cuotasExtra;
    const restantes = d.cuotas_total - pagadas;
    const pct = (pagadas / d.cuotas_total) * 100;
    const totalPagado  = pagadas * d.importe_cuota;
    const totalPendiente = restantes * d.importe_cuota;
    return `
    <div class="card" style="margin-bottom:12px">
      <div class="fin-sf-header">
        <div>
          <div class="fin-sf-nombre">${d.nombre}</div>
          <div class="fin-sf-meta">${fmt(d.importe_cuota)}/mes · Inicio: ${d.fecha_inicio} · Fin: <strong>${d.fecha_fin}</strong></div>
          <div style="font-size:.72rem;color:var(--text3);margin-top:3px">${d.nota}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:1.4rem;font-weight:800;color:var(--red)">${fmt(totalPendiente)}</div>
          <div style="font-size:.73rem;color:var(--text3)">pendiente</div>
        </div>
      </div>
      <div style="margin:12px 0">
        <div class="progress-bar"><div class="progress-fill" style="width:${pct.toFixed(1)}%;background:var(--green)"></div></div>
      </div>
      <div class="fin-sf-footer">
        <span>Pagado: <strong>${fmt(totalPagado)}</strong> (${pagadas} cuotas)</span>
        <span>Quedan: <strong>${restantes} cuotas</strong> (${fmt(totalPendiente)})</span>
      </div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════
   PANEL: PRESUPUESTO
══════════════════════════════════════════════════════ */
// Legacy alias — kept so finGFToggle/finGFBorrar/finGFEditar/finGFAnadir still work
function renderFinPresupuesto()   { renderFinPresupuestoYGastos(); }
function renderFinGastosFijos()   { renderFinPresupuestoYGastos(); }
function renderFinRevolutIntereses() { renderFinSinking(); }

/* ══════════════════════════════════════════════════════
   PANEL UNIFICADO: PRESUPUESTO & GASTOS FIJOS
══════════════════════════════════════════════════════ */
function renderFinPresupuestoYGastos() {
  const el = document.getElementById('fin-presupuesto-content');
  if (!el) return;

  const sueldo  = FIN_DATA.presupuesto.sueldo;
  const gastos  = fin_getGastosFijos().filter(g => g.activo);
  const personal  = gastos.filter(g => g.tipo === 'personal');
  const conjunta  = gastos.filter(g => g.tipo === 'conjunta');
  const subs      = gastos.filter(g => g.tipo === 'suscripcion');
  const pausados  = fin_getGastosFijos().filter(g => !g.activo);
  const totalFijo = personal.reduce((a,g) => a + g.importe, 0);
  const totalSubs = subs.reduce((a,g) => a + g.importe, 0);
  const totalConj = conjunta.reduce((a,g) => a + g.importe, 0);
  const sobra     = sueldo - totalFijo - totalSubs;

  // Días hasta la nómina: cobras el último día del mes
  const _hoy = new Date();
  const _ultimoDia = new Date(_hoy.getFullYear(), _hoy.getMonth() + 1, 0).getDate();
  const _diasRestantes = Math.max(1, _ultimoDia - _hoy.getDate() + 1);
  const gastoDiario = sobra / _diasRestantes;

  const ctaColor = { KTX:'#60a5fa', RVP:'#a78bfa', RVC:'#f472b6', CTV:'#34d399', BP:'#fbbf24' };

  const filaPresup = (g, colorImporte) => `
    <div class="fin-budget-row">
      <span>${g.nombre}${g.hasta ? ` <span class="badge badge--orange" style="font-size:.62rem">hasta ${g.hasta}</span>` : ''}</span>
      <strong class="${colorImporte}">${fmt(g.importe)}</strong>
    </div>`;

  const filaGasto = g => {
    const mesRest = g.hasta ? calcMesesRestantes(g.hasta) : null;
    const ct = ctaColor[g.cuenta] || 'var(--text2)';
    return `<div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid var(--border2)">
      <div>
        <span style="font-size:.8rem;font-weight:600">${g.nombre}</span>
        ${g.dia ? `<span style="font-size:.65rem;color:var(--text3);margin-left:5px">día ${g.dia}</span>` : ''}
        ${g.hasta ? `<span style="font-size:.65rem;color:var(--orange);margin-left:4px">hasta ${g.hasta}</span>` : ''}
        <br><span style="font-size:.68rem;color:${ct}">● ${g.cuenta}</span>
      </div>
      <span style="font-size:.8rem;font-weight:700;color:var(--red)">-${fmt(g.importe)}</span>
    </div>`;
  };

  el.innerHTML = `
    <!-- Resumen presupuesto en números clave -->
    <div class="fin-year-stats" style="margin-bottom:16px">
      <div class="fin-year-card"><div class="fin-year-label">Nómina</div><div class="fin-year-val green">${fmt(sueldo)}</div></div>
      <div class="fin-year-card"><div class="fin-year-label">Fijos + subs</div><div class="fin-year-val red">${fmt(totalFijo+totalSubs)}</div></div>
      <div class="fin-year-card"><div class="fin-year-label">Conjunta (est.)</div><div class="fin-year-val" style="color:var(--pink)">${fmt(totalConj)}</div></div>
      <div class="fin-year-card">
        <div class="fin-year-label">Disponible estimado</div>
        <div class="fin-year-val ${sobra>=0?'green':'red'}">${fmt(sobra)}</div>
        <div style="font-size:.62rem;color:var(--text3)">sin gastos variables</div>
      </div>
      <div class="fin-year-card" style="border-left:3px solid var(--accent)">
        <div class="fin-year-label">Gasto diario límite</div>
        <div class="fin-year-val ${gastoDiario>=0?'green':'red'}">${fmt(gastoDiario)}<span style="font-size:.7rem;font-weight:500">/día</span></div>
        <div style="font-size:.62rem;color:var(--text3)">${_diasRestantes} día${_diasRestantes!==1?'s':''} hasta la nómina</div>
      </div>
    </div>

    <!-- Dos columnas -->
    <div style="display:grid;grid-template-columns:1fr 1.1fr;gap:14px;align-items:start">

      <!-- Columna izquierda: Presupuesto -->
      <div class="card">
        <h3 style="margin-bottom:12px">Presupuesto mensual</h3>
        <div class="fin-budget-block" style="margin-bottom:10px">
          <div class="fin-budget-titulo">Ingresos</div>
          <div class="fin-budget-row"><span>Nómina Global Datamediatech</span><strong class="green">${fmt(sueldo)}</strong></div>
          <div class="fin-budget-row fin-budget-total"><span>Total</span><strong class="green">${fmt(sueldo)}</strong></div>
        </div>
        <div class="fin-budget-block" style="margin-bottom:10px">
          <div class="fin-budget-titulo">Gastos fijos personales</div>
          ${personal.map(g => filaPresup(g,'red')).join('')}
          ${conjunta.length ? `<div class="fin-budget-titulo" style="margin-top:8px">Conjunta</div>${conjunta.map(g=>filaPresup(g,'pink')).join('')}` : ''}
          <div class="fin-budget-row fin-budget-total"><span>Subtotal</span><strong>${fmt(totalFijo)}</strong></div>
        </div>
        <div class="fin-budget-block">
          <div class="fin-budget-titulo">Suscripciones</div>
          ${subs.map(g => filaPresup(g,'blue')).join('')}
          <div class="fin-budget-row fin-budget-total"><span>Subtotal</span><strong>${fmt(totalSubs)}</strong></div>
        </div>
      </div>

      <!-- Columna derecha: Gastos fijos detallados con día de cobro -->
      <div class="card">
        <h3 style="margin-bottom:12px">Gastos fijos con día de cobro</h3>
        <div style="font-size:.7rem;color:var(--text3);margin-bottom:10px">Personal · ${fmt(totalFijo)}/mes &nbsp;|&nbsp; Subs · ${fmt(totalSubs)}/mes</div>
        ${[...personal, ...subs].map(filaGasto).join('')}
        ${conjunta.length ? `
          <div style="font-size:.7rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-top:12px;margin-bottom:6px">Conjunta · ${fmt(totalConj)}/mes</div>
          ${conjunta.map(filaGasto).join('')}` : ''}
        ${pausados.length ? `
          <div style="font-size:.7rem;color:var(--text3);margin-top:12px;font-style:italic">⏸ ${pausados.length} gasto${pausados.length!==1?'s':''} pausado${pausados.length!==1?'s':''} (ver en Actualizar)</div>` : ''}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════
   PANEL: ACTUALIZAR SALDOS Y DATOS
══════════════════════════════════════════════════════ */
function renderFinActualizar() {
  const el = document.getElementById('fin-actualizar-content');
  if (!el) return;
  const s = getSaldosActuales();

  el.innerHTML = `
    <div class="card" style="margin-bottom:16px">
      <h3 style="margin-bottom:4px">💳 Actualizar saldos de cuentas</h3>
      <p style="font-size:.78rem;color:var(--text3);margin-bottom:16px">Los saldos que introduces aquí se guardan en este dispositivo y se usan en toda la sección. No se modifican los archivos del proyecto.</p>
      <div class="fin-act-grid">
        ${[
          { id:'ktx', label:'Kutxabank Personal', color:'#60a5fa', val: s.ktx },
          { id:'rvp', label:'Revolut Personal',   color:'#a78bfa', val: s.rvp },
          { id:'rvc', label:'Revolut Conjunta',   color:'#f472b6', val: s.rvc },
          { id:'ctv', label:'CTV – Vivienda',     color:'#34d399', val: s.ctv },
          { id:'bp',  label:'Baskepensiones 60',  color:'#fbbf24', val: s.bp  },
          { id:'fm',  label:'Fondo Monetario Revolut', color:'#818cf8', val: s.fm },
        ].map(a => `
          <div class="fin-act-row">
            <label class="fin-act-label" style="color:${a.color}">● ${a.label}</label>
            <input type="number" class="upd-input fin-act-input" id="fin-act-${a.id}" step="0.01" value="${a.val.toFixed(2)}" placeholder="0.00" />
            <span class="fin-act-actual">Actual: <strong>${fmt(a.val)}</strong></span>
          </div>`).join('')}
      </div>
      <button class="upd-btn" style="margin-top:16px;width:100%" onclick="guardarSaldos()">💾 Guardar saldos</button>
      <button class="upd-btn" style="margin-top:8px;width:100%;background:transparent;border:1px solid var(--text3);color:var(--text2)" onclick="resetSaldos()">↩ Restaurar saldos originales de los PDFs</button>
      ${(() => {
        const ts = Store.get('fin_saldos')._ts;
        if (!ts) return '<p style="font-size:.75rem;color:var(--text3);margin-top:10px">⚠️ Saldos no actualizados todavía — usando valores de los PDFs.</p>';
        const d = new Date(ts);
        const diff = Math.floor((Date.now() - ts) / 86400000);
        const cuando = diff === 0 ? 'hoy' : diff === 1 ? 'ayer' : `hace ${diff} días`;
        const color = diff > 7 ? 'var(--yellow)' : 'var(--text3)';
        return `<p style="font-size:.75rem;color:${color};margin-top:10px">🕐 Última actualización: ${d.toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})} a las ${d.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})} (${cuando})${diff > 7 ? ' — considera actualizar' : ''}</p>`;
      })()}
    </div>


    ${renderFinGastosFijosAdmin()}

    <div class="card">
      <h3 style="margin-bottom:4px">📊 Fondo Monetario Revolut</h3>
      <p style="font-size:.78rem;color:var(--text3);margin-bottom:14px">Registra el saldo diario o añade un mes al historial mensual.</p>

      <h4 style="font-size:.82rem;color:var(--accent2);margin-bottom:10px">Entrada diaria (seguimiento rápido)</h4>
      <div style="display:grid;grid-template-columns:140px 1fr 2fr auto;gap:8px;align-items:end;margin-bottom:6px">
        <div class="form-group" style="margin:0"><label style="font-size:.75rem">Fecha</label><input type="date" id="fin-fmd-fecha" class="upd-input" /></div>
        <div class="form-group" style="margin:0"><label style="font-size:.75rem">Saldo (€)</label><input type="number" id="fin-fmd-saldo" class="upd-input" step="0.01" placeholder="291.50" /></div>
        <div class="form-group" style="margin:0"><label style="font-size:.75rem">Nota (opcional)</label><input type="text" id="fin-fmd-nota" class="upd-input" placeholder="Aportación, retirada…" /></div>
        <button class="upd-btn" style="margin-bottom:0" onclick="addFMDiario()">➕</button>
      </div>
      <span id="fin-fmd-ok" class="update-success" style="display:none;font-size:.8rem">✓ Guardado</span>

      <hr style="border-color:var(--border);margin:16px 0">

      <h4 style="font-size:.82rem;color:var(--accent2);margin-bottom:10px">Resumen mensual (cierre de mes)</h4>
      <div class="fin-act-form">
        <input type="text" id="fin-fm-mes" class="upd-input" placeholder="Ej: Jul 2026" style="width:120px" />
        <input type="number" id="fin-fm-aport" class="upd-input" placeholder="Aportación (€)" step="0.01" />
        <input type="number" id="fin-fm-interes" class="upd-input" placeholder="Interés (€)" step="0.01" />
        <input type="number" id="fin-fm-saldo" class="upd-input" placeholder="Saldo final (€)" step="0.01" />
        <input type="text" id="fin-fm-nota" class="upd-input" placeholder="Nota (opcional)" />
        <button class="upd-btn" onclick="addMesFondoMonetario()">➕ Añadir mes</button>
      </div>
      <div id="fin-fm-feedback" style="font-size:.8rem;color:var(--green);margin-top:8px;display:none">✅ Mes añadido.</div>
    </div>`;
}

/* ══════════════════════════════════════════════════════
   GESTIÓN DE GASTOS FIJOS (CRUD)
══════════════════════════════════════════════════════ */
function renderFinGastosFijosAdmin() {
  const gastos = fin_getGastosFijos();
  const tipoLabel = { personal:'Personal', conjunta:'Conjunta', suscripcion:'Suscripción' };
  const tipoColor = { personal:'var(--red)', conjunta:'var(--pink)', suscripcion:'var(--blue)' };
  const ctaColor  = { KTX:'#60a5fa', RVP:'#a78bfa', RVC:'#f472b6', CTV:'#34d399', BP:'#fbbf24' };

  return `
  <div class="card" style="margin-bottom:16px">
    <h3 style="margin-bottom:4px">📋 Gestionar gastos fijos y suscripciones</h3>
    <p style="font-size:.78rem;color:var(--text3);margin-bottom:14px">Los cambios se aplican en toda la app: presupuesto, agenda, auto-generación de transacciones.</p>

    <div style="margin-bottom:16px">
      ${gastos.map((g, i) => `
      <div style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);opacity:${g.activo ? '1' : '.4'}">
        <div>
          <span style="font-size:.87rem;font-weight:600">${g.nombre}</span>
          ${g.dia ? `<span style="font-size:.7rem;color:var(--text3);margin-left:6px">día ${g.dia}</span>` : ''}
          ${g.hasta ? `<span style="font-size:.68rem;color:var(--orange);margin-left:4px">hasta ${g.hasta}</span>` : ''}
          <br>
          <span style="font-size:.72rem;color:${tipoColor[g.tipo]}">${tipoLabel[g.tipo]}</span>
          <span style="font-size:.72rem;color:${ctaColor[g.cuenta] || 'var(--text3)'}"> · ${g.cuenta}</span>
          <span style="font-size:.72rem;color:var(--text3)"> · ${g.cat}</span>
        </div>
        <span style="font-size:.9rem;font-weight:700;color:${g.activo ? 'var(--red)' : 'var(--text3)'}">-${fmt(g.importe)}</span>
        <button onclick="finGFToggle(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);cursor:pointer;padding:3px 8px;font-size:.75rem;font-family:inherit">${g.activo ? '⏸ Pausar' : '▶ Activar'}</button>
        <button onclick="finGFEditar(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;color:var(--text2);cursor:pointer;padding:3px 8px;font-size:.75rem;font-family:inherit">✏️ Editar</button>
        <button onclick="finGFBorrar(${i})" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:3px 6px;font-size:.85rem">✕</button>
      </div>`).join('')}
    </div>

    <details style="margin-top:4px">
      <summary style="cursor:pointer;font-size:.85rem;font-weight:600;color:var(--accent2);margin-bottom:12px">➕ Añadir nuevo gasto fijo / suscripción</summary>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
        <div class="form-group">
          <label>Nombre</label>
          <input type="text" id="fin-gf-nombre" class="upd-input" placeholder="Ej: Spotify" />
        </div>
        <div class="form-group">
          <label>Importe (€)</label>
          <input type="number" id="fin-gf-importe" class="upd-input" step="0.01" placeholder="0.00" />
        </div>
        <div class="form-group">
          <label>Tipo</label>
          <select id="fin-gf-tipo" class="upd-input">
            <option value="personal">Personal</option>
            <option value="conjunta">Conjunta</option>
            <option value="suscripcion">Suscripción</option>
          </select>
        </div>
        <div class="form-group">
          <label>Cuenta</label>
          <select id="fin-gf-cuenta" class="upd-input">
            <option value="KTX">KTX – Kutxabank</option>
            <option value="RVP">RVP – Revolut Personal</option>
            <option value="RVC">RVC – Revolut Conjunta</option>
            <option value="CTV">CTV – Cuenta Vivienda</option>
            <option value="BP">BP – Baskepensiones</option>
          </select>
        </div>
        <div class="form-group">
          <label>Día de cobro (1–31)</label>
          <input type="number" id="fin-gf-dia" class="upd-input" min="1" max="31" placeholder="Ej: 5" />
        </div>
        <div class="form-group">
          <label>Categoría</label>
          <select id="fin-gf-cat" class="upd-input">
            ${Object.entries(CAT_META).filter(([k])=>k!=='interna').map(([k,v])=>`<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Hasta (YYYY-MM, opcional)</label>
          <input type="text" id="fin-gf-hasta" class="upd-input" placeholder="Ej: 2027-03" />
        </div>
        <div class="form-group">
          <label>Nota</label>
          <input type="text" id="fin-gf-nota" class="upd-input" placeholder="Opcional" />
        </div>
      </div>
      <button class="upd-btn" style="margin-top:8px" onclick="finGFAnadir()">➕ Añadir gasto fijo</button>
      <span class="update-success" id="fin-gf-ok" style="display:none;margin-left:10px;color:var(--green);font-size:.82rem">✓ Guardado</span>
    </details>
  </div>`;
}

function finGFAnadir() {
  const nombre  = document.getElementById('fin-gf-nombre')?.value?.trim();
  const importe = parseFloat(document.getElementById('fin-gf-importe')?.value);
  const tipo    = document.getElementById('fin-gf-tipo')?.value;
  const cuenta  = document.getElementById('fin-gf-cuenta')?.value;
  const dia     = parseInt(document.getElementById('fin-gf-dia')?.value) || null;
  const cat     = document.getElementById('fin-gf-cat')?.value;
  const hasta   = document.getElementById('fin-gf-hasta')?.value?.trim() || null;
  const nota    = document.getElementById('fin-gf-nota')?.value?.trim() || '';

  if (!nombre || isNaN(importe) || !tipo || !cuenta) {
    alert('Rellena al menos nombre, importe, tipo y cuenta.'); return;
  }
  const list = fin_getGastosFijos();
  list.push({ id: 'gf_' + Date.now(), nombre, importe, tipo, cuenta, dia, cat: cat || 'otros', hasta, nota, activo: true });
  fin_saveGastosFijos(list);
  renderFinActualizar();
  renderFinPresupuesto();
  renderFinGastosFijos(); // agenda section
}

function finGFToggle(i) {
  const list = fin_getGastosFijos();
  list[i].activo = !list[i].activo;
  fin_saveGastosFijos(list);
  renderFinActualizar();
  renderFinPresupuesto();
  renderFinGastosFijos();
}

function finGFBorrar(i) {
  if (!confirm('¿Eliminar este gasto fijo?')) return;
  const list = fin_getGastosFijos();
  list.splice(i, 1);
  fin_saveGastosFijos(list);
  renderFinActualizar();
  renderFinPresupuesto();
  renderFinGastosFijos();
}

function finGFEditar(i) {
  const list = fin_getGastosFijos();
  const g = list[i];
  const nombre  = prompt('Nombre:', g.nombre);       if (nombre === null) return;
  const importe = parseFloat(prompt('Importe:', g.importe));
  const dia     = parseInt(prompt('Día de cobro (vacío = variable):', g.dia || '')) || null;
  const hasta   = prompt('Hasta (YYYY-MM, vacío = indefinido):', g.hasta || '') || null;
  const nota    = prompt('Nota:', g.nota || '') || '';
  if (isNaN(importe)) { alert('Importe inválido'); return; }
  list[i] = { ...g, nombre: nombre.trim(), importe, dia, hasta, nota };
  fin_saveGastosFijos(list);
  renderFinActualizar();
  renderFinPresupuesto();
  renderFinGastosFijos();
}

function guardarSaldos() {
  const ids = ['ktx','rvp','rvc','ctv','bp','fm'];
  const data = {};
  let ok = true;
  ids.forEach(id => {
    const v = parseFloat(document.getElementById('fin-act-'+id)?.value);
    if (isNaN(v)) { ok = false; return; }
    data[id] = v;
  });
  if (!ok) { alert('Revisa los valores — todos deben ser números.'); return; }
  data._ts = Date.now();
  Store.set('fin_saldos', data);
  renderFinStats();
  renderFinActualizar();
  renderFinSinking();
}

function resetSaldos() {
  if (!confirm('¿Restaurar los saldos originales de los PDFs?')) return;
  localStorage.removeItem('fin_saldos');
  renderFinStats();
  renderFinActualizar();
  renderFinSinking();
}

function marcarCuotaIphone(delta) {
  const actual = parseInt(localStorage.getItem('fin_cuotas_extra') || '0');
  const nuevo = Math.max(0, actual + delta);
  localStorage.setItem('fin_cuotas_extra', String(nuevo));
  renderFinDeudas();
  renderFinActualizar();
  renderFinStats();
}

function addFMDiario() {
  const fecha = document.getElementById('fin-fmd-fecha')?.value;
  const saldo = parseFloat(document.getElementById('fin-fmd-saldo')?.value);
  const nota  = document.getElementById('fin-fmd-nota')?.value?.trim() || '';
  if (!fecha || isNaN(saldo)) { alert('Indica fecha y saldo.'); return; }
  const daily = Store.get('fin_fm_daily', []);
  // Actualiza si ya existe esa fecha, o añade
  const idx = daily.findIndex(d => d.fecha === fecha);
  if (idx >= 0) daily[idx] = { fecha, saldo, nota };
  else daily.push({ fecha, saldo, nota });
  Store.set('fin_fm_daily', daily);
  // Actualiza también el saldo FM actual
  const saldos = Store.get('fin_saldos');
  saldos.fm = saldo;
  saldos._ts = Date.now();
  Store.set('fin_saldos', saldos);
  document.getElementById('fin-fmd-saldo').value = '';
  document.getElementById('fin-fmd-nota').value  = '';
  mostrarOk('fin-fmd-ok');
  renderFinSinking();
  renderFinStats();
  renderFinActualizar();
}

function finFMDailyBorrar(i) {
  const daily = Store.get('fin_fm_daily', []).sort((a,b) => b.fecha.localeCompare(a.fecha));
  daily.splice(i, 1);
  Store.set('fin_fm_daily', daily);
  renderFinSinking();
}

function addMesFondoMonetario() {
  const mes     = document.getElementById('fin-fm-mes')?.value?.trim();
  const aport   = parseFloat(document.getElementById('fin-fm-aport')?.value);
  const interes = parseFloat(document.getElementById('fin-fm-interes')?.value);
  const saldo   = parseFloat(document.getElementById('fin-fm-saldo')?.value);
  const nota    = document.getElementById('fin-fm-nota')?.value?.trim();
  if (!mes || isNaN(interes) || isNaN(saldo)) { alert('Rellena al menos mes, interés y saldo final.'); return; }
  const extra = Store.get('fin_fm_extra', []);
  const anterior = FIN_DATA.revolut_fondo_monetario.historial[FIN_DATA.revolut_fondo_monetario.historial.length-1]?.saldo_final ?? 642.22;
  extra.push({ mes, aportacion: isNaN(aport) ? 0 : aport, saldo_anterior: anterior, interes, saldo_final: saldo, nota });
  Store.set('fin_fm_extra', extra);
  ['fin-fm-mes','fin-fm-aport','fin-fm-interes','fin-fm-saldo','fin-fm-nota'].forEach(id => { const e = document.getElementById(id); if(e) e.value=''; });
  const fb = document.getElementById('fin-fm-feedback');
  if (fb) { fb.style.display='block'; setTimeout(()=>fb.style.display='none', 3000); }
  renderFinSinking();
}

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function fmt(v) {
  if (v===undefined||v===null||isNaN(v)) return '—';
  return Fmt.eur2(v);
}
function fmtFechaShort(f) {
  if (!f) return '—';
  return new Date(f+'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
}
function set(id, val) { const el=document.getElementById(id); if(el) el.textContent=val; }

/* ══════════════════════════════════════════════════════
   REVOLUT — INTERESES DIARIOS
══════════════════════════════════════════════════════ */
const RV_INT_KEY = 'fin_revolut_intereses';

function rv_getEntradas() {
  try { return Store.get(RV_INT_KEY, []); } catch { return []; }
}
function rv_saveEntradas(arr) { Store.set(RV_INT_KEY, arr); }

function renderFinRevolutIntereses() {
  const el = document.getElementById('fin-revolut-content');
  if (!el) return;
  const entradas = rv_getEntradas();
  const total = entradas.reduce((s, e) => s + (parseFloat(e.importe) || 0), 0);
  const _d = new Date(); const hoy = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`;
  const sorted = [...entradas].sort((a, b) => b.fecha.localeCompare(a.fecha));

  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap">
      <span style="font-size:1.1rem">💸</span>
      <span style="font-weight:700;font-size:.95rem">Intereses ganados — Fondo Revolut</span>
      <span style="margin-left:auto;font-size:2.2rem;font-weight:900;color:var(--green)">${fmt(total)}</span>
    </div>

    <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px;padding:12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
      <div class="form-group" style="margin:0;flex:0 0 auto">
        <label style="font-size:.7rem;color:var(--text3)">Fecha</label>
        <input type="date" id="rv-fecha" value="${hoy}" style="font-size:.85rem;width:140px">
      </div>
      <div class="form-group" style="margin:0;flex:1;min-width:110px">
        <label style="font-size:.7rem;color:var(--text3)">Interés ganado (€)</label>
        <input type="number" id="rv-importe" step="0.01" min="0" placeholder="Ej: 1.23"
          style="font-size:.95rem;font-weight:700;width:100%"
          onkeydown="if(event.key==='Enter') rv_anadir()">
      </div>
      <button onclick="rv_anadir()"
        style="background:var(--green);color:#fff;border:none;border-radius:8px;padding:8px 18px;cursor:pointer;font-weight:700;font-size:.85rem;white-space:nowrap">
        + Añadir
      </button>
    </div>

    ${entradas.length === 0
      ? `<div style="font-size:.78rem;color:var(--text3);text-align:center;padding:16px 0">Aún no hay entradas. Añade el interés de hoy 👆</div>`
      : `<div style="display:flex;flex-direction:column;gap:5px">
          ${sorted.map((e) => {
            const idx = entradas.indexOf(e);
            const fechaFmt = new Date(e.fecha+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'});
            return '<div style="display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:8px;background:var(--surface2);border:1px solid var(--border)">'
              + '<span style="font-size:.78rem;color:var(--text3);min-width:96px">' + fechaFmt + '</span>'
              + '<span style="flex:1;font-size:.9rem;font-weight:700;color:var(--green)">+' + fmt(parseFloat(e.importe)||0) + '</span>'
              + '<button onclick="rv_borrar(' + idx + ')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:.8rem;padding:2px 6px" title="Eliminar">🗑️</button>'
              + '</div>';
          }).join('')}
        </div>`
    }`;
}

function rv_anadir() {
  const fecha   = document.getElementById('rv-fecha')?.value;
  const importe = parseFloat(document.getElementById('rv-importe')?.value);
  if (!fecha || !importe || importe <= 0) { alert('Introduce una fecha y un importe válido.'); return; }
  const entradas = rv_getEntradas();
  entradas.push({ fecha, importe });
  rv_saveEntradas(entradas);
  document.getElementById('rv-importe').value = '';
  renderFinRevolutIntereses();
  renderFinSinking();
  renderFinStats();
}

function rv_borrar(idx) {
  const entradas = rv_getEntradas();
  if (!confirm('¿Eliminar esta entrada?')) return;
  entradas.splice(idx, 1);
  rv_saveEntradas(entradas);
  renderFinRevolutIntereses();
  renderFinSinking();
  renderFinStats();
}

/* ══════════════════════════════════════════════════════
   CTV KUTXABANK — SIMULADOR DE AHORRO
══════════════════════════════════════════════════════ */

function ctv_simularCrecimiento(saldoInicial, metaTotal) {
  const APORTACION_BASE   = 8500;
  const INT_PRIMEROS_500  = 0.0001;   // 0.01% TIN para primeros 500 €
  const INT_RESTO         = 0.01334;  // 60% Euríbor 1a ~2.223% → ~1.334% TIN

  function calcInteres(saldo) {
    return Math.min(saldo, 500) * INT_PRIMEROS_500
         + Math.max(0, saldo - 500) * INT_RESTO;
  }

  return [
    { label: 'Menor de 36 años', deduccion: 0.23 },
    { label: '36 años o más',    deduccion: 0.18 },
  ].map(esc => {
    let saldo = saldoInicial;
    let pendienteHacienda = 0; // devolución pendiente de recibir el siguiente año
    let totalIntereses = 0;
    const rows = [];

    for (let anio = 1; anio <= 25; anio++) {
      const haciendaRecibida = pendienteHacienda;
      saldo += APORTACION_BASE + haciendaRecibida;
      const interes = calcInteres(saldo);
      saldo += interes;
      totalIntereses += interes;
      pendienteHacienda = APORTACION_BASE * esc.deduccion;

      rows.push({
        anio,
        haciendaRecibida: +haciendaRecibida.toFixed(2),
        interes: +interes.toFixed(2),
        saldo: +saldo.toFixed(2),
        alcanzado: saldo >= metaTotal,
      });
      if (saldo >= metaTotal) break;
    }

    return {
      ...esc,
      rows,
      totalIntereses: +totalIntereses.toFixed(2),
      bonusFinal: +Math.min(1000, totalIntereses * 0.40).toFixed(2),
    };
  });
}

function renderFinCTVSimulador() {
  const el = document.getElementById('fin-ctv-sim-inner');
  if (!el) return;

  const s = getSaldosActuales();
  const ctv = s.ctv;

  // Calcular meta desde config de piso si existe
  let metaTotal = 51500;
  const pisoCfg = Store.get('piso_config');
  if (pisoCfg.precio_ref) {
    const precio = pisoCfg.precio_ref;
    const hip    = precio * ((pisoCfg.financiacion || 80) / 100);
    const arras  = precio * 0.10;
    const itpAmt = precio * ((pisoCfg.itp || 5) / 100);
    const resto  = precio - arras - 1000 - hip;
    metaTotal = arras + 1000 + (resto > 0 ? resto : 0) + itpAmt + (pisoCfg.notario || 1500);
  }

  const falta = Math.max(0, metaTotal - ctv);
  const sims  = ctv_simularCrecimiento(ctv, metaTotal);
  const colorSim = ['var(--green)', 'var(--accent)'];

  el.innerHTML = `
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start;margin-bottom:14px">
      <div>
        <div style="font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Saldo CTV actual</div>
        <div style="font-size:1.5rem;font-weight:900;color:var(--green)">${fmt(ctv)}</div>
      </div>
      <div style="display:flex;align-items:center;color:var(--text3);font-size:1.2rem;padding-top:12px">→</div>
      <div>
        <div style="font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Objetivo piso (entrada + ITP + gastos)</div>
        <div style="font-size:1.5rem;font-weight:900;color:var(--accent2)">${fmt(metaTotal)}</div>
      </div>
      <div>
        <div style="font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Falta</div>
        <div style="font-size:1.5rem;font-weight:900;color:var(--red)">${fmt(falta)}</div>
      </div>
    </div>

    <div style="background:var(--bg3);border-radius:10px;padding:10px 14px;border:1px solid var(--border);margin-bottom:16px;font-size:.76rem;color:var(--text2);line-height:1.6">
      <strong style="color:var(--accent2)">Cuenta Vivienda Kutxabank · condiciones reales:</strong><br>
      Aportación óptima <strong>8.500 €/año</strong> (base máxima desgravable en Euskadi) ·
      Primeros 500 € al 0,01% TIN · Resto al ~1,33% TIN (60% Euríbor 1a de 2,223%) ·
      Sin comisiones · La devolución de Hacienda se reinvierte el año siguiente ·
      <strong>Bonus Kutxabank al contratar hipoteca: 40% de intereses acumulados (máx 1.000 €)</strong>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:14px">
      ${sims.map((sim, si) => {
        const c = colorSim[si];
        const lastRow = sim.rows[sim.rows.length - 1];
        const anios = lastRow.alcanzado ? lastRow.anio : '> 25';
        const devAnual = fmt(8500 * sim.deduccion);
        return `
        <div class="card" style="border-top:3px solid ${c};padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div>
              <div style="font-weight:700;color:${c};font-size:.85rem">${sim.label}</div>
              <div style="font-size:.7rem;color:var(--text3)">
                Deducción ${(sim.deduccion*100).toFixed(0)}% · ${devAnual}/año devuelve Hacienda
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:2rem;font-weight:900;color:${c};line-height:1">${anios}</div>
              <div style="font-size:.63rem;color:var(--text3)">${typeof anios==='number'?'años para la meta':''}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-bottom:12px">
            <div style="flex:1;background:var(--surface2);border-radius:8px;padding:7px 10px">
              <div style="font-size:.63rem;color:var(--text3)">Intereses CTV totales</div>
              <div style="font-weight:700;color:var(--green)">${fmt(sim.totalIntereses)}</div>
            </div>
            <div style="flex:1;background:var(--surface2);border-radius:8px;padding:7px 10px">
              <div style="font-size:.63rem;color:var(--text3)">Bonus Kutxabank</div>
              <div style="font-weight:700;color:${c}">${fmt(sim.bonusFinal)}</div>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:.73rem">
              <thead>
                <tr style="background:var(--bg3)">
                  <th style="padding:4px 6px;text-align:center;color:var(--text3);font-weight:600">Año</th>
                  <th style="padding:4px 6px;text-align:right;color:var(--text3);font-weight:600">Aportas</th>
                  <th style="padding:4px 6px;text-align:right;color:var(--green);font-weight:600">+ Hacienda</th>
                  <th style="padding:4px 6px;text-align:right;color:var(--accent2);font-weight:600">Interés</th>
                  <th style="padding:4px 6px;text-align:right;font-weight:700">Saldo CTV</th>
                </tr>
              </thead>
              <tbody>
                ${sim.rows.map(r => `
                <tr style="border-bottom:1px solid var(--border);${r.alcanzado?'background:'+c+'18;':''}">
                  <td style="padding:4px 6px;text-align:center;color:var(--text3)">${r.anio}</td>
                  <td style="padding:4px 6px;text-align:right">${fmt(8500)}</td>
                  <td style="padding:4px 6px;text-align:right;color:var(--green)">${r.haciendaRecibida>0?'+'+fmt(r.haciendaRecibida):'—'}</td>
                  <td style="padding:4px 6px;text-align:right;color:var(--accent2)">+${fmt(r.interes)}</td>
                  <td style="padding:4px 6px;text-align:right;font-weight:${r.alcanzado?700:400};color:${r.alcanzado?c:'var(--text)'}">
                    ${fmt(r.saldo)}${r.alcanzado?' ✓':''}
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}
