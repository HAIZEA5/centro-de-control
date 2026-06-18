// ─── MÓDULO TAREAS ───

function tareas_getNotas()  { return Store.get('notas_rapidas', ''); }
function tareas_getCorto()  { return Store.get('tareas_corto', []); }
function tareas_getLargo()  { return Store.get('tareas_largo', []); }

function tareas_guardarNotas() {
  const txt = document.getElementById('tar-notas-txt')?.value || '';
  Store.set('notas_rapidas', txt);
  mostrarOk('tar-notas-ok');
}

function tareas_addCorto(e) {
  if (e && e.key && e.key !== 'Enter') return;
  const inp = document.getElementById('tar-corto-input');
  const texto = inp?.value?.trim();
  if (!texto) return;
  const lista = tareas_getCorto();
  lista.push({ id: Date.now(), texto, completada: false, creada: new Date().toISOString() });
  Store.set('tareas_corto', lista);
  if (inp) inp.value = '';
  _renderTarCorto();
}

function tareas_addLargo(e) {
  if (e && e.key && e.key !== 'Enter') return;
  const inp = document.getElementById('tar-largo-input');
  const texto = inp?.value?.trim();
  if (!texto) return;
  const lista = tareas_getLargo();
  lista.push({ id: Date.now(), texto, completada: false, creada: new Date().toISOString() });
  Store.set('tareas_largo', lista);
  if (inp) inp.value = '';
  _renderTarLargo();
}

function tareas_completarCorto(id) {
  const lista = tareas_getCorto();
  const idx = lista.findIndex(t => t.id === id);
  if (idx === -1) return;
  lista[idx].completada = true;
  lista[idx].completada_en = new Date().toISOString();
  Store.set('tareas_corto', lista);
  _renderTarCorto();
}

function tareas_borrarCorto(id) {
  Store.set('tareas_corto', tareas_getCorto().filter(t => t.id !== id));
  _renderTarCorto();
}

function tareas_borrarLargo(id) {
  Store.set('tareas_largo', tareas_getLargo().filter(t => t.id !== id));
  _renderTarLargo();
}

function tareas_completarLargo(id) {
  const lista = tareas_getLargo();
  const idx = lista.findIndex(t => t.id === id);
  if (idx === -1) return;
  lista[idx].completada = !lista[idx].completada;
  Store.set('tareas_largo', lista);
  _renderTarLargo();
}

function tareas_limpiarCompletadas() {
  Store.set('tareas_corto', tareas_getCorto().filter(t => !t.completada));
  _renderTarCorto();
}

function _renderTarCorto() {
  const el = document.getElementById('tar-corto-lista');
  if (!el) return;
  const lista = tareas_getCorto();
  const pendientes  = lista.filter(t => !t.completada);
  const completadas = lista.filter(t => t.completada);

  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Sin tareas. Añade una arriba.</p>';
    return;
  }

  const itemHTML = (t, opts = {}) => `
    <div class="tar-item ${t.completada ? 'tar-item--done' : ''}" style="animation:fadeIn .2s">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;min-width:0">
        <input type="checkbox" ${t.completada ? 'checked' : ''} onchange="${opts.onCheck || ''}"
          style="width:16px;height:16px;accent-color:var(--green);cursor:pointer;flex-shrink:0" />
        <span style="${t.completada ? 'text-decoration:line-through;color:var(--text3)' : 'color:var(--text)'}">${t.texto}</span>
      </label>
      <button onclick="${opts.onDelete || ''}"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem;padding:2px 6px;flex-shrink:0">✕</button>
    </div>`;

  el.innerHTML = pendientes.map(t => itemHTML(t, {
    onCheck: `tareas_completarCorto(${t.id})`,
    onDelete: `tareas_borrarCorto(${t.id})`,
  })).join('');

  if (completadas.length) {
    el.innerHTML += `
    <details style="margin-top:14px">
      <summary style="font-size:.78rem;color:var(--text3);cursor:pointer;user-select:none">
        ${completadas.length} tarea${completadas.length !== 1 ? 's' : ''} completada${completadas.length !== 1 ? 's' : ''}
        <button onclick="event.preventDefault();tareas_limpiarCompletadas()"
          style="margin-left:10px;background:none;border:1px solid var(--border);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:.72rem;color:var(--text3)">
          Limpiar
        </button>
      </summary>
      <div style="margin-top:8px;opacity:.6">
        ${completadas.map(t => itemHTML(t, {
          onCheck: `tareas_borrarCorto(${t.id})`,
          onDelete: `tareas_borrarCorto(${t.id})`,
        })).join('')}
      </div>
    </details>`;
  }
}

function _renderTarLargo() {
  const el = document.getElementById('tar-largo-lista');
  if (!el) return;
  const lista = tareas_getLargo();

  if (!lista.length) {
    el.innerHTML = '<p style="color:var(--text3);font-size:.85rem;padding:8px 0">Sin objetivos definidos. Añade uno arriba.</p>';
    return;
  }

  el.innerHTML = lista.map(t => `
    <div class="tar-item ${t.completada ? 'tar-item--done' : ''}">
      <label style="display:flex;align-items:center;gap:10px;cursor:pointer;flex:1;min-width:0">
        <input type="checkbox" ${t.completada ? 'checked' : ''} onchange="tareas_completarLargo(${t.id})"
          style="width:16px;height:16px;accent-color:var(--accent2);cursor:pointer;flex-shrink:0" />
        <span style="${t.completada ? 'text-decoration:line-through;color:var(--text3)' : 'color:var(--text)'}">${t.texto}</span>
      </label>
      <button onclick="tareas_borrarLargo(${t.id})"
        style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:.85rem;padding:2px 6px;flex-shrink:0">✕</button>
    </div>`).join('');
}

function loadTareas() {
  const notasEl = document.getElementById('tar-notas-txt');
  if (notasEl) notasEl.value = tareas_getNotas();
  _renderTarCorto();
  _renderTarLargo();
}
