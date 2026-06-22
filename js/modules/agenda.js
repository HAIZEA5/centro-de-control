// ─── MÓDULO AGENDA ───

// ── Seed de guardias ──
(function age_seedGuardias() {
  const KEY  = 'age_guardias_seed_v';
  const VER  = 1;
  if (parseInt(localStorage.getItem(KEY) || '0') >= VER) return;

  const GUARDIAS = [
    { fecha: '2026-07-09', nombre: '🏥 Guardia' },
    { fecha: '2026-07-27', nombre: '🏥 Guardia' },
    { fecha: '2026-08-06', nombre: '🏥 Guardia' },
    { fecha: '2026-08-20', nombre: '🏥 Guardia' },
    { fecha: '2026-09-09', nombre: '🏥 Guardia' },
  ];

  const lista = Store.get('age_eventos_struct', []);
  GUARDIAS.forEach(g => {
    const existe = lista.some(e => e.fecha === g.fecha && e.nombre === g.nombre);
    if (!existe) lista.push({ id: Date.now() + Math.random(), nombre: g.nombre, fecha: g.fecha, hora: '', cat: 'personal', ubicacion: '', notas: 'Guardia' });
  });
  Store.set('age_eventos_struct', lista);
  localStorage.setItem(KEY, String(VER));
})();

// ── Estado del calendario ──
let _calYear  = new Date().getFullYear();
let _calMonth = new Date().getMonth(); // 0-indexed

// ── Recoge todos los eventos con fecha real (YYYY-MM-DD o similar) ──
function age_getEventosCalendario(year, month) {
  const eventos = [];
  const pad = n => String(n).padStart(2,'0');

  // ── Cumpleaños (DD/MM, recurrentes) ──
  const local = Store.get('local_agenda');
  if (local.cumples) {
    local.cumples.split('\n').filter(l => l.trim()).forEach(linea => {
      // Formato: "Nombre — DD/MM" o "Nombre - DD/MM" o "Nombre DD/MM"
      const m = linea.match(/(\d{1,2})[\/\-](\d{1,2})/);
      if (m) {
        const dia = parseInt(m[1]), mes = parseInt(m[2]) - 1;
        if (mes === month) {
          const nombre = linea.replace(/[\-—]\s*\d{1,2}[\/\-]\d{1,2}/, '').replace(/\d{1,2}[\/\-]\d{1,2}/, '').trim();
          eventos.push({ fecha: `${year}-${pad(mes+1)}-${pad(dia)}`, texto: nombre || linea.trim(), tipo: 'cumple', color: 'var(--pink)', icono: '🎂' });
        }
      }
    });
  }

  // ── Eventos estructurados (nuevos, con categoría) ──
  const _AGE_CAL_CAT = {
    personal:'var(--blue)', oposiciones:'var(--accent2)', finanzas:'var(--green)',
    carnet:'var(--accent)', medico:'var(--pink)', familia:'var(--yellow)', ocio:'var(--purple)', otro:'var(--text3)',
  };
  const _AGE_CAL_ICON = {
    personal:'💙', oposiciones:'📚', finanzas:'💚', carnet:'🚗', medico:'💊', familia:'👨‍👩‍👧', ocio:'🎭', otro:'📌',
  };
  Store.get('age_eventos_struct', []).forEach(ev => {
    if (!ev.fecha) return;
    const d = new Date(ev.fecha + 'T12:00:00');
    if (d.getFullYear() === year && d.getMonth() === month) {
      const cat = ev.cat || 'otro';
      const horaStr = ev.hora ? ` ${ev.hora}` : '';
      const ubStr   = ev.ubicacion ? ` · ${ev.ubicacion}` : '';
      eventos.push({
        fecha: ev.fecha, texto: ev.nombre + horaStr + ubStr,
        tipo: 'evento', color: _AGE_CAL_CAT[cat] || 'var(--green)', icono: _AGE_CAL_ICON[cat] || '📌',
        _struct: true,
      });
    }
  });

  // ── Eventos de agenda (texto — fecha, legacy) ──
  if (local.eventos) {
    local.eventos.split('\n').filter(l => l.trim()).forEach(linea => {
      const m = linea.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (m) {
        const dia = parseInt(m[1]), mes = parseInt(m[2]) - 1;
        const anio = m[3] ? (m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3])) : year;
        if (mes === month && (anio === year || !m[3])) {
          const texto = linea.replace(/[\-—]\s*\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/, '').trim() ||
                        linea.replace(/\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/, '').replace(/[\-—]/, '').trim();
          eventos.push({ fecha: `${year}-${pad(mes+1)}-${pad(dia)}`, texto: texto || linea, tipo: 'evento', color: 'var(--green)', icono: '📌' });
        }
      }
    });
  }

  // ── Vencimientos ──
  if (local.vencimientos) {
    local.vencimientos.split('\n').filter(l => l.trim()).forEach(linea => {
      const m = linea.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
      if (m) {
        const dia = parseInt(m[1]), mes = parseInt(m[2]) - 1;
        if (mes === month) {
          const texto = linea.replace(/[\-—]\s*\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?/, '').trim();
          eventos.push({ fecha: `${year}-${pad(mes+1)}-${pad(dia)}`, texto: texto || linea, tipo: 'venc', color: 'var(--yellow)', icono: '⚠️' });
        }
      }
    });
  }

  // ── Carnet: Próxima convocatoria programada ──
  try {
    const cfg = car_getConfig();
    if (cfg.prox_fecha) {
      const d = new Date(cfg.prox_fecha);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const estadoLabel = { pendiente:'Examen pendiente', en_proceso:'Examen en proceso', convocado:'Examen convocado' };
        eventos.push({ fecha: cfg.prox_fecha, texto: estadoLabel[cfg.prox_estado] || 'Examen conducir', tipo: 'carnet-exam', color: 'var(--accent)', icono: '🚗' });
      }
    }
  } catch(e) {}

  // ── Carnet: Tests (agrupados por día) ──
  try {
    const rawTests = Store.get('car_tests', []);
    const testsByDay = {};
    rawTests.forEach(t => {
      if (!t.fecha) return;
      // Parsear como fecha local para evitar problemas de zona horaria
      const parts = t.fecha.split('-');
      if (parts.length !== 3) return;
      const dy = parseInt(parts[0]), dm = parseInt(parts[1]) - 1, dd = parseInt(parts[2]);
      if (dy === year && dm === month) {
        const key = t.fecha.slice(0, 10);
        if (!testsByDay[key]) testsByDay[key] = [];
        testsByDay[key].push(t);
      }
    });
    Object.entries(testsByDay).forEach(([fecha, dayTests]) => {
      const totalFallos = dayTests.reduce((s,t) => s + (parseInt(t.fallos) || 0), 0);
      const mediaFallos = (totalFallos / dayTests.length).toFixed(1);
      const numStr = n => `T${n}`;
      const texto = dayTests.length === 1
        ? `${numStr(dayTests[0].num)} · ${parseInt(dayTests[0].fallos)||0}❌`
        : `${dayTests.length} tests · ${mediaFallos}❌`;
      eventos.push({ fecha, texto, tipo: 'carnet-test', color: 'var(--blue)', icono: '📋' });
    });
    const rawExamenes = Store.get('car_examenes', []);
    rawExamenes.forEach(e => {
      if (!e.fecha) return;
      const d = new Date(e.fecha);
      if (d.getFullYear() === year && d.getMonth() === month) {
        eventos.push({ fecha: e.fecha, texto: `Examen teórico ${e.resultado === 'aprobado' ? '✅' : e.resultado === 'suspendido' ? '❌' : ''}`, tipo: 'carnet-exam', color: 'var(--accent)', icono: '🚗' });
      }
    });
    car_getPracticas().forEach(p => {
      if (!p.fecha) return;
      const d = new Date(p.fecha);
      if (d.getFullYear() === year && d.getMonth() === month) {
        eventos.push({ fecha: p.fecha, texto: `Práctica carnet${p.min ? ' ('+p.min+'min)' : ''}`, tipo: 'carnet-prac', color: '#34d399', icono: '🚘' });
      }
    });
  } catch(e) {}

  // ── Oposiciones ──
  try {
    const opos = getOposLocal();
    const OPOS_FECHAS = [
      { key: 'fecha_apertura',    label: 'Apertura inscr.',  icono: '🟢' },
      { key: 'fecha_fin_inscr',   label: 'Fin inscripción',  icono: '🔴' },
      { key: 'fecha_lista_prov',  label: 'Lista provisional',icono: '📄' },
      { key: 'fecha_alegaciones', label: 'Alegaciones',      icono: '✍️' },
      { key: 'fecha_lista_def',   label: 'Lista definitiva', icono: '✅' },
      { key: 'fecha_examen',      label: 'Examen',           icono: '📝' },
    ];
    opos.forEach(o => {
      OPOS_FECHAS.forEach(f => {
        if (!o[f.key]) return;
        const d = new Date(o[f.key]);
        if (d.getFullYear() === year && d.getMonth() === month) {
          const shortConv = (o.convocatoria || '').slice(0, 22) + ((o.convocatoria || '').length > 22 ? '…' : '');
          eventos.push({ fecha: o[f.key], texto: `${f.label}: ${shortConv}`, tipo: 'opos', color: 'var(--accent2)', icono: f.icono });
        }
      });
    });
  } catch(e) {}

  return eventos;
}

// ── Render del calendario ──
function renderAgendaCalendario() {
  const el = document.getElementById('age-calendario');
  if (!el) return;

  const year = _calYear, month = _calMonth;
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const dias  = ['L','M','X','J','V','S','D'];

  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month+1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Monday=0
  const totalDays= lastDay.getDate();

  const eventos = age_getEventosCalendario(year, month);

  // Agrupar por fecha
  const porDia = {};
  eventos.forEach(ev => {
    const key = ev.fecha?.slice(0,10);
    if (!key) return;
    if (!porDia[key]) porDia[key] = [];
    porDia[key].push(ev);
  });

  const pad = n => String(n).padStart(2,'0');

  // Guardar mapa global para que las celdas puedan referenciarlo al hacer clic
  window._agePorDia = porDia;

  // Construir celdas
  let cells = '';
  // Cabeceras de días
  cells += `<div class="cal-header-row">${dias.map(d => `<div class="cal-dow">${d}</div>`).join('')}</div>`;
  cells += '<div class="cal-grid">';

  // Blancos iniciales
  for (let i = 0; i < startDow; i++) cells += '<div class="cal-cell cal-empty"></div>';

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = `${year}-${pad(month+1)}-${pad(d)}`;
    const esHoy   = dateStr === hoyStr;
    const evs     = porDia[dateStr] || [];
    const MAX_VISIBLE = 3;
    const visible = evs.slice(0, MAX_VISIBLE);
    const resto   = evs.length - MAX_VISIBLE;

    const tooltipData = evs.map(e => `${e.icono} ${e.texto}`).join('\n');

    cells += `<div class="cal-cell${esHoy ? ' cal-today' : ''}${evs.length ? ' cal-has-events cal-cell--click' : ''}"
      title="${tooltipData.replace(/"/g,'&quot;')}"
      onclick="age_seleccionarDia('${dateStr}', this)">
      <span class="cal-day-num">${d}</span>
      <div class="cal-evs">
        ${visible.map(e => `<div class="cal-ev" style="background:${e.color}20;border-left:2px solid ${e.color};color:${e.color}">${e.icono} <span>${e.texto}</span></div>`).join('')}
        ${resto > 0 ? `<div class="cal-ev-more">+${resto} más</div>` : ''}
      </div>
    </div>`;
  }

  cells += '</div>';

  el.innerHTML = `
    <div class="cal-nav">
      <button class="btn-secondary cal-prev" onclick="_calMonth--;if(_calMonth<0){_calMonth=11;_calYear--;}renderAgendaCalendario()">‹</button>
      <span class="cal-titulo">${meses[month]} ${year}</span>
      <button class="btn-secondary cal-next" onclick="_calMonth++;if(_calMonth>11){_calMonth=0;_calYear++;}renderAgendaCalendario()">›</button>
      <button class="btn-secondary" onclick="_calYear=new Date().getFullYear();_calMonth=new Date().getMonth();renderAgendaCalendario()" style="font-size:.75rem;padding:4px 10px;margin-left:8px">Hoy</button>
    </div>
    ${cells}`;

  // Panel de eventos del día seleccionado (hoy por defecto)
  renderAgendaDia(hoyStr, porDia[hoyStr] || []);
}

function renderAgendaDia(dateStr, evs) {
  const el = document.getElementById('age-dia-eventos');
  if (!el) return;
  const fecha = dateStr ? new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' }) : '';
  if (!evs.length) {
    el.innerHTML = `<p style="color:var(--text3);font-size:.85rem">Sin eventos el ${fecha}.</p>`;
    return;
  }
  // Para eventos estructurados, recuperar datos completos
  const structMap = {};
  Store.get('age_eventos_struct', []).forEach(ev => {
    structMap[ev.fecha + '_' + ev.nombre] = ev;
  });

  el.innerHTML = `<div style="font-size:.78rem;color:var(--text3);margin-bottom:8px">${fecha}</div>` +
    evs.map(e => {
      const sk = e._struct ? (e.fecha?.slice(0,10) + '_' + (e.texto?.split(' ')[0] ? e.texto : '')) : null;
      // buscar por fecha + nombre original (antes de añadir hora/ubicación)
      const fullEv = e._struct
        ? Store.get('age_eventos_struct', []).find(s => e.fecha === s.fecha && e.texto.startsWith(s.nombre))
        : null;
      return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)">
        <span style="font-size:1rem;flex-shrink:0">${e.icono}</span>
        <div style="flex:1">
          <div style="font-size:.85rem;color:var(--text1);font-weight:600">${fullEv ? fullEv.nombre : e.texto}</div>
          ${fullEv?.hora ? `<div style="font-size:.75rem;color:var(--text2)">🕐 ${fullEv.hora}</div>` : ''}
          ${fullEv?.ubicacion ? `<div style="font-size:.75rem;color:var(--text2)">📍 ${fullEv.ubicacion}</div>` : ''}
          ${fullEv?.notas ? `<div style="font-size:.75rem;color:var(--text3);margin-top:2px">📝 ${fullEv.notas}</div>` : ''}
          <div style="font-size:.72rem;color:${e.color};font-weight:600;text-transform:uppercase;margin-top:2px">${age_tipoLabel(e.tipo)}</div>
        </div>
      </div>`;
    }).join('');
}

function age_seleccionarDia(dateStr, cell) {
  // Quitar selección anterior
  document.querySelectorAll('.cal-cell--selected').forEach(c => c.classList.remove('cal-cell--selected'));
  if (cell) cell.classList.add('cal-cell--selected');
  const evs = (window._agePorDia || {})[dateStr] || [];
  renderAgendaDia(dateStr, evs);
}

function age_tipoLabel(tipo) {
  const m = { cumple:'Cumpleaños', evento:'Evento', venc:'Vencimiento', 'carnet-test':'Carnet — Test', 'carnet-exam':'Carnet — Examen', 'carnet-prac':'Carnet — Práctica', opos:'Oposiciones' };
  return m[tipo] || tipo;
}

// ── Gastos fijos ──
function renderAgeGastosFijos() {
  const el = document.getElementById('age-gastos-fijos');
  if (!el) return;
  const hoy    = new Date();
  const diaHoy = hoy.getDate();
  const tipoColor = { personal:'var(--red)', conjunta:'var(--pink)', suscripcion:'var(--blue)' };
  const tipoLabel = { personal:'Personal', conjunta:'Conjunta', suscripcion:'Suscripción' };
  const ctaColor  = { KTX:'#60a5fa', RVP:'#a78bfa', RVC:'#f472b6', CTV:'#34d399', BP:'#fbbf24' };

  const todos = typeof fin_getGastosFijos === 'function'
    ? fin_getGastosFijos().filter(g => g.activo)
    : [];

  if (!todos.length) {
    el.innerHTML = '<li style="color:var(--text3)">Sin gastos fijos — añade desde ✏️ Actualizar → Finanzas.</li>';
    return;
  }

  const sorted = [...todos].sort((a, b) => (a.dia || 99) - (b.dia || 99));
  el.innerHTML = sorted.map(g => {
    const dia      = g.dia;
    const esPasado = dia && dia < diaHoy;
    const esHoy    = dia && dia === diaHoy;
    const diaStr   = dia ? (esHoy ? '📍 HOY (día ' + dia + ')' : 'día ' + dia) : '—';
    return `<li style="opacity:${esPasado ? '.45' : '1'};display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--border)">
      <span style="min-width:90px;font-size:.75rem;font-weight:700;color:${esHoy ? 'var(--yellow)' : 'var(--text3)'}">${diaStr}</span>
      <span style="flex:1;font-size:.85rem">${g.nombre}${g.hasta ? ` <span style="font-size:.68rem;color:var(--orange);margin-left:4px">hasta ${g.hasta}</span>` : ''}</span>
      <span style="font-size:.72rem;color:${tipoColor[g.tipo] || 'var(--text3)'};margin-right:4px">${tipoLabel[g.tipo] || ''}</span>
      <span style="font-size:.75rem;color:${ctaColor[g.cuenta] || 'var(--text3)'}">${g.cuenta}</span>
      <span style="font-size:.88rem;font-weight:700;color:var(--red);min-width:70px;text-align:right">-${fmt(g.importe)}</span>
    </li>`;
  }).join('');
}

async function loadAgenda() {
  const local = Store.get('local_agenda');

  // ── Cumpleaños ──
  const cumpleRows = await fetchSheet(CONFIG.SHEETS.AGENDA, 'Cumpleanos!A:B');
  const cumples    = rowsToObjects(cumpleRows);
  const ul1 = document.getElementById('age-cumples');

  const CUMPLE_VENTANA = 60; // días hacia adelante que se muestran
  if (cumples.length) {
    const ordenados = sortByProximity(cumples, 'fecha');
    const proximos = ordenados.filter(c => daysUntil(c.fecha) <= CUMPLE_VENTANA);
    ul1.innerHTML = proximos.length
      ? proximos.map(c => {
          const dias = daysUntil(c.fecha);
          const tag  = dias === 0 ? '🎂 HOY' : dias === 1 ? 'mañana' : dias <= 7 ? `en ${dias}d` : c.fecha;
          return `<li>${c.nombre} <span style="color:var(--accent2);margin-left:auto">${tag}</span></li>`;
        }).join('')
      : `<li style="color:var(--text2)">Ninguno en los próximos ${CUMPLE_VENTANA} días</li>`;
    const prox = ordenados[0];
    const dias = daysUntil(prox.fecha);
    const dashCumple = document.getElementById('dash-cumple');
    if (dashCumple) dashCumple.textContent =
      dias === 0 ? `${prox.nombre} 🎂 HOY` : `${prox.nombre} (${dias === 1 ? 'mañana' : 'en ' + dias + 'd'})`;
  } else if (local.cumples) {
    // Parsear formato "Nombre — DD/MM"
    const lineas = local.cumples.split('\n').filter(l => l.trim());
    const parsed = lineas.map(l => {
      const m = l.match(/(\d{1,2})[\/\-](\d{1,2})/);
      const nombre = l.replace(/[\-—]\s*\d{1,2}[\/\-]\d{1,2}/, '').replace(/\d{1,2}[\/\-]\d{1,2}/, '').trim() || l;
      const fecha  = m ? `${m[1].padStart(2,'0')}/${m[2].padStart(2,'0')}` : null;
      return { nombre, fecha };
    }).filter(c => c.fecha);

    if (parsed.length) {
      const ordenados = sortByProximity(parsed, 'fecha');
      const proximos = ordenados.filter(c => daysUntil(c.fecha) <= CUMPLE_VENTANA);
      ul1.innerHTML = proximos.length
        ? proximos.map(c => {
            const dias = daysUntil(c.fecha);
            const tag  = dias === 0 ? '🎂 HOY' : dias === 1 ? 'mañana' : dias <= 7 ? `en ${dias}d` : c.fecha;
            return `<li>${c.nombre} <span style="color:var(--accent2);margin-left:auto">${tag}</span></li>`;
          }).join('')
        : `<li style="color:var(--text2)">Ninguno en los próximos ${CUMPLE_VENTANA} días</li>`;
      const dashCumple = document.getElementById('dash-cumple');
      if (dashCumple) {
        const prox = ordenados[0];
        const dias = daysUntil(prox.fecha);
        dashCumple.textContent = dias === 0 ? `${prox.nombre} 🎂 HOY` : `${prox.nombre} (${dias <= 1 ? 'mañana' : 'en '+dias+'d'})`;
      }
    } else {
      ul1.innerHTML = lineas.map(l => `<li>${l.trim()}</li>`).join('') || '<li style="color:var(--text2)">Sin cumpleaños</li>';
    }
  } else {
    ul1.innerHTML = '<li style="color:var(--text2)">Sin cumpleaños — añade en ✏️ Actualizar</li>';
  }

  // ── Eventos ──
  const evRows = await fetchSheet(CONFIG.SHEETS.AGENDA, 'Eventos!A:C');
  const eventos = rowsToObjects(evRows);
  const ul2 = document.getElementById('age-eventos');

  // Calcular días hasta una fecha YYYY-MM-DD
  const daysUntilDate = fecha => {
    if (!fecha) return 999;
    const hoy  = new Date(); hoy.setHours(0,0,0,0);
    const dest = new Date(fecha + 'T00:00:00');
    return Math.round((dest - hoy) / 86400000);
  };
  const tagFecha = (fecha, color = 'var(--text2)') => {
    const d = daysUntilDate(fecha);
    const txt = d < 0 ? 'Pasado' : d === 0 ? 'HOY' : d === 1 ? 'Mañana' : `en ${d}d`;
    const c   = d < 0 ? 'var(--text3)' : d === 0 ? 'var(--green)' : d <= 7 ? 'var(--yellow)' : color;
    return `<span style="color:${c};white-space:nowrap;font-size:.78rem;font-weight:${d<=1?700:400};flex-shrink:0;margin-left:auto;padding-left:6px">${txt}</span>`;
  };
  const liItem = (texto, fecha, colorTag) => {
    const d = daysUntilDate(fecha);
    const txt = d < 0 ? 'Pasado' : d === 0 ? 'HOY' : d === 1 ? 'Mañana' : `en ${d}d`;
    const c = d < 0 ? 'var(--text3)' : d === 0 ? 'var(--green)' : d <= 7 ? 'var(--yellow)' : (colorTag || 'var(--text2)');
    return `<li style="flex-direction:column;align-items:flex-start;gap:3px">
      <span style="font-size:.84rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;width:100%;display:block">${texto}</span>
      <span style="font-size:.75rem;font-weight:${d<=1?700:500};color:${c}">${txt}</span>
    </li>`;
  };

  // Preferir struct sobre sheets/local para mayor control
  const struct = Store.get('age_eventos_struct', [])
    .filter(e => e.cat !== 'personal' || !e.notas?.includes('Guardia'))
    .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));

  if (struct.length) {
    const proximos = struct.filter(e => daysUntilDate(e.fecha) >= 0);
    const pasados  = struct.filter(e => daysUntilDate(e.fecha) < 0).reverse(); // más recientes primero
    const liProximos = proximos.map(e =>
      liItem(`${e.nombre}${e.hora ? ' · '+e.hora : ''}`, e.fecha)
    ).join('') || '<li style="color:var(--text2)">Sin eventos próximos</li>';
    const liPasados = pasados.length
      ? `<li style="padding:0;list-style:none"><details style="margin-top:6px"><summary style="cursor:pointer;font-size:.75rem;color:var(--text3);user-select:none">Eventos pasados (${pasados.length})</summary><ul style="margin-top:6px;padding-left:0;list-style:none">${
          pasados.map(e => liItem(`${e.nombre}${e.hora ? ' · '+e.hora : ''}`, e.fecha)).join('')
        }</ul></details></li>`
      : '';
    ul2.innerHTML = liProximos + liPasados;
  } else if (eventos.length) {
    ul2.innerHTML = eventos.map(e => liItem(e.nombre, e.fecha)).join('');
  } else if (local.eventos) {
    const lineas = local.eventos.split('\n').filter(l => l.trim());
    ul2.innerHTML = lineas.map(l => `<li>${l.trim()}</li>`).join('') || '<li style="color:var(--text2)">Sin eventos</li>';
  } else {
    ul2.innerHTML = '<li style="color:var(--text2)">Sin eventos — añade en ✏️ Actualizar</li>';
  }

  // ── Vencimientos ──
  const vencRows = await fetchSheet(CONFIG.SHEETS.AGENDA, 'Vencimientos!A:C');
  const venc = rowsToObjects(vencRows);
  const ul3 = document.getElementById('age-vencimientos');

  // Plazos de inscripción de oposiciones activas (automáticos)
  const oposVenc = (() => {
    try {
      return Store.get('opos_convocatorias', [])
        .filter(o => o.fecha_fin_inscr && daysUntilDate(o.fecha_fin_inscr) >= 0)
        .sort((a, b) => a.fecha_fin_inscr.localeCompare(b.fecha_fin_inscr))
        .map(o => ({ item: `📚 Fin inscr. ${o.convocatoria}`, fecha: o.fecha_fin_inscr }));
    } catch { return []; }
  })();

  // Examen práctico de carnet (automático si tiene fecha futura)
  const carnetVenc = (() => {
    try {
      const cfg = Store.get('car_config');
      if (cfg.prox_fecha && daysUntilDate(cfg.prox_fecha) >= 0)
        return [{ item: '🚗 Examen práctico carnet', fecha: cfg.prox_fecha }];
    } catch { /* noop */ }
    return [];
  })();

  const todosVenc = [
    ...carnetVenc,
    ...oposVenc,
    ...(venc.length ? venc : []),
  ];

  if (todosVenc.length) {
    ul3.innerHTML = todosVenc
      .sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
      .map(v => liItem(v.item, v.fecha, 'var(--yellow)')).join('');
  } else if (local.vencimientos) {
    const lineas = local.vencimientos.split('\n').filter(l => l.trim());
    ul3.innerHTML = lineas.map(l => `<li style="color:var(--yellow)">${l.trim()}</li>`).join('') || '<li style="color:var(--text2)">Sin vencimientos</li>';
  } else {
    ul3.innerHTML = '<li style="color:var(--text2)">Sin vencimientos próximos</li>';
  }

  renderAgendaCalendario();
}

function daysUntil(ddmm) {
  if (!ddmm) return 999;
  const [d, m] = ddmm.split('/').map(Number);
  if (!d || !m) return 999;
  const now  = new Date(); now.setHours(0, 0, 0, 0); // comparar siempre a medianoche
  let next   = new Date(now.getFullYear(), m - 1, d);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.round((next - now) / 86400000);
}

function sortByProximity(arr, field) {
  return [...arr].sort((a, b) => daysUntil(a[field]) - daysUntil(b[field]));
}
