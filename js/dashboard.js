// ─── DASHBOARD ───

function loadDashboard() {
  _dashSaludo();
  _dashFecha();
  _dashQuote();
  _dashFinanzas();
  _dashCarnet();
  _dashOposiciones();
  _dashAgenda();
}

/* ── Saludo y fecha ── */
function _dashSaludo() {
  const h = new Date().getHours();
  const saludo = h >= 6 && h < 13 ? 'Buenos días ☀️'
               : h >= 13 && h < 21 ? 'Buenas tardes 🌤️'
               : h >= 21            ? 'Buenas noches 🌙'
               : '¿Qué haces despierto? 🦉'; // 0:00–5:59
  const el = document.getElementById('dash-saludo');
  if (el) el.textContent = saludo;
}

function _dashFecha() {
  const el = document.getElementById('dash-fecha-hoy');
  if (!el) return;
  el.textContent = new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
}

function _dashQuote() {
  const el = document.getElementById('dashQuote');
  if (!el || typeof QUOTES === 'undefined') return;
  el.textContent = `"${QUOTES[new Date().getDate() % QUOTES.length]}"`;
}

/* ── Finanzas ── */
function _dashFinanzas() {
  const el = document.getElementById('dash-fin-content');
  if (!el || typeof getSaldosActuales !== 'function' || typeof FIN_DATA === 'undefined') return;

  const s = getSaldosActuales();
  const patrimonio = s.ktx + s.rvp + s.rvc + s.ctv + s.bp;

  // Deuda iPhone restante
  const deuda = FIN_DATA.deudas?.[0];
  const extra  = parseInt(Store.get('fin_cuotas_extra', '0'));
  const cuotasRest = deuda ? Math.max(0, deuda.cuotas_total - deuda.cuotas_pagadas - extra) : 0;
  const deudaRest  = cuotasRest * (deuda?.importe_cuota || 0);
  const neto = patrimonio - deudaRest;


  // Gasto del mes actual desde transacciones manuales + historial
  const local = Store.get('fin_txns', []);
  const hoy = new Date();
  const mesStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
  const gastoMes = [...FIN_DATA.transacciones, ...local]
    .filter(t => t.f?.startsWith(mesStr) && t.i < 0 && t.c !== 'interna')
    .reduce((acc, t) => acc + Math.abs(t.i), 0);

  const cuentas = [
    { label:'Kutxabank',        val: s.ktx, color:'#60a5fa' },
    { label:'Revolut personal', val: s.rvp, color:'#a78bfa' },
    { label:'Revolut conjunta', val: s.rvc, color:'#f472b6' },
    { label:'CTV Vivienda',     val: s.ctv, color:'#34d399' },
    { label:'Baskepensiones',   val: s.bp,  color:'#fbbf24' },
    { label:'FM Revolut',       val: s.fm,  color:'var(--red)' },
  ];

  el.innerHTML = `
    <div class="dash-row" style="margin-bottom:4px">
      <span class="dash-row-label" style="font-weight:700">Patrimonio total</span>
      <span style="font-weight:800;color:var(--accent2);font-size:1.05rem">${Fmt.eur2(patrimonio)}</span>
    </div>
    <div class="dash-row" style="margin-bottom:10px">
      <span class="dash-row-label" style="color:var(--text3);font-size:.78rem">Patrimonio neto (sin deuda)</span>
      <span style="font-weight:700;color:${neto >= 0 ? 'var(--green)' : 'var(--red)'};font-size:.9rem">${Fmt.eur2(neto)}</span>
    </div>
    ${cuentas.map(c => `
    <div class="dash-row">
      <span class="dash-row-label"><span style="color:${c.color}">●</span> ${c.label}</span>
      <span class="dash-row-val">${Fmt.eur2(c.val)}</span>
    </div>`).join('')}
    <div class="dash-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="dash-row-label">Gasto ${new Date().toLocaleDateString('es-ES',{month:'long'})}</span>
      <span class="dash-row-val red">${gastoMes > 0 ? '-' + Fmt.eur2(gastoMes) : 'Sin datos aún'}</span>
    </div>
    ${deudaRest > 0 ? `
    <div class="dash-row">
      <span class="dash-row-label">Deuda iPhone (${cuotasRest} cuotas)</span>
      <span class="dash-row-val red">-${Fmt.eur2(deudaRest)}</span>
    </div>` : `
    <div class="dash-row">
      <span class="dash-row-label">Deuda iPhone</span>
      <span class="dash-row-val green">✅ Liquidada</span>
    </div>`}`;
}

/* ── Carnet ── */
function _dashCarnet() {
  const el = document.getElementById('dash-car-content');
  if (!el) return;

  const practicas = Store.get('car_practicas', []);
  const cfg       = Store.get('car_config');

  const estadoLabel = { pendiente:'⏳ Pendiente de fecha', en_proceso:'🔄 En proceso', convocado:'📅 Convocado' };
  const aprobado    = cfg.teorico_estado === 'aprobado';

  let proximaStr = '';
  let diasColor  = 'var(--accent2)';
  if (cfg.prox_fecha) {
    const d = new Date(cfg.prox_fecha); d.setHours(0,0,0,0);
    const h2 = new Date(); h2.setHours(0,0,0,0);
    const diff = Math.round((d - h2) / 86400000);
    const fechaStr = d.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' });
    const diffLabel = diff > 0 ? `en ${diff} día${diff!==1?'s':''}` : diff === 0 ? '¡HOY!' : 'pasada';
    proximaStr = `${fechaStr} (${diffLabel})`;
    if (diff >= 0 && diff <= 2) diasColor = 'var(--red)';
    else if (diff >= 0 && diff <= 6) diasColor = 'var(--orange)';
  } else if (cfg.prox_estado) {
    proximaStr = estadoLabel[cfg.prox_estado] || 'Pendiente de fecha';
  } else {
    proximaStr = 'Pendiente de fecha';
  }

  const totalMin = practicas.reduce((s,p) => s + (p.min || 0), 0);
  const horas = Math.floor(totalMin / 60), mins = totalMin % 60;
  const pracStr = practicas.length
    ? `${practicas.length} sesiones · ${horas}h${mins > 0 ? ` ${mins}min` : ''}`
    : 'Sin sesiones aún';

  el.innerHTML = `
    <div class="dash-row">
      <span class="dash-row-label">Examen teórico</span>
      <span class="dash-row-val ${aprobado ? 'green' : cfg.teorico_estado === 'suspendido' ? 'red' : ''}">${aprobado ? '✅ Aprobado' : cfg.teorico_estado === 'suspendido' ? '❌ Suspendido' : 'Pendiente'}</span>
    </div>
    <div class="dash-row">
      <span class="dash-row-label">Prácticas</span>
      <span class="dash-row-val">${pracStr}</span>
    </div>
    <div class="dash-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="dash-row-label" style="font-weight:600">Próximo examen práctico</span>
      <span class="dash-row-val" style="color:${diasColor};font-weight:700">${proximaStr}</span>
    </div>`;
}

/* ── Oposiciones ── */
function _dashOposiciones() {
  const el = document.getElementById('dash-opos-content');
  if (!el) return;

  const lista    = Store.get('opos_convocatorias', []);
  const sesiones = Store.get('opos_sesiones', []);
  const temas    = Store.get('opos_temas', []);

  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem">Sin convocatorias registradas.</p>';
    return;
  }

  const hoy     = new Date(); hoy.setHours(0,0,0,0);
  const activas = lista.filter(r => ['ABIERTA','EN PROCESO'].includes((r.estado || '').toUpperCase()));
  const conFecha = lista.filter(r => r.fecha_examen).sort((a,b) => new Date(a.fecha_examen) - new Date(b.fecha_examen));
  const proximas = conFecha.filter(r => new Date(r.fecha_examen) >= hoy);

  const pctMedio = temas.length ? Math.round(temas.reduce((s,t) => s + t.pct, 0) / temas.length) : null;
  const mesStr   = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}`;
  const sesMes   = sesiones.filter(s => {
    const parts = s.fecha?.split('/');
    return parts?.length >= 3 && parts[2] === String(hoy.getFullYear()) && parts[1] === String(hoy.getMonth()+1).padStart(2,'0');
  });

  let proximaHTML = '';
  if (proximas.length) {
    const prox = proximas[0];
    const diff = Math.round((new Date(prox.fecha_examen) - hoy) / 86400000);
    const diasColor = diff <= 2 ? 'var(--red)' : diff <= 6 ? 'var(--orange)' : 'var(--yellow)';
    const diasLabel = diff === 0 ? '¡HOY!' : diff === 1 ? 'mañana' : `${diff}d`;
    proximaHTML = `
      <div class="dash-row" style="margin-bottom:4px">
        <span class="dash-row-label" style="font-weight:700">Próximo examen</span>
        <span style="font-weight:700;color:var(--yellow);font-size:.88rem">${prox.convocatoria}</span>
      </div>
      <div class="dash-row" style="margin-bottom:10px">
        <span class="dash-row-label">Fecha</span>
        <span class="dash-row-val" style="color:${diasColor};font-weight:700">
          ${new Date(prox.fecha_examen + 'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}
          <span style="margin-left:4px;background:${diasColor}22;padding:1px 7px;border-radius:99px;font-size:.75rem">${diasLabel}</span>
        </span>
      </div>`;
  }

  // Inscripciones con plazo abierto (todas, pendientes y ya hechas)
  const inscAbiertas = lista.filter(r => {
    if (!r.fecha_fin_inscr) return false;
    if ((r.estado || '').toUpperCase() === 'EN SEGUIMIENTO') return false;
    const fin = new Date(r.fecha_fin_inscr + 'T23:59:59');
    return fin >= hoy;
  }).sort((a,b) => new Date(a.fecha_fin_inscr) - new Date(b.fecha_fin_inscr));

  const hayPendientes = inscAbiertas.some(r => r.doc_solicitud !== 'Listo');

  const pendHTML = inscAbiertas.length ? `
    <div style="margin-bottom:10px">
      <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${hayPendientes ? 'var(--red)' : 'var(--green)'};margin-bottom:6px">${hayPendientes ? '⚠️ Inscripciones abiertas' : '✅ Inscripciones abiertas'}</div>
      ${inscAbiertas.map(r => {
        const fin = new Date(r.fecha_fin_inscr + 'T12:00:00');
        const dias = Math.round((fin - hoy) / 86400000);
        const listo = r.doc_solicitud === 'Listo';
        const color = listo ? 'var(--green)' : dias <= 3 ? 'var(--red)' : dias <= 7 ? 'var(--orange)' : 'var(--yellow)';
        const diasLabel = dias === 0 ? '¡HOY!' : dias === 1 ? 'mañana' : `${dias}d`;
        const fechaStr = fin.toLocaleDateString('es-ES', {day:'2-digit', month:'short'});
        const { org, pto } = typeof _oposOrgPuesto === 'function' ? _oposOrgPuesto(r) : { org: r.organismo || '', pto: r.puesto || '' };
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
          <div>
            <div style="font-size:.79rem;color:var(--text1);font-weight:600">${org} <span style="color:var(--text3);font-weight:400">· ${pto}</span></div>
            <div style="font-size:.72rem;color:var(--text3)">hasta ${fechaStr}</div>
          </div>
          <span style="color:${color};font-weight:700;font-size:.8rem;white-space:nowrap;margin-left:8px">${listo ? '✅' : `⏳ ${diasLabel}`}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  el.innerHTML = `
    ${pendHTML}
    ${proximaHTML}
    <div class="dash-row">
      <span class="dash-row-label">Convocatorias activas</span>
      <span class="dash-row-val">${activas.length} de ${lista.length}</span>
    </div>
    ${pctMedio !== null ? `
    <div class="dash-row">
      <span class="dash-row-label">Progreso temas</span>
      <span class="dash-row-val">${pctMedio}% · ${temas.length} temas</span>
    </div>` : ''}
    ${sesiones.length ? `
    <div class="dash-row">
      <span class="dash-row-label">Sesiones de estudio</span>
      <span class="dash-row-val">${sesiones.length} totales${sesMes.length ? ` · ${sesMes.length} este mes` : ''}</span>
    </div>` : ''}`;
}

/* ── Agenda (sin Casa) ── */
function _dashAgenda() {
  const el = document.getElementById('dash-casa-content');
  if (!el) return;

  const age = Store.get('local_agenda');
  const hoy = new Date(); hoy.setHours(0,0,0,0);

  // Próximos cumpleaños
  const cumples = (age.cumples || '').split('\n').filter(l => l.trim()).map(l => {
    const m = l.match(/^(.+?)\s*[—\-]\s*(\d{1,2})\/(\d{1,2})$/);
    if (!m) return null;
    const nombre = m[1].trim();
    const dia = parseInt(m[2]), mes = parseInt(m[3]) - 1;
    let fecha = new Date(hoy.getFullYear(), mes, dia);
    if (fecha < hoy) fecha = new Date(hoy.getFullYear() + 1, mes, dia);
    const dias = Math.round((fecha - hoy) / 86400000);
    return { icono:'🎂', texto: nombre, fecha, dias };
  }).filter(Boolean).sort((a,b) => a.dias - b.dias);

  // Próximos eventos y vencimientos
  const parseLineas = (str, icono) => (str || '').split('\n').filter(l => l.trim()).map(l => {
    const m = l.match(/^(.+?)\s*[—\-]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const fecha = new Date(`${m[4]}-${m[3].padStart(2,'0')}-${m[2].padStart(2,'0')}`);
    fecha.setHours(0,0,0,0);
    if (fecha < hoy) return null;
    const dias = Math.round((fecha - hoy) / 86400000);
    return { icono, texto: m[1].trim(), fecha, dias };
  }).filter(Boolean);

  const items = [
    ...cumples.slice(0, 3),
    ...parseLineas(age.eventos,      '📆'),
    ...parseLineas(age.vencimientos, '⚠️'),
  ].sort((a,b) => a.dias - b.dias).slice(0, 6);

  if (!items.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem">Sin eventos próximos en la agenda.</p>';
    return;
  }

  const diasLabel = d => d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d}d`;
  const fmtFecha  = d => d.toLocaleDateString('es-ES', { day:'2-digit', month:'short' });

  el.innerHTML = items.map(it => {
    const esVenc = it.icono === '⚠️';
    const col = esVenc
      ? (it.dias <= 2 ? 'var(--red)' : it.dias <= 6 ? 'var(--orange)' : 'var(--text3)')
      : (it.dias <= 1 ? 'var(--accent2)' : it.dias <= 3 ? 'var(--blue)' : 'var(--text3)');
    return `<div class="dash-row">
      <span class="dash-row-label">${it.icono} ${it.texto}</span>
      <span class="dash-row-val" style="color:${col}">${fmtFecha(it.fecha)} · ${diasLabel(it.dias)}</span>
    </div>`;
  }).join('');
}
