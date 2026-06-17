// ─── MÓDULO FUTURO PISO ───

const PISO_CONFIG_DEF = {
  tipo_interes: 3.5, anios: 30, financiacion: 80,
  itp: 5, notario: 1500, gastos_adicionales: 500,
  precio_ref: 200000, aportas: 15000, importe_pedido: ''
};

const PISO_PISOS_DEF = [
  { estado:'Me gusta',       dir:'Paseo Vall Hebron, 200',    m2:59, barrio:'Vall Hebron', altura:'1º sin asc',    hab:'3 hab', precio:220000, honor:'No Incluidos', comunidad:null, ibi:null, ite:2014, reforma:null, nota:'' },
  { estado:'Pendiente',      dir:"Carrer d'Escocia",          m2:55, barrio:'Vilapicina',  altura:'3º con asc',    hab:'3 hab', precio:199000, honor:'Incluidos',    comunidad:54,   ibi:null, ite:2039, reforma:null, nota:'' },
  { estado:'Llamarán',       dir:'Carrer Pintor Josep Pinos', m2:54, barrio:'Horta',       altura:'3º sin asc',    hab:'3 hab', precio:208000, honor:'Incluidos',    comunidad:null, ibi:null, ite:2021, reforma:null, nota:'' },
  { estado:'Proxima visita', dir:'Calle de Pavia',            m2:43, barrio:'Sants',       altura:'2º sin asc',    hab:'2 hab', precio:179000, honor:'Incluidos',    comunidad:40,   ibi:null, ite:2010, reforma:null, nota:'' },
  { estado:'Llamarán',       dir:'Calle de Travau',           m2:68, barrio:'Vilapicina',  altura:'Ático con asc', hab:'3 hab', precio:187000, honor:'No Incluidos', comunidad:28,   ibi:null, ite:2000, reforma:null, nota:'' },
  { estado:'Pendiente',      dir:'Calle Pablo Iglesias',      m2:72, barrio:'Via Julia',   altura:'2º con asc',    hab:'1 hab', precio:220000, honor:'No Incluidos', comunidad:100,  ibi:null, ite:2012, reforma:null, nota:'' },
  { estado:'No cogen tlf',   dir:'Carrer Deià 40',            m2:55, barrio:'Porta',       altura:'1º sin asc',    hab:'3 hab', precio:179000, honor:'No Incluidos', comunidad:85,   ibi:252,  ite:2017, reforma:null, nota:'' },
  { estado:'Descartado',     dir:'Paseo de Fabra i Puig',     m2:60, barrio:'Vilapicina',  altura:'1º con asc',    hab:'3 hab', precio:140000, honor:'Incluidos',    comunidad:26,   ibi:355,  ite:2023, reforma:null, nota:'' },
  { estado:'Descartado',     dir:'Carrer del Cadí',           m2:66, barrio:'Vilapicina',  altura:'4º con asc',    hab:'2 hab', precio:132250, honor:'Incluidos',    comunidad:null, ibi:null, ite:2005, reforma:null, nota:'' },
];

const PISO_BANCOS_DEF = [
  { estatus:'📞', banco:'Bankinter',     tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'📞', banco:'Caixabank',     tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'📤', banco:'OpenBank',      tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'ℹ️', banco:'BBVA',          tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'ℹ️', banco:'Ibercaja',      tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'🚫', banco:'Santander',     tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'🚫', banco:'Sabadell',      tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'🚫', banco:'ING',           tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'',   banco:'Kutxabank',     tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'',   banco:'EVO Bank',      tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'ℹ️', banco:'Unicaja',       tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'ℹ️', banco:'Laboral Kutxa', tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'ℹ️', banco:'Abanca',        tae:'', anios:'', vinc:'', nota:'' },
  { estatus:'ℹ️', banco:'Globalcaja',    tae:'', anios:'', vinc:'', nota:'' },
];

const ESTADO_COLOR = {
  'Me gusta':       'var(--green)',
  'Proxima visita': 'var(--accent)',
  'Pendiente':      'var(--yellow)',
  'Llamarán':       'var(--orange)',
  'No cogen tlf':   'var(--text3)',
  'Descartado':     'var(--red)',
};

const BANCO_ESTATUS_OPTS = [
  { v:'',    label:'— Sin contactar' },
  { v:'📞',  label:'📞 Llamar' },
  { v:'📤',  label:'📤 Solicitud enviada' },
  { v:'ℹ️',  label:'ℹ️ Info recibida' },
  { v:'✅',  label:'✅ Aprobado' },
  { v:'⏳',  label:'⏳ En estudio' },
  { v:'🚫',  label:'🚫 Descartado' },
];

// ── Helpers ───────────────────────────────────────────────────
function _pmtCalc(rate, nper, pv) {
  if (rate === 0) return pv / nper;
  return pv * rate * Math.pow(1 + rate, nper) / (Math.pow(1 + rate, nper) - 1);
}

function piso_getConfig() {
  return Object.assign({}, PISO_CONFIG_DEF, JSON.parse(localStorage.getItem('piso_config') || '{}'));
}
function piso_saveConfig(c) { localStorage.setItem('piso_config', JSON.stringify(c)); }

function piso_getPisos() {
  const s = localStorage.getItem('piso_pisos');
  return s ? JSON.parse(s) : JSON.parse(JSON.stringify(PISO_PISOS_DEF));
}
function piso_savePisos(p) { localStorage.setItem('piso_pisos', JSON.stringify(p)); }

function piso_getBancos() {
  const s = localStorage.getItem('piso_bancos');
  return s ? JSON.parse(s) : JSON.parse(JSON.stringify(PISO_BANCOS_DEF));
}
function piso_saveBancos(b) { localStorage.setItem('piso_bancos', JSON.stringify(b)); }

function _getCTVInfo(cfg) {
  const saldos = JSON.parse(localStorage.getItem('fin_saldos') || '{}');
  const fin = parseFloat(saldos.ctv || 0);
  if (fin > 0) return { value: fin, source: 'finanzas' };
  return { value: parseFloat(cfg.aportas || 0), source: 'manual' };
}

function _calcMeta(cfg, hipoteca) {
  const arras  = cfg.precio_ref * 0.10;
  const itpAmt = cfg.precio_ref * cfg.itp / 100;
  const resto  = cfg.precio_ref - arras - 1000 - hipoteca;
  const extras = parseFloat(cfg.gastos_adicionales) || 0;
  return arras + 1000 + (resto > 0 ? resto : 0) + itpAmt + cfg.notario + extras;
}

const eur  = v => parseFloat(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:0,maximumFractionDigits:0});
const eur2 = v => parseFloat(v).toLocaleString('es-ES',{style:'currency',currency:'EUR',minimumFractionDigits:2,maximumFractionDigits:2});

// ── AHORRO CTV ────────────────────────────────────────────────

function renderPisoAhorro() {
  const el = document.getElementById('piso-ahorro-bar');
  if (!el) return;
  const cfg  = piso_getConfig();
  const ctvi = _getCTVInfo(cfg);
  const ctv  = ctvi.value;
  const impP = parseFloat(cfg.importe_pedido) || 0;
  const hip  = impP > 0 ? impP : cfg.precio_ref * cfg.financiacion / 100;
  const meta = _calcMeta(cfg, hip);
  const pct  = meta > 0 ? Math.min(100, Math.round(ctv / meta * 100)) : 0;
  const falta = Math.max(0, meta - ctv);
  const col   = pct >= 100 ? 'var(--green)' : pct >= 50 ? 'var(--accent)' : 'var(--yellow)';
  const entradaPct = 100 - cfg.financiacion; // % real de entrada (lo que pones tú)

  const syncBadge = ctvi.source === 'finanzas'
    ? `<span style="font-size:.63rem;background:var(--green)22;color:var(--green);border-radius:99px;padding:2px 7px;margin-left:6px">✓ Finanzas</span>`
    : `<span style="font-size:.63rem;background:var(--yellow)22;color:var(--yellow);border-radius:99px;padding:2px 7px;margin-left:6px">manual</span>`;

  el.innerHTML = `
    <div style="display:flex;gap:14px;flex-wrap:wrap;align-items:stretch">

      <div style="flex:1;min-width:150px;background:linear-gradient(135deg,var(--surface2),var(--surface));border-radius:12px;padding:14px 16px;border:1px solid var(--border);position:relative">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;background:${col};border-radius:12px 12px 0 0"></div>
        <div style="font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:2px">
          Cuenta Vivienda (CTV) ${syncBadge}
        </div>
        <div style="font-size:2rem;font-weight:900;color:${col};line-height:1.1">${eur(ctv)}</div>
        ${ctvi.source === 'manual' ? `
          <div style="margin-top:8px;display:flex;gap:6px">
            <input id="piso-ctv-edit" type="number" value="${ctv}" step="100" style="width:100px;font-size:.8rem;padding:4px 8px">
            <button onclick="piso_setCTV()" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.75rem;font-weight:600">OK</button>
          </div>
          <div style="font-size:.63rem;color:var(--text3);margin-top:4px">Actualiza también en ✏️ Finanzas → Saldos</div>
        ` : `<div style="font-size:.68rem;color:var(--text3);margin-top:4px">Actualiza en ✏️ Finanzas → Saldos</div>`}
      </div>

      <div style="flex:2;min-width:200px;display:flex;flex-direction:column;justify-content:space-between">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px">
          <div>
            <div style="font-size:.63rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">
              Total necesario (${entradaPct}% entrada + ITP + gastos)
            </div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--text2)">${eur(meta)}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:2.2rem;font-weight:900;color:${col};line-height:1">${pct}%</div>
            <div style="font-size:.65rem;color:var(--text3)">completado</div>
          </div>
        </div>
        <div>
          <div style="height:12px;border-radius:99px;background:var(--surface2);overflow:hidden;margin-bottom:6px">
            <div style="height:100%;width:${pct}%;background:${col};border-radius:99px;transition:.5s"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--text3)">
            <span>${eur(ctv)} ahorrado</span>
            <span style="color:${falta>0?'var(--red)':'var(--green)'}">
              ${falta > 0 ? `Faltan ${eur(falta)}` : '🎉 ¡Meta alcanzada!'}
            </span>
          </div>
        </div>
      </div>

    </div>

    ${_pisoAhorroProyeccionHTML(meta, ctv)}`;
}

function _pisoAhorroProyeccionHTML(meta, ctv) {
  if (typeof ctv_simularCrecimiento !== 'function') return '';
  const falta = Math.max(0, meta - ctv);
  if (falta <= 0) return '';

  const sims = ctv_simularCrecimiento(ctv, meta);
  const colorSim = ['var(--green)', 'var(--accent)'];

  return `
    <div style="margin-top:12px;padding:12px 14px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
      <div style="font-size:.65rem;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px">
        Proyección CTV Kutxabank — 8.500 €/año + devolución Hacienda Foral
      </div>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        ${sims.map((sim, si) => {
          const c = colorSim[si];
          const lastRow = sim.rows[sim.rows.length - 1];
          const anios = lastRow.alcanzado ? lastRow.anio : '> 25';
          const devAnual = 8500 * sim.deduccion;
          const totalAnual = 8500 + devAnual;
          return `
          <div style="flex:1;min-width:180px;background:var(--bg3);border-radius:8px;padding:10px 12px;border-left:3px solid ${c}">
            <div style="font-size:.68rem;font-weight:700;color:${c};margin-bottom:6px">${sim.label}</div>
            <div style="font-size:1.8rem;font-weight:900;color:${c};line-height:1">${anios}<span style="font-size:.75rem;font-weight:600;color:var(--text3);margin-left:4px">${typeof anios==='number'?'años':''}</span></div>
            <div style="font-size:.68rem;color:var(--text3);margin-top:5px">
              ~${eur(totalAnual)}/año efectivos<br>
              (8.500 € + ${eur(devAnual)} Hacienda)
            </div>
            <div style="font-size:.65rem;color:${c};margin-top:4px;opacity:.8">
              Bonus Kutxabank: +${eur(sim.bonusFinal)}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
}

function piso_setCTV() {
  const val = parseFloat(document.getElementById('piso-ctv-edit')?.value || 0);
  const cfg = piso_getConfig();
  cfg.aportas = val;
  piso_saveConfig(cfg);
  renderPisoAhorro();
  piso_liveCalc();
}

// ── CALCULADORA ───────────────────────────────────────────────

function renderPisoCalc() {
  const el = document.getElementById('piso-calc-content');
  if (!el) return;
  const cfg  = piso_getConfig();
  const ctv  = _getCTVInfo(cfg).value;
  const impP = parseFloat(cfg.importe_pedido) || 0;
  const hipAuto  = cfg.precio_ref * cfg.financiacion / 100;
  const hipoteca = impP > 0 ? impP : hipAuto;
  const cuota    = _pmtCalc(cfg.tipo_interes / 100 / 12, cfg.anios * 12, hipoteca);
  const intereses = cuota * 12 * cfg.anios - hipoteca;
  const itpAmt    = cfg.precio_ref * cfg.itp / 100;
  const meta      = _calcMeta(cfg, hipoteca);
  const costeTotal = cfg.precio_ref + itpAmt + cfg.notario + intereses;
  const diferencia = ctv - meta;
  const difColor   = diferencia >= 0 ? 'var(--green)' : 'var(--red)';
  const entradaPct = 100 - cfg.financiacion;

  el.innerHTML = `
    <div class="cards-row">
      <div class="card" style="flex:1.3">
        <h3>⚙️ Parámetros</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
          <div class="form-group" style="grid-column:1/-1">
            <label style="font-size:.75rem">Precio piso (€)</label>
            <input type="number" id="pcfg-precio" value="${cfg.precio_ref}" step="1000" style="width:100%" oninput="piso_liveCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">Tipo interés (%)</label>
            <input type="number" id="pcfg-tipo" value="${cfg.tipo_interes}" step="0.05" style="width:100%" oninput="piso_liveCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">Años hipoteca</label>
            <input type="number" id="pcfg-anios" value="${cfg.anios}" min="5" max="40" style="width:100%" oninput="piso_liveCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">% Financiación banco</label>
            <div style="display:flex;gap:6px">
              <button onclick="piso_setFinanciacion(80)" style="flex:1;padding:6px 0;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:.82rem;background:${cfg.financiacion===80?'var(--accent)':'var(--surface2)'};color:${cfg.financiacion===80?'#fff':'var(--text2)'}">80%</button>
              <button onclick="piso_setFinanciacion(90)" style="flex:1;padding:6px 0;border-radius:8px;border:none;cursor:pointer;font-weight:700;font-size:.82rem;background:${cfg.financiacion===90?'var(--accent)':'var(--surface2)'};color:${cfg.financiacion===90?'#fff':'var(--text2)'}">90%</button>
            </div>
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">ITP (%)</label>
            <input type="number" id="pcfg-itp" value="${cfg.itp}" step="0.5" style="width:100%" oninput="piso_liveCalc()">
          </div>
          <div class="form-group">
            <label style="font-size:.75rem">Notario (€)</label>
            <input type="number" id="pcfg-notario" value="${cfg.notario}" step="100" style="width:100%" oninput="piso_liveCalc()">
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label style="font-size:.75rem">Tasación + Registro (€) <span style="color:var(--text3);font-weight:400">— gastos hipoteca</span></label>
            <input type="number" id="pcfg-extras" value="${cfg.gastos_adicionales ?? 500}" step="100" style="width:100%" oninput="piso_liveCalc()">
          </div>
        </div>

        <div style="margin-top:14px;padding:12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
          <div style="font-size:.7rem;color:var(--text3);margin-bottom:6px;font-weight:600">🏦 IMPORTE A PEDIR AL BANCO</div>
          <div style="display:flex;gap:8px;align-items:center">
            <input type="number" id="pcfg-impPedido" value="${cfg.importe_pedido||''}"
              placeholder="Auto: ${eur(hipAuto)}" step="1000" style="flex:1;font-size:.9rem" oninput="piso_liveCalc()">
            ${impP > 0 ? `<button onclick="piso_clearImpPedido()" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:.85rem">✕</button>` : ''}
          </div>
          <div style="font-size:.65rem;color:var(--text3);margin-top:4px">
            Vacío = auto (precio × ${cfg.financiacion}% = ${eur(hipAuto)}). Rellena si tienes oferta real.
          </div>
        </div>
      </div>

      <div class="card" style="flex:1">
        <h3>📊 Resultados</h3>
        <div id="piso-calc-results" style="margin-top:12px">
          ${_calcResultsHTML(hipoteca, hipAuto, impP, cuota, intereses, costeTotal, meta, ctv, diferencia, difColor, entradaPct, cfg)}
        </div>
      </div>
    </div>`;
}

function _calcResultsHTML(hipoteca, hipAuto, impP, cuota, intereses, costeTotal, meta, ctv, diferencia, difColor, entradaPct, cfg) {
  const entrada  = cfg.precio_ref * entradaPct / 100;
  const itpAmt   = cfg.precio_ref * cfg.itp / 100;
  const extras   = parseFloat(cfg.gastos_adicionales) || 0;
  const rows = [
    ['━━ HIPOTECA ━━', null],
    [impP > 0 ? '💬 Importe pedido al banco' : `Hipoteca (${cfg.financiacion}%)`, eur(hipoteca), 'var(--text2)'],
    ['Cuota mensual',  eur2(cuota),     'var(--accent)', true],
    ['Total intereses ('+cfg.anios+'a)', eur(intereses), 'var(--red)'],
    ['Coste total vida hipoteca', eur(costeTotal), 'var(--text3)'],
    ['━━ ENTRADA + GASTOS ━━', null],
    [`Tu entrada (${entradaPct}%)`, eur(entrada),        'var(--text2)'],
    [`ITP (${cfg.itp}%)`,           eur(itpAmt),         'var(--text2)'],
    ['Notario',                     eur(cfg.notario),     'var(--text2)'],
    ['Tasación + Registro',         eur(extras),          'var(--text2)'],
    ['━━ TOTAL NECESARIO ━━', null],
    ['Total para la compra', eur(meta), 'var(--text2)', true],
    ['Tienes (CTV)',          eur(ctv),  ctv >= meta ? 'var(--green)' : 'var(--yellow)', true],
    [diferencia >= 0 ? '✓ Te sobra' : '✗ Te falta', eur(Math.abs(diferencia)), difColor, true],
  ];
  return rows.map(r => {
    if (r[1] === null) return `<div style="font-size:.65rem;font-weight:700;color:var(--text3);letter-spacing:.06em;text-transform:uppercase;padding:8px 0 2px 0;border-top:1px solid var(--border);margin-top:4px">${r[0]}</div>`;
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:.78rem;color:var(--text3)">${r[0]}</span>
      <span style="font-size:${r[3]?'.93rem':'.82rem'};font-weight:${r[3]?700:400};color:${r[2]}">${r[1]}</span>
    </div>`;
  }).join('');
}

function piso_liveCalc() {
  const cfg = piso_getConfig();
  cfg.precio_ref         = +document.getElementById('pcfg-precio')?.value   || cfg.precio_ref;
  cfg.tipo_interes       = +document.getElementById('pcfg-tipo')?.value     || cfg.tipo_interes;
  cfg.anios              = +document.getElementById('pcfg-anios')?.value    || cfg.anios;
  cfg.itp                = +document.getElementById('pcfg-itp')?.value      || cfg.itp;
  cfg.notario            = +document.getElementById('pcfg-notario')?.value  || cfg.notario;
  cfg.gastos_adicionales = +document.getElementById('pcfg-extras')?.value   ?? cfg.gastos_adicionales;
  cfg.importe_pedido     = document.getElementById('pcfg-impPedido')?.value || '';
  piso_saveConfig(cfg);

  const ctv     = _getCTVInfo(cfg).value;
  const impP    = parseFloat(cfg.importe_pedido) || 0;
  const hipAuto = cfg.precio_ref * cfg.financiacion / 100;
  const hipoteca = impP > 0 ? impP : hipAuto;
  const cuota    = _pmtCalc(cfg.tipo_interes / 100 / 12, cfg.anios * 12, hipoteca);
  const intereses = cuota * 12 * cfg.anios - hipoteca;
  const itpAmt    = cfg.precio_ref * cfg.itp / 100;
  const meta      = _calcMeta(cfg, hipoteca);
  const costeTotal = cfg.precio_ref + itpAmt + cfg.notario + intereses;
  const diferencia = ctv - meta;
  const difColor   = diferencia >= 0 ? 'var(--green)' : 'var(--red)';
  const entradaPct = 100 - cfg.financiacion;

  const elR = document.getElementById('piso-calc-results');
  if (elR) elR.innerHTML = _calcResultsHTML(hipoteca, hipAuto, impP, cuota, intereses, costeTotal, meta, ctv, diferencia, difColor, entradaPct, cfg);
  const elImp = document.getElementById('pcfg-impPedido');
  if (elImp) elImp.placeholder = `Auto: ${eur(hipAuto)}`;
  renderPisoAhorro();
}

function piso_setFinanciacion(pct) {
  const cfg = piso_getConfig();
  cfg.financiacion = pct;
  piso_saveConfig(cfg);
  renderPisoCalc();
  renderPisoBancos();
  renderPisoAhorro();
}

function piso_clearImpPedido() {
  const cfg = piso_getConfig();
  cfg.importe_pedido = '';
  piso_saveConfig(cfg);
  renderPisoCalc();
}

// ── PISOS ─────────────────────────────────────────────────────

let _pisoEditIdx = -1;

function renderPisoPisos() {
  const el = document.getElementById('piso-pisos-content');
  if (!el) return;
  const pisos = piso_getPisos();
  const cfg   = piso_getConfig();
  const ORDER = Object.keys(ESTADO_COLOR);
  const sorted = [...pisos].sort((a,b) => ORDER.indexOf(a.estado) - ORDER.indexOf(b.estado));

  el.innerHTML = `
    <!-- Añadir / Editar piso -->
    <div id="piso-edit-panel" style="${_pisoEditIdx >= 0 ? '' : 'display:none'}">
      ${_pisoFormHTML(_pisoEditIdx >= 0 ? pisos[_pisoEditIdx] : null, _pisoEditIdx)}
    </div>

    <!-- Barra: botón añadir + filtros en la misma fila -->
    <div style="display:${_pisoEditIdx>=0?'none':'flex'};align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap">
      <button onclick="piso_abrirForm(-1)" id="piso-add-btn"
        style="display:flex;align-items:center;gap:6px;flex-shrink:0;background:var(--accent)15;
          border:1.5px dashed var(--accent);border-radius:99px;padding:6px 14px;cursor:pointer;
          font-size:.8rem;font-weight:600;color:var(--accent)">
        ➕ Añadir piso
      </button>
      <div style="display:flex;gap:5px;overflow-x:auto;flex:1;padding-bottom:2px">
        ${ORDER.map(e=>`<button onclick="piso_filtrarEstado('${e}')"
          style="font-size:.68rem;cursor:pointer;background:${ESTADO_COLOR[e]}18;color:${ESTADO_COLOR[e]};
            border:1px solid ${ESTADO_COLOR[e]}44;border-radius:99px;padding:3px 8px;white-space:nowrap;flex-shrink:0">${e}</button>`).join('')}
        <button onclick="piso_filtrarEstado('')"
          style="font-size:.68rem;cursor:pointer;background:var(--surface2);color:var(--text3);border:1px solid var(--border);border-radius:99px;padding:3px 8px;flex-shrink:0">Todos</button>
      </div>
    </div>

    <div id="piso-pisos-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px">
      ${sorted.map(p => _pisoCard(p, pisos.indexOf(p), cfg)).join('')}
    </div>`;
}

function _pisoFormHTML(p, idx) {
  const estados = Object.keys(ESTADO_COLOR);
  const isEdit  = idx >= 0;
  return `<div class="card" style="border:1.5px solid var(--accent)55;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
      <h3 style="margin:0">${isEdit ? '✏️ Editar piso' : '🏠 Añadir piso visitado'}</h3>
      <button onclick="piso_cerrarForm()" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:1.1rem">✕</button>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group" style="grid-column:1/-1">
        <label style="font-size:.75rem">Dirección *</label>
        <input id="nadd-dir" type="text" value="${p?.dir||''}" placeholder="Ej: Carrer de Mallorca, 234, 3º 2ª" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Estado</label>
        <select id="nadd-estado" style="width:100%">
          ${estados.map(e=>`<option value="${e}" ${(p?.estado||'Pendiente')===e?'selected':''}>${e}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Precio (€) *</label>
        <input id="nadd-precio" type="number" value="${p?.precio||''}" step="1000" placeholder="180000" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Barrio</label>
        <input id="nadd-barrio" type="text" value="${p?.barrio||''}" placeholder="Ej: Gràcia" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">m²</label>
        <input id="nadd-m2" type="number" value="${p?.m2||''}" placeholder="55" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Habitaciones</label>
        <select id="nadd-hab" style="width:100%">
          ${['1 hab','2 hab','3 hab','4 hab'].map(h=>`<option ${(p?.hab||'3 hab')===h?'selected':''}>${h}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Altura</label>
        <input id="nadd-altura" type="text" value="${p?.altura||''}" placeholder="Ej: 2º con asc" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Honorarios agencia</label>
        <select id="nadd-honor" style="width:100%">
          <option value="Incluidos" ${(p?.honor||'Incluidos')==='Incluidos'?'selected':''}>Incluidos</option>
          <option value="No Incluidos" ${p?.honor==='No Incluidos'?'selected':''}>No Incluidos (+3%+IVA)</option>
        </select>
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Comunidad (€/mes)</label>
        <input id="nadd-comunidad" type="number" value="${p?.comunidad||''}" placeholder="—" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">IBI (€/año)</label>
        <input id="nadd-ibi" type="number" value="${p?.ibi||''}" placeholder="—" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Año ITE</label>
        <input id="nadd-ite" type="number" value="${p?.ite||''}" placeholder="Ej: 2018" style="width:100%">
      </div>
      <div class="form-group">
        <label style="font-size:.75rem">Reforma estimada (€) <span style="color:var(--text3);font-weight:400">— se suma al Coste Real</span></label>
        <input id="nadd-reforma" type="number" value="${p?.reforma||''}" placeholder="0" step="500" style="width:100%">
      </div>
      <div class="form-group" style="grid-column:1/-1">
        <label style="font-size:.75rem">Nota</label>
        <input id="nadd-nota" type="text" value="${p?.nota||''}" placeholder="Ej: Muy luminoso, zona tranquila..." style="width:100%">
      </div>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px">
      <button onclick="piso_guardarForm(${idx})" class="btn-primary" style="flex:1">
        💾 ${isEdit ? 'Guardar cambios' : 'Añadir piso'}
      </button>
      <button onclick="piso_cerrarForm()" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:8px 16px;cursor:pointer;color:var(--text3)">
        Cancelar
      </button>
    </div>
  </div>`;
}

function piso_abrirForm(idx) {
  _pisoEditIdx = idx;
  renderPisoPisos();
  document.getElementById('piso-edit-panel')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function piso_cerrarForm() {
  _pisoEditIdx = -1;
  renderPisoPisos();
}

function piso_guardarForm(idx) {
  const dir    = document.getElementById('nadd-dir')?.value.trim();
  const precio = parseFloat(document.getElementById('nadd-precio')?.value);
  if (!dir || !precio) { alert('La dirección y el precio son obligatorios.'); return; }

  const datos = {
    estado:    document.getElementById('nadd-estado')?.value    || 'Pendiente',
    dir, precio,
    m2:        parseFloat(document.getElementById('nadd-m2')?.value)        || 0,
    barrio:    document.getElementById('nadd-barrio')?.value.trim()          || '',
    altura:    document.getElementById('nadd-altura')?.value.trim()          || '',
    hab:       document.getElementById('nadd-hab')?.value                    || '3 hab',
    honor:     document.getElementById('nadd-honor')?.value                  || 'Incluidos',
    comunidad: parseFloat(document.getElementById('nadd-comunidad')?.value)  || null,
    ibi:       parseFloat(document.getElementById('nadd-ibi')?.value)        || null,
    ite:       parseFloat(document.getElementById('nadd-ite')?.value)        || null,
    reforma:   parseFloat(document.getElementById('nadd-reforma')?.value)    || null,
    nota:      document.getElementById('nadd-nota')?.value.trim()            || '',
  };

  const pisos = piso_getPisos();
  if (idx >= 0) { pisos[idx] = datos; }
  else          { pisos.unshift(datos); }
  piso_savePisos(pisos);
  _pisoEditIdx = -1;
  renderPisoPisos();
}

function _pisoCard(p, idx, cfg) {
  const color    = ESTADO_COLOR[p.estado] || 'var(--text3)';
  const impP     = parseFloat(cfg.importe_pedido) || 0;
  const hipoteca = impP > 0 ? impP : p.precio * cfg.financiacion / 100;
  const cuota    = _pmtCalc(cfg.tipo_interes / 100 / 12, cfg.anios * 12, hipoteca);
  const honorExt = p.honor === 'No Incluidos' ? p.precio * 0.03 * 1.21 : 0;
  const reforma   = parseFloat(p.reforma) || 0;
  const costeReal = p.precio * (1 + cfg.itp / 100) + cfg.notario + honorExt + reforma;
  const m2Price   = p.m2 > 0 ? Math.round(p.precio / p.m2) : 0;
  const iteStyle  = p.ite && p.ite < 2005 ? 'color:var(--red)' : p.ite && p.ite < 2015 ? 'color:var(--orange)' : 'color:var(--text3)';

  return `<div class="card piso-card" data-estado="${p.estado}"
    style="border-left:3px solid ${color};padding:12px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:5px">
      <span style="font-size:.65rem;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.05em">${p.estado}</span>
      <div style="display:flex;gap:2px">
        <button onclick="piso_abrirForm(${idx})" title="Editar"
          style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text3);font-size:.75rem;padding:3px 7px">✏️ Editar</button>
        <button onclick="piso_borrar(${idx})" title="Eliminar"
          style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:.75rem;padding:3px 6px">🗑️</button>
      </div>
    </div>
    <div style="font-size:.88rem;font-weight:700;margin-bottom:2px;line-height:1.3">${p.dir}</div>
    <div style="font-size:.7rem;color:var(--text3);margin-bottom:10px">${[p.barrio,p.altura,p.hab].filter(Boolean).join(' · ')}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px">
      <div>
        <div style="font-size:.62rem;color:var(--text3)">Precio</div>
        <div style="font-size:.95rem;font-weight:800">${eur(p.precio)}</div>
      </div>
      <div>
        <div style="font-size:.62rem;color:var(--text3)">€/m²${p.m2?' ('+p.m2+'m²)':''}</div>
        <div style="font-size:.85rem;font-weight:600">${m2Price ? eur(m2Price) : '—'}</div>
      </div>
      <div>
        <div style="font-size:.62rem;color:var(--text3)">Coste real est.</div>
        <div style="font-size:.85rem;font-weight:600;color:var(--orange)">${eur(costeReal)}</div>
      </div>
      <div>
        <div style="font-size:.62rem;color:var(--text3)">Cuota est.</div>
        <div style="font-size:.9rem;font-weight:800;color:var(--accent)">${eur2(cuota)}/mes</div>
      </div>
    </div>

    <div style="font-size:.67rem;color:var(--text3);display:flex;gap:8px;flex-wrap:wrap">
      ${p.comunidad ? `<span>🏢 ${p.comunidad}€/mes</span>` : ''}
      ${p.ibi       ? `<span>📋 IBI ${p.ibi}€</span>`       : ''}
      ${p.ite       ? `<span style="${iteStyle}">🔧 ITE ${p.ite}</span>` : ''}
      ${reforma     ? `<span style="color:var(--red)">🛠 Reforma ${eur(reforma)}</span>` : ''}
      <span style="color:${p.honor==='Incluidos'?'var(--green)':'var(--orange)'}">
        ${p.honor==='Incluidos'?'✓ Honor. incl.':'⚠ +3%+IVA'}
      </span>
    </div>
    ${p.nota ? `<div style="margin-top:7px;font-size:.7rem;background:var(--yellow)12;color:var(--yellow);padding:4px 8px;border-radius:6px;border-left:2px solid var(--yellow)">📝 ${p.nota}</div>` : ''}
  </div>`;
}

function piso_filtrarEstado(estado) {
  document.querySelectorAll('.piso-card').forEach(c => {
    c.style.display = (!estado || c.dataset.estado === estado) ? '' : 'none';
  });
}

function piso_borrar(idx) {
  const pisos = piso_getPisos();
  if (!confirm(`¿Eliminar "${pisos[idx]?.dir}"?`)) return;
  pisos.splice(idx, 1);
  piso_savePisos(pisos);
  renderPisoPisos();
}

// ── HIPOTECAS ─────────────────────────────────────────────────

let _bancosExpanded = false;

function pisoBancosToggle() {
  _bancosExpanded = !_bancosExpanded;
  renderPisoBancos();
}

function renderPisoBancos() {
  const el = document.getElementById('piso-bancos-content');
  if (!el) return;
  const bancos = piso_getBancos();
  const cfg    = piso_getConfig();
  const impP   = parseFloat(cfg.importe_pedido) || 0;
  const hip    = impP > 0 ? impP : cfg.precio_ref * cfg.financiacion / 100;

  const conDatos = bancos.filter(b => b.tae && b.anios && parseFloat(b.tae) > 0 && !b.estatus?.includes('🚫'));
  const mejorInfo = conDatos.length > 0 ? (() => {
    let best = null;
    conDatos.forEach(b => {
      const c = _pmtCalc(parseFloat(b.tae)/100/12, parseFloat(b.anios)*12, hip);
      if (!best || c < best.c) best = { c, banco: b.banco };
    });
    return best;
  })() : null;

  // Separar bancos con datos reales (siempre visibles) de los sin datos (colapsables)
  // "Con datos": tienen TAE o años o nota rellenados
  const conDatosIdx = bancos.reduce((acc,b,i) => {
    if (b.tae || b.anios || b.nota) acc.push(i);
    return acc;
  }, []);
  // Primeros 4 siempre visibles aunque no tengan datos aún
  const siempreVisibles = new Set([...conDatosIdx, 0, 1, 2, 3].filter(i => i < bancos.length));
  const ocultos = bancos.reduce((acc,_,i) => { if (!siempreVisibles.has(i)) acc.push(i); return acc; }, []);
  const visibles = _bancosExpanded ? bancos.map((_,i)=>i) : [...siempreVisibles].sort((a,b)=>a-b);

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px">
      <div style="font-size:.78rem;color:var(--text3)">
        Importe base: <strong style="color:var(--accent)">${eur(hip)}</strong>
        <span style="font-size:.7rem"> (${impP>0?'importe pedido':cfg.financiacion+'% de '+eur(cfg.precio_ref)})</span>
      </div>
      ${mejorInfo ? `<div style="font-size:.75rem;background:var(--green)15;color:var(--green);border-radius:8px;padding:4px 10px">
        🏆 Mejor: ${eur2(mejorInfo.c)}/mes — ${mejorInfo.banco}</div>` : ''}
    </div>

    <div class="bancos-table-wrap" style="overflow-x:auto">
    <table class="piso-bancos-table" style="width:100%;border-collapse:collapse;font-size:.82rem">
      <thead>
        <tr style="background:var(--surface2)">
          <th style="padding:7px 6px;text-align:left;min-width:110px">Estado</th>
          <th style="padding:7px 6px;text-align:left">Banco</th>
          <th style="padding:7px 6px;text-align:center">TAE (%)</th>
          <th style="padding:7px 6px;text-align:center">Años</th>
          <th style="padding:7px 6px;text-align:right;color:var(--accent)">Cuota/mes <span style="font-size:.6rem;font-weight:400;color:var(--text3)">(auto)</span></th>
          <th style="padding:7px 6px;text-align:left;color:var(--yellow)">Vinculaciones <span style="font-size:.6rem;font-weight:400;color:var(--text3)">seguros, nómina…</span></th>
          <th style="padding:7px 6px;text-align:left">Notas</th>
          <th style="padding:7px 6px;width:28px"></th>
        </tr>
      </thead>
      <tbody id="piso-bancos-tbody">
        ${visibles.map(i => _bancoRow(bancos[i], i, hip)).join('')}
      </tbody>
    </table>
    </div>

    ${ocultos.length > 0 ? `
    <button onclick="pisoBancosToggle()"
      style="margin-top:10px;display:flex;align-items:center;gap:6px;background:none;border:1px solid var(--border);
        border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.78rem;color:var(--text3)">
      ${_bancosExpanded
        ? `▴ Mostrar menos`
        : `▾ Ver ${ocultos.length} banco${ocultos.length!==1?'s':''} más (sin contactar / descartados)`}
    </button>` : ''}

    <button onclick="piso_addBanco()" style="margin-top:10px;display:flex;align-items:center;gap:6px;background:var(--accent)15;border:1.5px dashed var(--accent);border-radius:8px;padding:7px 14px;cursor:pointer;font-size:.8rem;color:var(--accent);font-weight:600">
      ➕ Añadir banco
    </button>`;
}

function _bancoRow(b, i, hip) {
  const tae   = parseFloat(b.tae);
  const anios = parseFloat(b.anios);
  const isDescartado = b.estatus === '🚫';
  let cuota = '—', cuotaColor = 'var(--text3)';
  if (b.tae && b.anios && tae > 0 && anios > 0) {
    cuota = eur2(_pmtCalc(tae/100/12, anios*12, hip));
    cuotaColor = isDescartado ? 'var(--text3)' : 'var(--accent)';
  }
  const rowStyle = isDescartado ? 'opacity:.4' : '';
  const selectOpts = BANCO_ESTATUS_OPTS.map(o =>
    `<option value="${o.v}" ${b.estatus===o.v?'selected':''}>${o.label}</option>`
  ).join('');

  return `<tr style="border-bottom:1px solid var(--border);${rowStyle}">
    <td data-label="Estado" style="padding:6px 6px">
      <select style="font-size:.75rem;padding:3px 4px;width:100%;max-width:130px"
        onchange="piso_updateBanco(${i},'estatus',this.value)">${selectOpts}</select>
    </td>
    <td data-label="Banco" style="padding:6px 6px">
      <input type="text" value="${b.banco}" style="font-size:.82rem;font-weight:600;width:100%;min-width:80px;background:none;border:none;border-bottom:1px solid var(--border)"
        onchange="piso_updateBanco(${i},'banco',this.value)">
    </td>
    <td data-label="TAE (%)" style="padding:6px 6px;text-align:center">
      <input type="number" value="${b.tae}" step="0.05" min="0" max="15" placeholder="—"
        style="width:60px;text-align:center"
        onchange="piso_updateBanco(${i},'tae',this.value)">
    </td>
    <td data-label="Años" style="padding:6px 6px;text-align:center">
      <input type="number" value="${b.anios}" step="1" min="5" max="40" placeholder="—"
        style="width:50px;text-align:center"
        onchange="piso_updateBanco(${i},'anios',this.value)">
    </td>
    <td data-label="Cuota/mes" style="padding:6px 6px;text-align:right;font-weight:700;color:${cuotaColor}">${cuota}</td>
    <td data-label="Vinculaciones" style="padding:6px 6px">
      <input type="text" value="${b.vinc||''}" placeholder="Ej: Seg. vida + nómina"
        title="Vinculaciones exigidas por el banco (seguros, domiciliar nómina, etc.)"
        style="width:100%;min-width:140px;font-size:.72rem;color:var(--yellow)"
        onchange="piso_updateBanco(${i},'vinc',this.value)">
    </td>
    <td data-label="Notas" style="padding:6px 6px">
      <input type="text" value="${b.nota||''}" placeholder="notas..."
        style="width:100%;font-size:.72rem"
        onchange="piso_updateBanco(${i},'nota',this.value)">
    </td>
    <td data-label="" style="padding:6px 4px">
      <button onclick="piso_borrarBanco(${i})" title="Eliminar"
        style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:.8rem;padding:2px 4px;min-height:36px">🗑️</button>
    </td>
  </tr>`;
}

function piso_updateBanco(idx, campo, valor) {
  const bancos = piso_getBancos();
  bancos[idx][campo] = valor;
  piso_saveBancos(bancos);
  renderPisoBancos();
}

function piso_addBanco() {
  const bancos = piso_getBancos();
  bancos.push({ estatus:'', banco:'Nuevo banco', tae:'', anios:'', vinc:'', nota:'' });
  piso_saveBancos(bancos);
  renderPisoBancos();
}

function piso_borrarBanco(idx) {
  const bancos = piso_getBancos();
  if (!confirm(`¿Eliminar "${bancos[idx]?.banco}"?`)) return;
  bancos.splice(idx, 1);
  piso_saveBancos(bancos);
  renderPisoBancos();
}

// ── TABS ──────────────────────────────────────────────────────

function setupPisoTabs() {
  document.querySelectorAll('.piso-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.piso-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.piso-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.ptab)?.classList.add('active');
    });
  });
}

// ── MAIN ──────────────────────────────────────────────────────

function loadPiso() {
  _pisoEditIdx = -1;
  setupPisoTabs();
  renderPisoAhorro();
  renderPisoCalc();
  renderPisoPisos();
  renderPisoBancos();
}
