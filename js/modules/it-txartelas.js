// ─── MÓDULO IT TXARTELAS ───

const IT_MODULOS = [
  { id: 'windows',       nombre: 'Windows',           desc: 'Entorno de escritorio' },
  { id: 'internet',      nombre: 'Internet',          desc: 'Navegación y correo electrónico' },
  { id: 'word_basico',   nombre: 'Word Básico',       desc: 'Tratamiento de textos nivel básico' },
  { id: 'word_avanzado', nombre: 'Word Avanzado',     desc: 'Tratamiento de textos nivel avanzado' },
  { id: 'excel_basico',  nombre: 'Excel Básico',      desc: 'Hojas de cálculo nivel básico' },
  { id: 'excel_avanzado',nombre: 'Excel Avanzado',    desc: 'Hojas de cálculo nivel avanzado' },
  { id: 'powerpoint',    nombre: 'PowerPoint',        desc: 'Presentaciones multimedia' },
  { id: 'access',        nombre: 'Access',            desc: 'Base de datos nivel básico' },
];

// ── Storage ──
function it_getEstados() { return Store.get('it_txartelas_estado', {}); }
function it_saveEstados(d) { Store.set('it_txartelas_estado', d); }

function it_setEstado(id, estado, fecha) {
  const d = it_getEstados();
  if (!estado) { delete d[id]; } else { d[id] = { estado, fecha: fecha || '' }; }
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

// ── Guardar desde la UI ──
function it_guardar(id) {
  const sel  = document.getElementById('it-sel-' + id);
  const inp  = document.getElementById('it-fecha-' + id);
  if (!sel) return;
  it_setEstado(id, sel.value, inp?.value || '');
  loadItTxartelas();
}

// ── Render ──
function loadItTxartelas() {
  const estados = it_getEstados();
  const el = document.getElementById('it-lista');
  if (!el) return;

  const aprobadas = IT_MODULOS.filter(m => estados[m.id]?.estado === 'aprobada').length;
  const total = IT_MODULOS.length;

  el.innerHTML = `
  <div style="margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
    <div style="font-size:.85rem;color:var(--text2)">
      Módulos aprobados: <strong style="color:var(--green)">${aprobadas}</strong> de ${total}
    </div>
    <div style="flex:1;height:6px;background:var(--bg4);border-radius:99px;min-width:80px">
      <div style="height:100%;width:${Math.round(aprobadas/total*100)}%;background:var(--green);border-radius:99px;transition:.3s"></div>
    </div>
  </div>
  <div class="it-grid">
    ${IT_MODULOS.map(m => {
      const e = estados[m.id] || {};
      const color = e.estado === 'aprobada' ? 'var(--green)' : e.estado === 'en_estudio' ? 'var(--yellow)' : 'var(--text3)';
      const icon  = e.estado === 'aprobada' ? '✅' : e.estado === 'en_estudio' ? '📚' : '⬜';
      return `
      <div class="it-card" style="border-color:${e.estado === 'aprobada' ? 'var(--green)' : 'var(--border)'}">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px">
          <div>
            <div style="font-weight:700;font-size:.9rem;color:var(--text)">${icon} ${m.nombre}</div>
            <div style="font-size:.72rem;color:var(--text3);margin-top:2px">${m.desc}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
          <select id="it-sel-${m.id}" onchange="it_guardar('${m.id}')"
            style="flex:1;min-width:110px;padding:5px 8px;border-radius:7px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:.8rem;font-family:inherit">
            <option value="">— Estado —</option>
            <option value="aprobada"   ${e.estado==='aprobada'   ?'selected':''}>✅ Aprobada</option>
            <option value="en_estudio" ${e.estado==='en_estudio' ?'selected':''}>📚 En estudio</option>
            <option value="pendiente"  ${e.estado==='pendiente'  ?'selected':''}>⏳ Pendiente</option>
          </select>
          <input type="date" id="it-fecha-${m.id}" value="${e.fecha||''}" onchange="it_guardar('${m.id}')"
            title="Fecha de aprobación"
            style="padding:5px 8px;border-radius:7px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:.8rem;font-family:inherit" />
        </div>
        ${e.estado === 'aprobada' && e.fecha ? `<div style="font-size:.7rem;color:var(--green);margin-top:6px">📅 ${_fmtFecha(e.fecha)}</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}
