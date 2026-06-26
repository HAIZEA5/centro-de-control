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

function _fmtEdad(ts) {
  if (!ts) return null;
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return { txt: 'Actualizado hoy', color: 'var(--green)' };
  if (days === 1) return { txt: 'Actualizado ayer', color: 'var(--text3)' };
  if (days < 7)  return { txt: `Actualizado hace ${days} días`, color: 'var(--text3)' };
  if (days < 15) return { txt: `Actualizado hace ${Math.round(days/7)} sem.`, color: 'var(--text3)' };
  if (days < 30) return { txt: `Hace ${days} días — ¡toca revisar!`, color: 'var(--orange)' };
  return { txt: `Hace ${Math.round(days/30)} mes${Math.round(days/30)>1?'es':''} — ¡actualiza!`, color: 'var(--red)' };
}

function loadFinanzas() {
  renderFinStats();
  fin_patrRenderChart();
  setupFinTabs();
  renderFinResumen();
  renderFinTransacciones();
  renderFinSinking();
  renderFinDeudas();
  renderFinPresupuestoYGastos();
}

/* ══════════════════════════════════════════════════════
   STATS CARDS
══════════════════════════════════════════════════════ */
function getSaldosActuales() {
  const saved = Store.get('fin_saldos');
  const c = FIN_DATA.cuentas;
  const fmBase = saved.fm ?? (FIN_DATA.revolut_fondo_monetario.historial[FIN_DATA.revolut_fondo_monetario.historial.length-1]?.saldo_final ?? 291.28);
  return {
    ktx: saved.ktx ?? c.kutxabank_personal.saldo,
    rvp: saved.rvp ?? c.revolut_personal.saldo,
    rvc: saved.rvc ?? c.revolut_conjunta.saldo,
    ctv: saved.ctv ?? c.ctv_vivienda.saldo,
    bp:  saved.bp  ?? c.baskepensiones.saldo,
    fm:  fmBase,
    fmBase,
    interesesDiarios: 0,
  };
}

function renderFinStats() {
  const s = getSaldosActuales();
  const saldoTotal = s.ktx + s.rvp + s.rvc + s.ctv + s.bp;

  // Deuda iPhone restante
  const deuda = FIN_DATA.deudas?.[0];
  const extra  = parseInt(Store.get('fin_cuotas_extra', '0'));
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
  set('fin-fm-card-saldo', fmt(s.fm));
  set('dash-ahorro',    fmt(saldoTotal));

  // Timestamps por cuenta
  const sal = Store.get('fin_saldos', {});
  ['ktx','rvp','rvc','ctv','bp','fm'].forEach(id => {
    const el = document.getElementById('fin-'+id+'-ts');
    if (!el) return;
    const edad = _fmtEdad(sal[id+'_ts']);
    el.textContent = edad ? edad.txt : '';
    el.style.color = edad ? edad.color : '';
  });

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

  // CTV — aportaciones del año en curso
  const anoActual = new Date().getFullYear();
  const ctvAports = Store.get('ctv_aportaciones', []);
  const aportadoAnio = ctvAports.filter(a => a.anio === anoActual).reduce((s, a) => s + (parseFloat(a.importe) || 0), 0);
  const LIMITE_ANUAL = 8500;
  const pctAnual = Math.min(100, (aportadoAnio / LIMITE_ANUAL) * 100);
  const anualBar = document.getElementById('fin-ctv-anual-bar');
  const anualPct = document.getElementById('fin-ctv-anual-pct');
  const anualInfo = document.getElementById('fin-ctv-anual-info');
  const haciendaTip = document.getElementById('fin-ctv-hacienda-tip');
  if (anualBar) anualBar.style.width = pctAnual.toFixed(1) + '%';
  if (anualPct) anualPct.textContent = pctAnual.toFixed(0) + '%';
  if (anualInfo) anualInfo.textContent = `${fmt(aportadoAnio)} / ${fmt(LIMITE_ANUAL)} año`;
  if (haciendaTip) {
    const devolucion = Math.min(aportadoAnio, LIMITE_ANUAL) * 0.23;
    haciendaTip.textContent = devolucion > 0 ? `🏦 IRPF: +${fmt(devolucion)}` : '';
  }
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
      // Inicializar panel Ajustar la primera vez que se abre
      if (tab.dataset.fintab === 'fin-panel-ajustar' && typeof setupUpdFinanzas === 'function') {
        setupUpdFinanzas();
      }
    });
  });
  // Generar opciones de mes dinámicamente desde transacciones + mes actual
  const mesSelect = document.getElementById('fin-mes-filter');
  if (mesSelect) {
    const hoy = new Date();
    const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
    const txns = [...FIN_DATA.transacciones, ...Store.get('fin_txns', []), ...fin_autoTxns()];
    const mesesConDatos = [...new Set(txns.map(t => (t.f || t.fecha || '').substring(0, 7)).filter(Boolean))];
    if (!mesesConDatos.includes(mesActual)) mesesConDatos.push(mesActual);
    mesesConDatos.sort();
    const MESES_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    mesSelect.innerHTML = '<option value="">Todos los meses</option>' +
      mesesConDatos.map(m => {
        const [y, mo] = m.split('-');
        return `<option value="${m}">${MESES_ES[parseInt(mo)-1]} ${y}</option>`;
      }).join('');
    mesSelect.value = mesActual;
  }
  if (!window._finTabsSetup) {
    window._finTabsSetup = true;
    document.getElementById('fin-mes-filter')?.addEventListener('change',  renderFinTransacciones);
    document.getElementById('fin-cat-filter')?.addEventListener('change',  renderFinTransacciones);
    document.getElementById('fin-cta-filter')?.addEventListener('change',  renderFinTransacciones);
    document.getElementById('fin-search')?.addEventListener('input',       renderFinTransacciones);
    document.getElementById('fin-hide-internal')?.addEventListener('change',renderFinTransacciones);
    document.getElementById('fin-add-txn')?.addEventListener('click',      addTransaccionManual);
  }
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
  const stored = Store.get('fin_gastos_fijos', null);
  const p = FIN_DATA.presupuesto;
  let id = 0;
  const toEntry = (g, tipo) => ({
    id: 'gf_' + (id++),
    nombre: g.nombre, importe: g.importe, cuenta: g.cuenta,
    tipo, dia: _FIN_DIAS_COBRO[g.nombre] || null,
    cat: _FIN_CAT_GF[g.nombre] || 'otros',
    hasta: g.hasta || null, nota: g.nota || '', activo: true,
  });
  const fromData = [
    ...p.gastos_fijos.map(g => toEntry(g, 'personal')),
    ...p.gastos_fijos_conjunta.map(g => toEntry(g, 'conjunta')),
    ...p.suscripciones_personales.map(g => toEntry(g, 'suscripcion')),
  ];
  if (!stored) {
    Store.set('fin_gastos_fijos', fromData);
    return fromData;
  }
  // Añadir entradas nuevas de FIN_DATA que no estén ya en el store
  let changed = false;
  fromData.forEach(entry => {
    if (!stored.find(s => s.nombre === entry.nombre)) {
      stored.push(entry);
      changed = true;
    }
  });
  if (changed) Store.set('fin_gastos_fijos', stored);
  return stored;
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
      <div class="fin-year-card"><div class="fin-year-label">Conjunta estimado</div><div class="fin-year-val" style="color:var(--pink)">${fmt(totalConj)}/mes</div></div>
      <div class="fin-year-card"><div class="fin-year-label">Total comprometido</div><div class="fin-year-val red">${fmt(totalTodo)}/mes</div></div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <h3 style="margin-bottom:12px">💸 Gastos fijos personales</h3>
      ${personal.length ? personal.map(renderRow).join('') : '<p style="color:var(--text3);font-size:.85rem">Sin gastos fijos personales.</p>'}
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
  // Convertir intereses registrados en Actualizar a filas del historial,
  // solo si ese mes no existe ya en el historial base o en fmExtra
  // Agrupar intereses registrados por mes (YYYY-MM) para sumarlos al historial
  const _normMes = s => (s || '').toLowerCase().replace(/\./g, '').trim();
  const interesesPorMes = {}; // clave: "YYYY-MM"
  Store.get('cdc_intereses_fm', []).forEach(e => {
    const clave = e.fecha.substring(0, 7); // "YYYY-MM"
    interesesPorMes[clave] = (interesesPorMes[clave] || 0) + (parseFloat(e.importe) || 0);
  });

  // Fusionar: sumar intereses registrados al mes existente si coincide, o añadir fila nueva si no existe
  const histBase = [...fm.historial, ...fmExtra];
  const mesesEnHistorial = {}; // clave normalizada → índice en histBase
  histBase.forEach((h, i) => { mesesEnHistorial[_normMes(h.mes)] = i; });

  // Clonar histBase para poder modificar intereses
  const histConIntereses = histBase.map(h => ({ ...h }));
  const filasSueltas = [];

  Object.entries(interesesPorMes).forEach(([clave, totalInt]) => {
    // Buscar si alguna fila del historial corresponde a este mes
    const d = new Date(clave + '-01T12:00:00');
    const mesLabel = d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    const norm = _normMes(mesLabel);
    const idx = mesesEnHistorial[norm];
    if (idx !== undefined) {
      const prev = histConIntereses[idx];
      histConIntereses[idx] = {
        ...prev,
        interes: (prev.interes || 0) + totalInt,
        saldo_final: prev.saldo_final !== null && prev.saldo_final !== undefined ? prev.saldo_final + totalInt : prev.saldo_final
      };
    } else {
      filasSueltas.push({ mes: mesLabel, aportacion: 0, interes: totalInt, saldo_final: null, nota: 'registrado' });
    }
  });

  const fmHistorial = [...histConIntereses, ...filasSueltas];
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
      <a href="#finanzas" onclick="event.preventDefault();document.querySelector('a[href=\'#finanzas\']')?.click();setTimeout(()=>{document.querySelector('[data-fintab=\'fin-panel-ajustar\']')?.click();setTimeout(()=>document.getElementById('upd-fin-compras')?.scrollIntoView({behavior:'smooth'}),150)},300)" style="font-size:.75rem;color:var(--accent2)">✏️ Editar en Finanzas → Ajustar</a>
    </div>` : ''}

    <div class="card" style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <div>
          <h3 style="margin-bottom:4px">Revolut – Fondo Monetario Flexible</h3>
          ${(() => {
            const sal = Store.get('fin_saldos', {});
            const ts = sal.fm_ts || sal._ts;
            if (!ts) return '<div style="font-size:.72rem;color:var(--yellow)">⚠️ Sin fecha de actualización — actualiza el saldo manualmente</div>';
            const d = new Date(ts);
            const ahora = new Date();
            const diffMs = ahora - d;
            const diffMin = Math.floor(diffMs / 60000);
            const diffH   = Math.floor(diffMs / 3600000);
            const diffD   = Math.floor(diffMs / 86400000);
            let hace = diffMin < 2 ? 'hace un momento'
              : diffMin < 60 ? `hace ${diffMin} min`
              : diffH < 24 ? `hace ${diffH}h`
              : diffD === 1 ? 'ayer'
              : `hace ${diffD} días`;
            const color = diffD >= 7 ? 'var(--red)' : diffD >= 3 ? 'var(--yellow)' : 'var(--green)';
            const fecha = d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
            const hora  = d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
            return `<div style="font-size:.72rem;color:${color};display:flex;align-items:center;gap:6px">
              <span>🕐 Última actualización: <strong>${fecha} ${hora}</strong> · <em>${hace}</em></span>
              ${diffD >= 7 ? '<span style="background:#ff000020;border:1px solid var(--red);border-radius:5px;padding:1px 7px;font-size:.65rem;font-weight:700">DESACTUALIZADO</span>' : ''}
            </div>`;
          })()}
        </div>
        <div style="min-width:260px">
          <div style="font-size:.72rem;color:var(--text3);font-weight:600;margin-bottom:6px">💹 Añadir interés</div>
          <div style="display:grid;grid-template-columns:120px 1fr auto;gap:6px;align-items:end">
            <div><label style="font-size:.68rem;color:var(--text3)">Fecha</label><input type="date" id="ufin-int-fecha" class="upd-input" style="font-size:.78rem;padding:4px 6px" /></div>
            <div><label style="font-size:.68rem;color:var(--text3)">Interés neto (€)</label><input type="number" id="ufin-int-importe" class="upd-input" step="0.01" placeholder="0.15" style="font-size:.78rem;padding:4px 6px" /></div>
            <button class="upd-btn" style="margin-bottom:0;padding:5px 10px;font-size:.78rem" onclick="ufin_addInteresFM()">Guardar</button>
          </div>
          <span id="ufin-int-ok" class="update-success" style="display:none;font-size:.75rem;margin-top:4px">✓ Guardado</span>
          <div id="ufin-int-total" style="font-size:.78rem;color:var(--accent2);font-weight:600;margin-top:6px"></div>
          <div id="ufin-int-lista" style="margin-top:6px;max-height:140px;overflow-y:auto"></div>
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
        <div class="fin-year-card"><div class="fin-year-label">Rentabilidad est.</div><div class="fin-year-val" style="color:var(--text2)">~1.38%</div></div>
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

    ${_renderFMProyeccion(s.fm)}

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
  setTimeout(() => { if (typeof ufin_renderInteresFM === 'function') ufin_renderInteresFM(); }, 0);
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
   FONDO MONETARIO — PROYECCIÓN A FUTURO
══════════════════════════════════════════════════════ */
function _renderFMProyeccion(saldoActual) {
  const aportacion = parseFloat(Store.get('fin_fm_aportacion', 50));
  const APY = 0.0138;
  const r = Math.pow(1 + APY, 1/12) - 1;

  function proyectar(meses) {
    let s = saldoActual;
    for (let i = 0; i < meses; i++) s = (s + aportacion) * (1 + r);
    return s;
  }

  const p1 = proyectar(12);
  const p3 = proyectar(36);
  const p5 = proyectar(60);
  const p10 = proyectar(120);
  const soloInteres5 = (() => {
    let s = saldoActual; for (let i=0;i<60;i++) s = s*(1+r); return s;
  })();

  return `
  <div class="card" style="margin-bottom:16px;border-left:3px solid var(--accent2)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <h3>📈 Proyección Fondo Monetario (~1.38% TIR)</h3>
      <div style="display:flex;align-items:center;gap:8px">
        <label style="font-size:.75rem;color:var(--text3)">Aportación/mes:</label>
        <input type="number" id="fin-fm-apor-input" value="${aportacion}" min="0" step="5"
          style="width:80px;font-size:.82rem;padding:4px 8px;background:var(--bg3);border:1px solid var(--border);border-radius:6px;color:var(--text)"
          onchange="Store.set('fin_fm_aportacion', parseFloat(this.value)||0); renderFinSinking();" />
        <span style="font-size:.75rem;color:var(--text3)">€</span>
      </div>
    </div>
    <div class="fin-year-stats">
      <div class="fin-year-card">
        <div class="fin-year-label">En 1 año</div>
        <div class="fin-year-val accent2">${fmt(p1)}</div>
        <div style="font-size:.63rem;color:var(--green)">+${fmt(p1-saldoActual)}</div>
      </div>
      <div class="fin-year-card">
        <div class="fin-year-label">En 3 años</div>
        <div class="fin-year-val accent2">${fmt(p3)}</div>
        <div style="font-size:.63rem;color:var(--green)">+${fmt(p3-saldoActual)}</div>
      </div>
      <div class="fin-year-card" style="border:1px solid var(--accent2)">
        <div class="fin-year-label">En 5 años</div>
        <div class="fin-year-val accent2">${fmt(p5)}</div>
        <div style="font-size:.63rem;color:var(--green)">+${fmt(p5-saldoActual)}</div>
      </div>
      <div class="fin-year-card">
        <div class="fin-year-label">En 10 años</div>
        <div class="fin-year-val accent2">${fmt(p10)}</div>
        <div style="font-size:.63rem;color:var(--green)">+${fmt(p10-saldoActual)}</div>
      </div>
    </div>
    <div style="font-size:.72rem;color:var(--text3);margin-top:10px">
      Saldo base: <strong style="color:var(--text2)">${fmt(saldoActual)}</strong> ·
      Sin aportaciones a 5 años: <strong>${fmt(soloInteres5)}</strong> ·
      TIR estimada Revolut Money Market ~1.38%
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   PANEL: DEUDAS — CRUD DINÁMICO
══════════════════════════════════════════════════════ */
function fin_getDeudas() {
  if (localStorage.getItem('fin_deudas') !== null) return Store.get('fin_deudas', []);
  // Migrar iPhone de FIN_DATA en el primer acceso
  const deudas = [];
  (FIN_DATA.deudas || []).forEach(d => {
    const extra = parseInt(Store.get('fin_cuotas_extra', '0'));
    deudas.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      nombre: d.nombre,
      cantidad_total: Math.round(d.cuotas_total * d.importe_cuota * 100) / 100,
      cuotas_pagadas: d.cuotas_pagadas + extra,
      cuotas_total: d.cuotas_total,
      tae: 0,
      cuenta: d.cuenta || 'KTX',
      nota: d.nota || '',
    });
  });
  Store.set('fin_deudas', deudas);
  return deudas;
}

function fin_calcCuota(cantidad, cuotas, tae) {
  if (!tae || tae <= 0) return cantidad / cuotas;
  const r = Math.pow(1 + tae / 100, 1 / 12) - 1;
  return (cantidad * r) / (1 - Math.pow(1 + r, -cuotas));
}

function finDeudaBorrar(id) {
  if (!confirm('¿Eliminar esta deuda?')) return;
  Store.set('fin_deudas', fin_getDeudas().filter(d => d.id !== id));
  renderFinDeudas();
  renderFinStats();
}

function finDeudaMarcarCuota(id, delta) {
  const deudas = fin_getDeudas();
  const d = deudas.find(x => x.id === id);
  if (!d) return;
  d.cuotas_pagadas = Math.max(0, Math.min(d.cuotas_total, d.cuotas_pagadas + delta));
  Store.set('fin_deudas', deudas);
  renderFinDeudas();
  renderFinStats();
}

function finDeudaAnadir() {
  const nombre = document.getElementById('fin-deuda-nombre')?.value?.trim();
  const cantidad = parseFloat(document.getElementById('fin-deuda-cantidad')?.value);
  const cuotas = parseInt(document.getElementById('fin-deuda-cuotas')?.value);
  const tae = parseFloat(document.getElementById('fin-deuda-tae')?.value) || 0;
  const cuenta = document.getElementById('fin-deuda-cuenta')?.value || 'KTX';
  const nota = document.getElementById('fin-deuda-nota')?.value?.trim() || '';
  if (!nombre || isNaN(cantidad) || isNaN(cuotas) || cuotas < 1) {
    alert('Rellena nombre, cantidad y plazo (meses).'); return;
  }
  const deudas = fin_getDeudas();
  deudas.push({ id: Date.now(), nombre, cantidad_total: cantidad, cuotas_pagadas: 0, cuotas_total: cuotas, tae, cuenta, nota });
  Store.set('fin_deudas', deudas);
  renderFinDeudas();
  renderFinStats();
}

function renderFinDeudas() {
  const el = document.getElementById('fin-deudas-content');
  if (!el) return;
  const deudas = fin_getDeudas();
  const totalPendiente = deudas.reduce((a, d) => {
    const cuota = fin_calcCuota(d.cantidad_total, d.cuotas_total, d.tae);
    return a + Math.max(0, d.cuotas_total - d.cuotas_pagadas) * cuota;
  }, 0);

  el.innerHTML = `
  ${deudas.length === 0 ? '<div class="card" style="text-align:center;color:var(--text3);padding:32px">Sin deudas registradas 🎉</div>' :
    deudas.map(d => {
      const cuota = fin_calcCuota(d.cantidad_total, d.cuotas_total, d.tae);
      const restantes = Math.max(0, d.cuotas_total - d.cuotas_pagadas);
      const pendiente = restantes * cuota;
      const pagado = d.cuotas_pagadas * cuota;
      const pct = d.cuotas_total > 0 ? (d.cuotas_pagadas / d.cuotas_total) * 100 : 0;
      return `
      <div class="card" style="margin-bottom:12px">
        <div class="fin-sf-header">
          <div style="flex:1">
            <div class="fin-sf-nombre">${d.nombre}</div>
            <div class="fin-sf-meta">
              ${fmt(cuota)}/mes · ${d.cuotas_total} cuotas
              ${d.tae > 0 ? ` · TAE ${d.tae}%` : ' · Sin interés'}
              ${d.cuenta ? ` · <span style="color:var(--accent2)">${d.cuenta}</span>` : ''}
            </div>
            ${d.nota ? `<div style="font-size:.72rem;color:var(--text3);margin-top:3px">${d.nota}</div>` : ''}
          </div>
          <div style="text-align:right;flex-shrink:0">
            <div style="font-size:1.4rem;font-weight:800;color:var(--red)">${fmt(pendiente)}</div>
            <div style="font-size:.73rem;color:var(--text3)">pendiente</div>
          </div>
        </div>
        <div style="margin:12px 0">
          <div class="progress-bar"><div class="progress-fill" style="width:${pct.toFixed(1)}%;background:var(--green)"></div></div>
        </div>
        <div class="fin-sf-footer">
          <span>Pagado: <strong>${fmt(pagado)}</strong> (${d.cuotas_pagadas}/${d.cuotas_total} cuotas)</span>
          <span style="display:flex;gap:6px;align-items:center">
            <button onclick="finDeudaMarcarCuota(${d.id}, -1)" title="Desmarcar cuota" style="background:var(--bg3);border:1px solid var(--border);border-radius:5px;padding:2px 7px;cursor:pointer;color:var(--text2);font-size:.85rem">−</button>
            <button onclick="finDeudaMarcarCuota(${d.id}, 1)" title="Marcar cuota pagada" style="background:var(--green);border:none;border-radius:5px;padding:2px 7px;cursor:pointer;color:#fff;font-size:.85rem">✓ cuota</button>
            <button onclick="finDeudaBorrar(${d.id})" title="Eliminar" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:.85rem">🗑</button>
          </span>
        </div>
      </div>`;
    }).join('')}

  ${deudas.length > 0 ? `<div style="font-size:.78rem;color:var(--text3);margin-bottom:16px;text-align:right">Total pendiente: <strong style="color:var(--red);font-size:1rem">${fmt(totalPendiente)}</strong></div>` : ''}

  <!-- Añadir nueva deuda -->
  <div class="card" style="border:1px dashed var(--border2)">
    <h3 style="margin-bottom:12px">➕ Añadir deuda</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;margin-bottom:10px">
      <div class="form-group" style="margin:0"><label style="font-size:.73rem">Nombre</label><input id="fin-deuda-nombre" class="upd-input" placeholder="iPhone Cetelem…" /></div>
      <div class="form-group" style="margin:0"><label style="font-size:.73rem">Cantidad total (€)</label><input id="fin-deuda-cantidad" type="number" class="upd-input" step="0.01" placeholder="1200.00" /></div>
      <div class="form-group" style="margin:0"><label style="font-size:.73rem">Plazo (meses)</label><input id="fin-deuda-cuotas" type="number" class="upd-input" min="1" placeholder="24" /></div>
      <div class="form-group" style="margin:0"><label style="font-size:.73rem">TAE % (0 = sin interés)</label><input id="fin-deuda-tae" type="number" class="upd-input" step="0.01" placeholder="0" value="0" /></div>
      <div class="form-group" style="margin:0"><label style="font-size:.73rem">Cuenta</label>
        <select id="fin-deuda-cuenta" class="upd-input">
          <option value="KTX">Kutxabank</option><option value="RVP">Revolut Personal</option><option value="RVC">Revolut Conjunta</option>
        </select>
      </div>
      <div class="form-group" style="margin:0"><label style="font-size:.73rem">Nota (opcional)</label><input id="fin-deuda-nota" class="upd-input" placeholder="Nota…" /></div>
    </div>
    <button class="upd-btn" onclick="finDeudaAnadir()">💾 Guardar deuda</button>
    <div id="fin-deuda-cuota-preview" style="font-size:.78rem;color:var(--text3);margin-top:8px"></div>
  </div>`;

  // Live preview cuota al escribir
  ['fin-deuda-cantidad','fin-deuda-cuotas','fin-deuda-tae'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const c = parseFloat(document.getElementById('fin-deuda-cantidad')?.value);
      const n = parseInt(document.getElementById('fin-deuda-cuotas')?.value);
      const t = parseFloat(document.getElementById('fin-deuda-tae')?.value) || 0;
      const prev = document.getElementById('fin-deuda-cuota-preview');
      if (prev && !isNaN(c) && !isNaN(n) && n > 0) {
        prev.textContent = `Cuota estimada: ${fmt(fin_calcCuota(c, n, t))}/mes`;
      }
    });
  });
}

/* ══════════════════════════════════════════════════════
   PANEL: PRESUPUESTO
══════════════════════════════════════════════════════ */
function renderFinPresupuesto() { renderFinPresupuestoYGastos(); }
function renderFinGastosFijos() { renderFinPresupuestoYGastos(); }

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
          <div class="fin-budget-row fin-budget-total"><span>Subtotal</span><strong>${fmt(totalFijo)}</strong></div>
        </div>
      </div>

      <!-- Columna derecha: Gastos fijos detallados con saldo restante -->
      <div class="card">
        <h3 style="margin-bottom:12px">Gastos fijos con día de cobro</h3>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text3);margin-bottom:10px">
          <span>Personal · ${fmt(totalFijo)}/mes</span>
          <span>Nómina: <strong style="color:var(--green)">${fmt(sueldo)}</strong></span>
        </div>
        ${(() => {
          let restante = sueldo;
          return personal.map(g => {
            restante -= g.importe;
            const ct = ctaColor[g.cuenta] || 'var(--text2)';
            const mesRest = g.hasta ? calcMesesRestantes(g.hasta) : null;
            return `<div style="display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border2)">
              <div>
                <span style="font-size:.8rem;font-weight:600">${g.nombre}</span>
                ${g.dia ? `<span style="font-size:.65rem;color:var(--text3);margin-left:5px">día ${g.dia}</span>` : ''}
                ${g.hasta ? `<span style="font-size:.65rem;color:var(--orange);margin-left:4px">hasta ${g.hasta}</span>` : ''}
                <br><span style="font-size:.68rem;color:${ct}">● ${g.cuenta}</span>
              </div>
              <span style="font-size:.8rem;font-weight:700;color:var(--red)">-${fmt(g.importe)}</span>
              <span style="font-size:.82rem;font-weight:700;color:${restante>=0?'var(--green)':'var(--red)'};min-width:70px;text-align:right">${fmt(restante)}</span>
            </div>`;
          }).join('');
        })()}
        <div style="margin-top:14px;padding:12px;background:var(--bg3);border-radius:8px;display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center">
          <span style="font-size:.78rem;color:var(--text2)">Nómina</span>
          <span style="font-size:.82rem;font-weight:700;color:var(--green);text-align:right">${fmt(sueldo)}</span>
          <span style="font-size:.78rem;color:var(--text2)">Gastos fijos</span>
          <span style="font-size:.82rem;font-weight:700;color:var(--red);text-align:right">-${fmt(totalFijo)}</span>
          <div style="grid-column:1/-1;border-top:1px solid var(--border2);margin:4px 0"></div>
          <span style="font-size:.85rem;font-weight:700;color:var(--text1)">Disponible</span>
          <span style="font-size:.95rem;font-weight:800;color:${(sueldo-totalFijo)>=0?'var(--green)':'var(--red)'};text-align:right">${fmt(sueldo - totalFijo)}</span>
        </div>
      </div>
    </div>`;
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
  // Auto-snapshot para gráfica de evolución
  fin_patrGuardarSnapshot(data);
  renderFinStats();
  renderFinSinking();
  fin_patrRenderChart();
}

function resetSaldos() {
  if (!confirm('¿Restaurar los saldos originales de los PDFs?')) return;
  localStorage.removeItem('fin_saldos');
  renderFinStats();
  renderFinSinking();
}

function marcarCuotaIphone(delta) {
  const actual = parseInt(Store.get('fin_cuotas_extra', '0'));
  const nuevo = Math.max(0, actual + delta);
  Store.set('fin_cuotas_extra', String(nuevo));
  renderFinDeudas();
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
  saldos.fm_ts = Date.now();
  saldos._ts = Date.now();
  Store.set('fin_saldos', saldos);
  document.getElementById('fin-fmd-saldo').value = '';
  document.getElementById('fin-fmd-nota').value  = '';
  mostrarOk('fin-fmd-ok');
  renderFinSinking();
  renderFinStats();
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
  const anoActual = new Date().getFullYear();

  // Meta desde config de piso
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
  const colorSim = ['#34d399', 'var(--accent)'];
  const precio = pisoCfg.precio_ref || 180000;
  const ahorroITP = precio * 0.025;

  // Aportaciones del año
  const ctvAports = Store.get('ctv_aportaciones', []);
  const LIMITE_ANUAL = 8500;
  const aportadoAnio = ctvAports.filter(a => a.anio === anoActual).reduce((s, a) => s + (parseFloat(a.importe) || 0), 0);
  const pctAnual = Math.min(100, (aportadoAnio / LIMITE_ANUAL) * 100);
  const libreAnio = Math.max(0, LIMITE_ANUAL - aportadoAnio);
  const devolucionEstimada = Math.min(aportadoAnio, LIMITE_ANUAL) * 0.23;

  // Año estimado de compra (escenario 23%)
  const sim23 = sims[0];
  const filaMeta = sim23?.rows.find(r => r.alcanzado);
  const anioCompra = filaMeta ? anoActual + filaMeta.anio - 1 : null;
  const totalBeneficios = (sim23?.totalIntereses || 0) + (sim23?.bonusFinal || 0) + ahorroITP + (sim23?.rows.reduce((a, r) => a + r.haciendaRecibida, 0) || 0);

  // Meses restantes del año fiscal y ahorro mensual necesario para cubrir el límite anual
  const finAnio = new Date(anoActual, 11, 31);
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const diasRestAnio = Math.ceil((finAnio - hoy) / 86400000);
  const mesesRestAnio = Math.max(1, parseFloat((diasRestAnio / 30.44).toFixed(1)));
  const mesesRestAnioInt = Math.max(1, Math.round(mesesRestAnio));
  const necesarioPorMes = libreAnio > 0 ? Math.ceil(libreAnio / mesesRestAnioInt) : 0;

  el.innerHTML = `
    <!-- KPIs principales -->
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:18px">
      <div style="background:linear-gradient(135deg,rgba(52,211,153,.12),rgba(52,211,153,.04));border:1px solid rgba(52,211,153,.35);border-radius:10px;padding:12px 14px">
        <div style="font-size:.63rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Saldo actual</div>
        <div style="font-size:1.45rem;font-weight:900;color:#34d399;line-height:1">${fmt(ctv)}</div>
        <div style="font-size:.65rem;color:var(--text3);margin-top:4px">${(ctv/metaTotal*100).toFixed(1)}% de la meta</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div style="font-size:.63rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Meta entrada piso</div>
        <div style="font-size:1.45rem;font-weight:900;color:var(--accent2);line-height:1">${fmt(metaTotal)}</div>
        <div style="font-size:.65rem;color:var(--red);margin-top:4px">Falta ${fmt(falta)}</div>
      </div>
      <div style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:12px 14px">
        <div style="font-size:.63rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Año estimado compra</div>
        <div style="font-size:1.45rem;font-weight:900;color:var(--accent);line-height:1">${anioCompra ? anioCompra : '—'}</div>
        <div style="font-size:.65rem;color:var(--text3);margin-top:4px">${filaMeta ? `en ${filaMeta.anio} ${filaMeta.anio===1?'año':'años'} (esc. 23%)` : '—'}</div>
      </div>
      <div style="background:linear-gradient(135deg,rgba(52,211,153,.08),rgba(99,102,241,.05));border:1px solid rgba(52,211,153,.25);border-radius:10px;padding:12px 14px">
        <div style="font-size:.63rem;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Total beneficios fiscales</div>
        <div style="font-size:1.45rem;font-weight:900;color:#34d399;line-height:1">${fmt(totalBeneficios)}</div>
        <div style="font-size:.65rem;color:var(--text3);margin-top:4px">Hacienda + intereses + bonus + ITP</div>
      </div>
    </div>

    <!-- Aportaciones del año -->
    <div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div style="font-weight:700;font-size:.87rem;color:var(--accent2)">📥 Aportaciones CTV — ${anoActual}</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span style="font-size:.75rem;color:#34d399;font-weight:700">${fmt(aportadoAnio)} aportado</span>
          <span style="font-size:.72rem;color:var(--text3)">· libre: ${fmt(libreAnio)}</span>
          ${diasRestAnio < 60
            ? `<span style="font-size:.7rem;background:#ff000018;color:var(--red);padding:2px 8px;border-radius:6px;font-weight:600">⚡ ${mesesRestAnioInt} mes${mesesRestAnioInt!==1?'es':''} para cierre IRPF · ${fmt(necesarioPorMes)}/mes</span>`
            : `<span style="font-size:.7rem;color:var(--text3)">${mesesRestAnioInt} mes${mesesRestAnioInt!==1?'es':''} para cierre fiscal${necesarioPorMes>0?' · '+fmt(necesarioPorMes)+'/mes':''}</span>`}
        </div>
      </div>
      <!-- Barra anual -->
      <div style="margin-bottom:10px">
        <div style="height:10px;background:var(--border);border-radius:5px;overflow:hidden;position:relative">
          <div style="height:100%;background:linear-gradient(90deg,#34d399,#10b981);border-radius:5px;width:${pctAnual.toFixed(1)}%;transition:width .5s"></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.65rem;color:var(--text3);margin-top:4px">
          <span>${pctAnual.toFixed(0)}% del límite anual</span>
          <span>Límite: ${fmt(LIMITE_ANUAL)}/año</span>
        </div>
      </div>
      ${devolucionEstimada > 0 ? `<div style="background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);border-radius:8px;padding:8px 12px;font-size:.78rem;color:#34d399;margin-bottom:12px">
        🏦 Devolución IRPF estimada este año: <strong>+${fmt(devolucionEstimada)}</strong> (23% × ${fmt(aportadoAnio)})
      </div>` : ''}
      <!-- Registro de aportaciones -->
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
        <input id="ctv-apt-importe" type="number" placeholder="Importe €" min="0" step="0.01"
          style="width:120px;background:var(--bg4);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 10px;font-family:inherit;font-size:.82rem;outline:none" />
        <input id="ctv-apt-nota" type="text" placeholder="Nota (opcional)"
          style="flex:1;min-width:120px;background:var(--bg4);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:7px 10px;font-family:inherit;font-size:.82rem;outline:none" />
        <button onclick="ctv_addAportacion()" class="btn-primary" style="padding:7px 14px;font-size:.82rem">+ Añadir</button>
      </div>
      <div id="ctv-apt-lista" style="display:flex;flex-direction:column;gap:5px">
        ${ctv_renderAportaciones(ctvAports, anoActual)}
      </div>
    </div>

    <!-- Beneficios fiscales resumen -->
    <div style="background:linear-gradient(135deg,rgba(52,211,153,.08),rgba(99,102,241,.05));border:1px solid rgba(52,211,153,.3);border-radius:12px;padding:14px 16px;margin-bottom:18px">
      <div style="font-size:.82rem;font-weight:700;color:#34d399;margin-bottom:10px">🎁 Beneficios fiscales — Menores de 36 en País Vasco</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:.63rem;color:var(--text3)">Deducción IRPF anual</div>
          <div style="font-weight:700;color:#34d399;font-size:1.05rem">+${fmt(LIMITE_ANUAL * 0.23)}/año</div>
          <div style="font-size:.63rem;color:var(--text3)">23% sobre 8.500 € aportados</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:.63rem;color:var(--text3)">ITP reducido (2,5% vs 5%)</div>
          <div style="font-weight:700;color:#34d399;font-size:1.05rem">-${fmt(ahorroITP)}</div>
          <div style="font-size:.63rem;color:var(--text3)">sobre precio ref. ${fmt(precio)}</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:.63rem;color:var(--text3)">Bonus Kutxabank hipoteca</div>
          <div style="font-weight:700;color:var(--accent);font-size:1.05rem">hasta 1.000 €</div>
          <div style="font-size:.63rem;color:var(--text3)">40% intereses acumulados en CTV</div>
        </div>
        <div style="background:var(--bg3);border-radius:8px;padding:10px 12px">
          <div style="font-size:.63rem;color:var(--text3)">Interés CTV (60% Euríbor 1a)</div>
          <div style="font-weight:700;color:var(--accent2);font-size:1.05rem">~1,33% TIN</div>
          <div style="font-size:.63rem;color:var(--text3)">500€ al 0,01% + resto variable</div>
        </div>
      </div>
    </div>

    <!-- Condiciones reales -->
    <div style="background:var(--bg3);border-radius:10px;padding:10px 14px;border:1px solid var(--border);margin-bottom:18px;font-size:.76rem;color:var(--text2);line-height:1.6">
      <strong style="color:var(--accent2)">Cuenta Vivienda Kutxabank · condiciones:</strong>
      Aportación óptima <strong>8.500 €/año</strong> (base máxima desgravable en Euskadi) ·
      Primeros 500 € al 0,01% TIN · Resto al ~1,33% TIN (60% Euríbor 1a de 2,223%) ·
      Sin comisiones · La devolución de Hacienda se reinvierte el año siguiente ·
      <strong>Bonus Kutxabank al contratar hipoteca: 40% de intereses acumulados (máx 1.000 €)</strong>
    </div>

    <!-- Proyecciones con gráfico visual -->
    <div style="font-weight:700;font-size:.9rem;color:var(--text1);margin-bottom:12px">📈 Simulación de crecimiento año a año</div>
    <div style="display:flex;flex-direction:column;gap:14px">
      ${sims.map((sim, si) => {
        const c = colorSim[si];
        const lastRow = sim.rows[sim.rows.length - 1];
        const aniosSim = lastRow.alcanzado ? lastRow.anio : '—';
        const devAnual = fmt(LIMITE_ANUAL * sim.deduccion);
        const totalHacienda = sim.rows.reduce((a,r) => a + r.haciendaRecibida, 0);
        const maxSaldo = Math.max(...sim.rows.map(r => r.saldo), metaTotal);
        const CHART_H = 110;
        return `
        <div class="card" style="border-top:3px solid ${c};padding:20px">
          <!-- Cabecera -->
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px">
            <div>
              <div style="font-weight:800;color:${c};font-size:1rem">${sim.label}</div>
              <div style="font-size:.75rem;color:var(--text3);margin-top:2px">Deducción ${(sim.deduccion*100).toFixed(0)}% · Hacienda devuelve <strong style="color:#34d399">${devAnual}/año</strong></div>
            </div>
            <div style="text-align:right;background:${c}18;border:1px solid ${c}44;border-radius:10px;padding:8px 16px">
              <div style="font-size:2.4rem;font-weight:900;color:${c};line-height:1">${aniosSim}</div>
              <div style="font-size:.68rem;color:var(--text3);margin-top:2px">${typeof aniosSim==='number'?'años para la meta':''}</div>
            </div>
          </div>
          <!-- Stats 4 columnas -->
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin-bottom:20px">
            <div style="background:var(--bg4);border-radius:10px;padding:10px 14px">
              <div style="font-size:.65rem;color:var(--text3);margin-bottom:4px">Saldo inicial</div>
              <div style="font-weight:700;color:var(--text1);font-size:.95rem">${fmt(ctv)}</div>
            </div>
            <div style="background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:10px;padding:10px 14px">
              <div style="font-size:.65rem;color:var(--text3);margin-bottom:4px">Intereses CTV</div>
              <div style="font-weight:700;color:#34d399;font-size:.95rem">${fmt(sim.totalIntereses)}</div>
            </div>
            <div style="background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:10px;padding:10px 14px">
              <div style="font-size:.65rem;color:var(--text3);margin-bottom:4px">Hacienda total</div>
              <div style="font-weight:700;color:#34d399;font-size:.95rem">+${fmt(totalHacienda)}</div>
            </div>
            <div style="background:${c}12;border:1px solid ${c}33;border-radius:10px;padding:10px 14px">
              <div style="font-size:.65rem;color:var(--text3);margin-bottom:4px">Bonus Kutxabank</div>
              <div style="font-weight:700;color:${c};font-size:.95rem">${fmt(sim.bonusFinal)}</div>
            </div>
          </div>
          <!-- Gráfico de barras mejorado -->
          <div style="margin-bottom:8px">
            <div style="position:relative;padding-top:24px">
              <!-- Línea de meta -->
              <div style="position:absolute;top:0;left:0;right:0;border-top:1px dashed ${c}88;display:flex;align-items:center;padding-left:4px">
                <span style="font-size:.6rem;color:${c};background:var(--surface);padding:0 4px;white-space:nowrap">Meta ${fmt(metaTotal)}</span>
              </div>
              <!-- Barras -->
              <div style="display:flex;align-items:flex-end;gap:4px;height:${CHART_H}px">
                ${sim.rows.map(r => {
                  const h = Math.max(6, Math.round((r.saldo / maxSaldo) * CHART_H));
                  const superado = r.saldo >= metaTotal;
                  const bg = superado
                    ? `linear-gradient(180deg,${c},${c}bb)`
                    : `linear-gradient(180deg,${c}77,${c}44)`;
                  return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:0;cursor:default" title="${fmt(r.saldo)}">
                    <div style="font-size:.58rem;color:${superado?c:'var(--text3)'};font-weight:${superado?700:400};margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center">
                      ${r.saldo >= 1000 ? (r.saldo/1000).toFixed(1)+'k' : fmt(r.saldo)}
                    </div>
                    <div style="width:100%;height:${h}px;background:${bg};border-radius:4px 4px 0 0;position:relative;transition:height .4s">
                      ${superado ? `<div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);font-size:10px">✅</div>` : ''}
                    </div>
                    <div style="font-size:.62rem;color:var(--text3);margin-top:4px;font-weight:${superado?700:400};color:${superado?c:'var(--text3)'}">${r.anio}</div>
                  </div>`;
                }).join('')}
              </div>
            </div>
            <div style="font-size:.65rem;color:var(--text3);margin-top:6px;text-align:center">
              Cada barra = saldo CTV a fin de año · ✅ = meta alcanzada · ${sim.rows.length} años simulados
            </div>
          </div>
          <!-- Tabla detallada colapsable -->
          <details style="font-size:.75rem;margin-top:8px">
            <summary style="cursor:pointer;color:var(--text3);font-size:.75rem;margin-bottom:6px;list-style:none;display:flex;align-items:center;gap:6px;padding:6px 0;border-top:1px solid var(--border2)">
              <span style="color:${c}">▸</span> Ver tabla año a año
            </summary>
            <div style="overflow-x:auto;margin-top:8px">
              <table style="width:100%;border-collapse:collapse;font-size:.72rem">
                <thead>
                  <tr style="background:var(--bg3)">
                    <th style="padding:4px 6px;text-align:center;color:var(--text3)">Año</th>
                    <th style="padding:4px 6px;text-align:right;color:var(--text3)">Aportas</th>
                    <th style="padding:4px 6px;text-align:right;color:#34d399">+Hacienda</th>
                    <th style="padding:4px 6px;text-align:right;color:var(--accent2)">Interés</th>
                    <th style="padding:4px 6px;text-align:right;font-weight:700">Saldo CTV</th>
                  </tr>
                </thead>
                <tbody>
                  ${sim.rows.map(r => `
                  <tr style="border-bottom:1px solid var(--border2);${r.alcanzado?'background:'+c+'15;':''}">
                    <td style="padding:4px 6px;text-align:center;color:var(--text3)">${r.anio}</td>
                    <td style="padding:4px 6px;text-align:right">${fmt(LIMITE_ANUAL)}</td>
                    <td style="padding:4px 6px;text-align:right;color:#34d399">${r.haciendaRecibida>0?'+'+fmt(r.haciendaRecibida):'—'}</td>
                    <td style="padding:4px 6px;text-align:right;color:var(--accent2)">+${fmt(r.interes)}</td>
                    <td style="padding:4px 6px;text-align:right;font-weight:${r.alcanzado?700:400};color:${r.alcanzado?c:'var(--text)'}">
                      ${fmt(r.saldo)}${r.alcanzado?' ✓':''}
                    </td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>
          </details>
        </div>`;
      }).join('')}
    </div>`;
}

function ctv_renderAportaciones(lista, anio) {
  const deAnio = lista.filter(a => a.anio === anio).sort((a, b) => b.ts - a.ts);
  if (!deAnio.length) return `<div style="font-size:.78rem;color:var(--text3);padding:6px 0">Sin aportaciones registradas este año. Añade la primera arriba.</div>`;
  return deAnio.map((a, i) => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:var(--bg4);border-radius:8px;font-size:.8rem">
      <span style="color:var(--text3);font-size:.7rem;min-width:70px">${a.fecha || '—'}</span>
      <span style="font-weight:700;color:#34d399;min-width:80px;text-align:right">${fmt(parseFloat(a.importe))}</span>
      <span style="flex:1;color:var(--text2);padding:0 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.nota || '—'}</span>
      <button onclick="ctv_delAportacion(${a.ts})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.8rem;padding:2px 5px;line-height:1" title="Eliminar">✕</button>
    </div>`).join('');
}

function ctv_addAportacion() {
  const importe = parseFloat(document.getElementById('ctv-apt-importe')?.value || 0);
  const nota    = document.getElementById('ctv-apt-nota')?.value.trim() || '';
  if (!importe || importe <= 0) return;
  const anio = new Date().getFullYear();
  const fecha = new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
  const ts = Date.now();
  const lista = Store.get('ctv_aportaciones', []);
  lista.push({ importe, nota, anio, fecha, ts });
  Store.set('ctv_aportaciones', lista);
  document.getElementById('ctv-apt-importe').value = '';
  document.getElementById('ctv-apt-nota').value = '';
  renderFinStats();
  renderFinCTVSimulador();
}

function ctv_delAportacion(ts) {
  const lista = Store.get('ctv_aportaciones', []).filter(a => a.ts !== ts);
  Store.set('ctv_aportaciones', lista);
  renderFinStats();
  renderFinCTVSimulador();
}

/* ════════════════════════════════════════════════════════
   GRÁFICA EVOLUCIÓN PATRIMONIO
   Clave localStorage: cdc_patrimonio_hist
   Formato: [{ fecha, mes, total, ktx, rvp, rvc, ctv, bp, fm }]
════════════════════════════════════════════════════════ */

let _patrRango = 6; // meses a mostrar (0 = todo)
let _patrChart = null;

// Devuelve el historial ordenado cronológicamente
function fin_patrGetHist() {
  return Store.get('cdc_patrimonio_hist', []).sort((a, b) => a.fecha.localeCompare(b.fecha));
}

// Guarda snapshot del mes actual (1 por mes — reemplaza si ya existe)
function fin_patrGuardarSnapshot(saldos) {
  const ahora = new Date();
  const mes = ahora.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
  const fecha = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}`;
  const total = (saldos.ktx||0) + (saldos.rvp||0) + (saldos.rvc||0) + (saldos.ctv||0) + (saldos.bp||0) + (saldos.fm||0);
  const hist = Store.get('cdc_patrimonio_hist', []);
  const idx = hist.findIndex(h => h.fecha === fecha);
  const snap = { fecha, mes, total, ktx: saldos.ktx||0, rvp: saldos.rvp||0, rvc: saldos.rvc||0, ctv: saldos.ctv||0, bp: saldos.bp||0, fm: saldos.fm||0 };
  if (idx >= 0) hist[idx] = snap; else hist.push(snap);
  Store.set('cdc_patrimonio_hist', hist);
}

// Cambia el rango y re-renderiza
function fin_patrSetRango(n) {
  _patrRango = n;
  document.querySelectorAll('.fin-patr-btn').forEach(b => {
    const esActivo = b.id === `fin-patr-btn-${n}`;
    b.style.background = esActivo ? 'var(--bg3)' : 'var(--bg4)';
    b.style.color = esActivo ? 'var(--text2)' : 'var(--text3)';
    b.classList.toggle('active', esActivo);
  });
  fin_patrRenderChart();
}

// Renderiza la gráfica de línea con Chart.js
function fin_patrRenderChart() {
  const ctx = document.getElementById('fin-patrimonio-chart');
  const empty = document.getElementById('fin-patr-empty');
  const varEl = document.getElementById('fin-patr-variacion');
  if (!ctx) return;

  let hist = fin_patrGetHist();

  // Filtrar por rango
  if (_patrRango > 0 && hist.length > _patrRango) {
    hist = hist.slice(-_patrRango);
  }

  const card = document.getElementById('fin-patrimonio-chart-card');
  if (hist.length < 2) {
    if (card) card.style.display = 'none';
    if (_patrChart) { _patrChart.destroy(); _patrChart = null; }
    return;
  }
  if (card) card.style.display = 'block';

  ctx.style.display = 'block';
  if (empty) empty.style.display = 'none';

  // Variación vs primer punto del rango
  const primero = hist[0].total;
  const ultimo  = hist[hist.length-1].total;
  const delta   = ultimo - primero;
  const pct     = primero ? ((delta / primero) * 100).toFixed(1) : 0;
  if (varEl) {
    const signo = delta >= 0 ? '+' : '';
    varEl.textContent = `${signo}${Fmt.eur2(delta)} (${signo}${pct}%)`;
    varEl.style.color = delta >= 0 ? 'var(--green)' : 'var(--red)';
  }

  const labels = hist.map(h => h.mes);
  const totales = hist.map(h => h.total);

  // Gradient fill
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, ctx.offsetHeight || 120);
  gradient.addColorStop(0, 'rgba(99,102,241,0.35)');
  gradient.addColorStop(1, 'rgba(99,102,241,0.02)');

  if (_patrChart) _patrChart.destroy();
  _patrChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Patrimonio total',
        data: totales,
        borderColor: '#6366f1',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointBackgroundColor: '#6366f1',
        pointRadius: hist.length <= 8 ? 4 : 2,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + Fmt.eur2(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9ca3af', font: { size: 11 } } },
        y: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9ca3af', font: { size: 11 }, callback: v => Fmt.eur2(v) }
        }
      }
    }
  });
}
