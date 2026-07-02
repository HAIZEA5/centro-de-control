// ─── DASHBOARD ───

function loadDashboard() {
  _dashSaludo();
  _dashFecha();
  _dashQuote();
  _dashFinanzas();
  _dashPiso();
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
  const d = new Date();
  const dias   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const txt = `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  el.textContent = txt.charAt(0).toUpperCase() + txt.slice(1);
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

  // Alertas de categorías con límite superado/cerca
  const limites = typeof Store !== 'undefined' ? Store.get('fin_cat_limites', {}) : {};
  const hoy2    = new Date();
  const mesStr2 = `${hoy2.getFullYear()}-${String(hoy2.getMonth()+1).padStart(2,'0')}`;
  const alertasCat = Object.entries(limites).map(([cat, lim]) => {
    const gastado = [...(FIN_DATA?.transacciones || []), ...(typeof Store !== 'undefined' ? Store.get('fin_txns', []) : [])]
      .filter(t => t.f?.startsWith(mesStr2) && t.i < 0 && t.c === cat)
      .reduce((acc, t) => acc + Math.abs(t.i), 0);
    const pct = Math.min(100, gastado / lim * 100);
    return { cat, gastado, lim, pct };
  }).filter(a => a.pct >= 80).sort((a,b) => b.pct - a.pct);

  const alertasHTML = alertasCat.length ? `
    <div style="margin-bottom:10px;padding:8px 10px;border-radius:8px;background:var(--red)15;border:1px solid var(--red)44">
      <div style="font-size:.7rem;font-weight:700;color:var(--red);margin-bottom:5px">⚠️ LÍMITES DE GASTO</div>
      ${alertasCat.map(a => {
        const col = a.pct >= 100 ? 'var(--red)' : 'var(--orange)';
        return `<div class="dash-row" style="margin-bottom:2px">
          <span style="font-size:.75rem">${a.cat}</span>
          <span style="font-size:.75rem;font-weight:700;color:${col}">${Fmt.eur2(a.gastado)} / ${Fmt.eur2(a.lim)}</span>
        </div>`;
      }).join('')}
    </div>` : '';

  el.innerHTML = alertasHTML + `
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
    ${gastoMes > 0 ? `
    <div class="dash-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
      <span class="dash-row-label">Gasto ${new Date().toLocaleDateString('es-ES',{month:'long'})}</span>
      <span class="dash-row-val red">-${Fmt.eur2(gastoMes)}</span>
    </div>` : ''}
    ${deudaRest > 0 ? `
    <div class="dash-row">
      <span class="dash-row-label">Deuda iPhone (${cuotasRest} cuotas)</span>
      <span class="dash-row-val red">-${Fmt.eur2(deudaRest)}</span>
    </div>` : `
    <div class="dash-row">
      <span class="dash-row-label">Deuda iPhone</span>
      <span class="dash-row-val green">✅ Liquidada</span>
    </div>`}
    ${_dashPatrSparkline()}`;
}

function _dashPatrSparkline() {
  if (typeof fin_patrGetHist !== 'function') return '';
  const hist = fin_patrGetHist().slice(-8);
  if (hist.length < 2) return '';
  const vals = hist.map(h => h.total);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const W = 200, H = 40;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * W;
    const y = H - 4 - ((v - min) / range) * (H - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = vals[vals.length - 1];
  const prev = vals[vals.length - 2];
  const diff = last - prev;
  const color = diff >= 0 ? 'var(--green)' : 'var(--red)';
  const lastX = W;
  const lastY = H - 4 - ((last - min) / range) * (H - 8);
  return `
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:.7rem;color:var(--text3)">Evolución patrimonio</span>
        <span style="font-size:.72rem;font-weight:700;color:${color}">${diff >= 0 ? '↑' : '↓'} ${Fmt.eur2(Math.abs(diff))}</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:36px;display:block;overflow:visible">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>
        <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3.5" fill="${color}"/>
      </svg>
    </div>`;
}

/* ── Futuro Piso ── */
function _dashPiso() {
  const el = document.getElementById('dash-piso-content');
  if (!el || typeof getSaldosActuales !== 'function') return;

  const s    = getSaldosActuales();
  const ctv  = s.ctv || 0;
  const cfg  = Store.get('piso_config', {});
  const meta = parseFloat(cfg.meta) || 20000;
  const pct  = Math.min(100, (ctv / meta) * 100);
  const falta = Math.max(0, meta - ctv);

  let anioEst = null;
  if (typeof ctv_simularCrecimiento === 'function' && falta > 0) {
    try {
      const sims = ctv_simularCrecimiento(ctv, meta);
      if (sims.length) {
        const row = sims[0].rows.find(r => r.alcanzado);
        if (row) anioEst = new Date().getFullYear() + row.anio;
      }
    } catch(e) {}
  }

  const color = pct >= 100 ? 'var(--green)' : pct >= 60 ? 'var(--accent2)' : 'var(--accent)';

  // Últimas aportaciones al CTV (transacciones marcadas como CTV/vivienda)
  const txns = [...(FIN_DATA?.transacciones || []), ...Store.get('fin_txns', [])]
    .filter(t => t.c === 'interna' && t.i > 0 && (t.d || '').toLowerCase().includes('ctv'))
    .sort((a,b) => (b.f || '').localeCompare(a.f || ''))
    .slice(0, 2);

  el.innerHTML = `
    <div class="dash-row" style="margin-bottom:4px">
      <span class="dash-row-label" style="font-weight:700">CTV Vivienda</span>
      <span style="font-weight:800;color:${color};font-size:1.05rem">${Fmt.eur2(ctv)}</span>
    </div>
    <div class="dash-row" style="margin-bottom:8px">
      <span class="dash-row-label" style="color:var(--text3);font-size:.78rem">Meta: ${Fmt.eur2(meta)}${anioEst ? ` · ~${anioEst}` : ''}</span>
      <span style="color:var(--text3);font-size:.78rem">${pct.toFixed(1)}%</span>
    </div>
    <div style="background:var(--bg3);border-radius:99px;height:6px;overflow:hidden;margin-bottom:6px">
      <div style="width:${pct.toFixed(1)}%;height:100%;background:${color};border-radius:99px;transition:width .3s"></div>
    </div>
    <div style="font-size:.72rem;color:var(--text3);margin-bottom:${txns.length ? '10px' : '0'}">${pct >= 100 ? '¡Meta alcanzada! 🎉' : `Faltan ${Fmt.eur2(falta)}`}</div>
    ${txns.length ? `
    <div style="padding-top:8px;border-top:1px solid var(--border)">
      <div style="font-size:.68rem;color:var(--text3);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em">Últimas aportaciones</div>
      ${txns.map(t => `
      <div class="dash-row">
        <span class="dash-row-label" style="font-size:.75rem">${t.d || 'Aportación'}</span>
        <span style="color:var(--green);font-size:.78rem;font-weight:700">+${Fmt.eur2(t.i)}</span>
      </div>`).join('')}
    </div>` : ''}`;
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
    : '0 clases · 0 min';

  // Ahorro coche
  const cocheAports = typeof Store !== 'undefined' ? Store.get('cdc_ahorro_coche', []) : [];
  const cocheTotal  = cocheAports.reduce((s, a) => s + (parseFloat(a.importe) || 0), 0);
  const cocheMeta   = 3000;
  const cochePct    = Math.min(100, (cocheTotal / cocheMeta) * 100);
  const cocheFalta  = Math.max(0, cocheMeta - cocheTotal);
  const cocheColor  = cochePct >= 100 ? 'var(--green)' : cochePct >= 60 ? 'var(--accent2)' : 'var(--accent)';
  const cocheEur    = n => Number.isInteger(n) || n % 1 === 0
    ? n.toLocaleString('es-ES', { minimumFractionDigits:0, maximumFractionDigits:0 }) + ' €'
    : n.toLocaleString('es-ES', { minimumFractionDigits:2, maximumFractionDigits:2 }) + ' €';

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
    </div>
    <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
      <div class="dash-row" style="margin-bottom:6px">
        <span class="dash-row-label">🚗 Ahorro coche</span>
        <span class="dash-row-val" style="color:${cocheColor};font-weight:700">${cocheEur(cocheTotal)} <span style="color:var(--text3);font-weight:400;font-size:.75rem">/ ${cocheEur(cocheMeta)}</span></span>
      </div>
      <div style="background:var(--bg3);border-radius:99px;height:5px;overflow:hidden">
        <div style="width:${cochePct.toFixed(1)}%;height:100%;background:${cocheColor};border-radius:99px;transition:width .3s"></div>
      </div>
      <div style="font-size:.72rem;color:var(--text3);margin-top:4px">${cochePct >= 100 ? '¡Meta alcanzada! 🎉' : `Faltan ${cocheEur(cocheFalta)} · ${cochePct.toFixed(0)}%`}</div>
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
    const diasLabel = diff === 0 ? '¡HOY!' : diff === 1 ? 'mañana' : `en ${diff}d`;
    const fechaStr = new Date(prox.fecha_examen + 'T12:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'});
    const { org: proxOrg, pto: proxPto } = typeof _oposOrgPuesto === 'function' ? _oposOrgPuesto(prox) : { org: prox.convocatoria || '', pto: '' };
    proximaHTML = `
      <div style="padding:8px 10px;border-radius:8px;background:var(--yellow)10;border:1px solid var(--yellow)33;margin-bottom:10px">
        <div style="font-size:.67rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--yellow);margin-bottom:5px">📅 Próximo examen</div>
        <div style="font-size:.84rem;font-weight:700;color:var(--text)">${proxOrg || prox.convocatoria || '—'}</div>
        ${proxPto ? `<div style="font-size:.75rem;color:var(--text3);margin-top:1px">${proxPto}</div>` : ''}
        <div style="font-size:.8rem;font-weight:700;color:${diasColor};margin-top:5px">${fechaStr} · <span>${diasLabel}</span></div>
      </div>`;
  }

  // Inscripciones con plazo abierto (excluye ya marcadas como inscrita=si)
  const inscAbiertas = lista.filter(r => {
    if (!r.fecha_fin_inscr) return false;
    if ((r.estado || '').toUpperCase() === 'EN SEGUIMIENTO') return false;
    const iKey = 'opos_inscrita_' + (r.convocatoria || '').replace(/\s+/g, '_');
    if (localStorage.getItem(iKey) === 'si') return false;
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
        const diasLabel = dias === 0 ? '¡HOY!' : dias === 1 ? 'mañana' : `en ${dias}d`;
        const fechaStr = fin.toLocaleDateString('es-ES', {day:'2-digit', month:'short'});
        const { org, pto } = typeof _oposOrgPuesto === 'function' ? _oposOrgPuesto(r) : { org: r.organismo || '', pto: r.puesto || '' };
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
          <div style="min-width:0;flex:1;overflow:hidden">
            <div style="font-size:.79rem;color:var(--text1);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${org}</div>
            ${pto ? `<div style="font-size:.72rem;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${pto}</div>` : ''}
            <div style="font-size:.7rem;color:var(--text3)">📝 Fin instancias · ${fechaStr}</div>
          </div>
          <span style="color:${color};font-weight:700;font-size:.8rem;white-space:nowrap;margin-left:8px">${listo ? '✅' : diasLabel}</span>
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

  // Eventos estructurados (age_eventos_struct)
  const AGE_ICON = {
    personal:'💙', oposiciones:'📚', finanzas:'💚', carnet:'🚗',
    medico:'💊', familia:'👨‍👩‍👧', ocio:'🎭', otro:'📌',
  };
  const structEvs = Store.get('age_eventos_struct', []).map(ev => {
    if (!ev.fecha) return null;
    const fecha = new Date(ev.fecha + 'T00:00:00');
    fecha.setHours(0,0,0,0);
    if (fecha < hoy) return null;
    const dias = Math.round((fecha - hoy) / 86400000);
    const icono = AGE_ICON[ev.cat] || '📌';
    return { icono, texto: ev.nombre, fecha, dias };
  }).filter(Boolean);

  // Vencimientos (texto libre legacy)
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
    ...cumples.slice(0, 2),
    ...structEvs,
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
