// ─── MÓDULO IT TXARTELAS ───

const IT_MODULOS = [
  { id: 'windows',        nombre: 'Windows 7',          desc: 'Sistema Operativo' },
  { id: 'internet_basico',nombre: 'Internet Básico',    desc: 'Internet y correo básico' },
  { id: 'internet',       nombre: 'Internet Avanzado',  desc: 'Internet y correo avanzado' },
  { id: 'word_basico',    nombre: 'Word Básico',        desc: 'Ofimática Word — nivel básico' },
  { id: 'word_avanzado',  nombre: 'Word Avanzado',      desc: 'Ofimática Word — nivel avanzado' },
  { id: 'excel_basico',   nombre: 'Excel Básico',       desc: 'Hoja de cálculo — nivel básico' },
  { id: 'excel_avanzado', nombre: 'Excel Avanzado',     desc: 'Hoja de cálculo — nivel avanzado' },
  { id: 'powerpoint',     nombre: 'PowerPoint',         desc: 'Presentaciones multimedia' },
  { id: 'access',         nombre: 'Access',             desc: 'Base de datos Microsoft' },
];

// ── Storage ──
function it_getEstados() { return Store.get('it_txartelas_estado', {}); }
function it_saveEstados(d) { Store.set('it_txartelas_estado', d); }

function it_toggle(id) {
  const d = it_getEstados();
  if (d[id]?.estado === 'aprobada') {
    delete d[id];
  } else {
    d[id] = { estado: 'aprobada', fecha: d[id]?.fecha || '' };
  }
  it_saveEstados(d);
  loadItTxartelas();
}

function it_setFecha(id, fecha) {
  const d = it_getEstados();
  if (!d[id]) d[id] = { estado: 'aprobada' };
  d[id].fecha = fecha;
  it_saveEstados(d);
}

// ── API pública para consultar desde oposiciones ──
function it_tieneModulo(id) {
  return it_getEstados()[id]?.estado === 'aprobada';
}

function it_validarRequisitos(reqArr) {
  if (!reqArr?.length) return { ok: true, faltantes: [], nombres: [] };
  const faltantes = reqArr.filter(id => !it_tieneModulo(id));
  const nombres = faltantes.map(id => IT_MODULOS.find(m => m.id === id)?.nombre || id);
  return { ok: faltantes.length === 0, faltantes, nombres };
}

function it_getNombreModulo(id) {
  return IT_MODULOS.find(m => m.id === id)?.nombre || id;
}

// ── Render ──
function loadItTxartelas() {
  const estados = it_getEstados();
  const el = document.getElementById('it-lista');
  if (!el) return;

  const aprobadas = IT_MODULOS.filter(m => estados[m.id]?.estado === 'aprobada').length;
  const total = IT_MODULOS.length;
  const pct = Math.round(aprobadas / total * 100);

  el.innerHTML = `
  <div style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span style="font-size:.82rem;color:var(--text2)">Módulos aprobados</span>
      <span style="font-size:.82rem;font-weight:700;color:${aprobadas===total?'var(--green)':'var(--accent2)'}">${aprobadas} / ${total}</span>
    </div>
    <div style="height:6px;background:var(--bg4);border-radius:99px">
      <div style="height:100%;width:${pct}%;background:var(--green);border-radius:99px;transition:.4s"></div>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:8px">
    ${IT_MODULOS.map(m => {
      const e = estados[m.id] || {};
      const on = e.estado === 'aprobada';
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:${on ? 'rgba(52,211,153,.07)' : 'var(--bg3)'};border:1px solid ${on ? 'rgba(52,211,153,.3)' : 'var(--border)'};border-radius:10px;transition:.2s">
        <button onclick="it_toggle('${m.id}')" title="${on ? 'Desactivar' : 'Activar'}"
          style="flex-shrink:0;width:44px;height:24px;border-radius:99px;border:none;cursor:pointer;position:relative;transition:.25s;background:${on ? 'var(--green)' : 'var(--bg4)'}">
          <span style="position:absolute;top:3px;left:${on ? '23px' : '3px'};width:18px;height:18px;background:#fff;border-radius:50%;transition:.25s;display:block;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>
        </button>
        <div style="flex:1;min-width:0">
          <div style="font-size:.88rem;font-weight:${on ? '700' : '500'};color:${on ? 'var(--text)' : 'var(--text3)'}">${m.nombre}</div>
          <div style="font-size:.7rem;color:var(--text3)">${m.desc}</div>
        </div>
        ${on ? `
        <input type="date" value="${e.fecha || ''}" onchange="it_setFecha('${m.id}', this.value)"
          title="Fecha de aprobación"
          style="padding:4px 7px;border-radius:7px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:.75rem;font-family:inherit;width:130px" />
        ` : ''}
      </div>`;
    }).join('')}
  </div>`;
}
