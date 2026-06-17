// ─── MÓDULO CASA ───

async function loadCasa() {
  const local = JSON.parse(localStorage.getItem('local_casa') || '{}');

  const [tareaRows, decoRows, mamRows, invRows] = await Promise.all([
    fetchSheet(CONFIG.SHEETS.CASA, 'Tareas!A:B'),
    fetchSheet(CONFIG.SHEETS.CASA, 'Deco!A:B'),
    fetchSheet(CONFIG.SHEETS.CASA, 'Mampara!A:B'),
    fetchSheet(CONFIG.SHEETS.CASA, 'Inventario!A:B'),
  ]);

  const renderLocal = (id, texto, emptymsg) => {
    const ul = document.getElementById(id); if (!ul) return;
    ul.innerHTML = texto
      ? texto.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('') || `<li style="color:var(--text2)">${emptymsg}</li>`
      : `<li style="color:var(--text2)">${emptymsg}</li>`;
  };

  const tareas = rowsToObjects(tareaRows);
  if (tareas.length) {
    const ul = document.getElementById('casa-tareas');
    if (ul) ul.innerHTML = tareas.map(r => `<li>${r.tarea}</li>`).join('');
  } else {
    renderLocal('casa-tareas', local.tareas, 'Sin tareas pendientes');
  }

  const deco = rowsToObjects(decoRows);
  if (deco.length) {
    const ul = document.getElementById('casa-deco');
    if (ul) ul.innerHTML = deco.map(r => `<li>${r.item}</li>`).join('');
  } else {
    renderLocal('casa-deco', local.deco, 'Sin proyectos de deco');
  }

  const inv = rowsToObjects(invRows);
  if (inv.length) {
    const ul = document.getElementById('casa-inventario');
    if (ul) ul.innerHTML = inv.map(r => `<li>${r.item}${r.precio_estimado ? ' — ' + r.precio_estimado + '€' : ''}</li>`).join('');
  } else {
    renderLocal('casa-inventario', local.inventario, 'Sin inventario');
  }

  const mam = rowsToObjects(mamRows);
  const mamEl = document.getElementById('casa-mampara');
  if (mamEl) {
    if (mam.length) mamEl.innerHTML = mam.map(r => `<div><strong>${r.campo}:</strong> ${r.valor}</div>`).join('');
    else if (local.proyecto) mamEl.textContent = local.proyecto;
  }

  // Dashboard
  let pend;
  if (tareas.length) {
    pend = tareas.filter(r => r.estado?.toLowerCase() !== 'hecho').length;
  } else if (local.tareas) {
    pend = local.tareas.split('\n').filter(l => l.trim()).length;
  }
  const dashEl = document.getElementById('dash-casa');
  if (dashEl) dashEl.textContent = pend != null ? (pend ? `${pend} tarea${pend > 1 ? 's' : ''}` : '¡Todo listo!') : '—';
}
