// ─── MÓDULO CROCHET ───
// Hojas: "Proyectos" (nombre, estado, coste), "Material" (item, cantidad), "Ideas" (idea)

async function loadCrochet() {
  const projRows = await fetchSheet(CONFIG.SHEETS.CROCHET, 'Proyectos!A:C');
  const proyectos = rowsToObjects(projRows).filter(r => r.estado?.toLowerCase() !== 'terminado');
  const ul1 = document.getElementById('cro-curso');
  ul1.innerHTML = proyectos.map(p =>
    `<li>${p.nombre} <span style="color:var(--text2);margin-left:auto">${p.coste ? p.coste + '€' : ''}</span></li>`
  ).join('') || '<li style="color:var(--text2)">Sin proyectos activos</li>';

  const matRows = await fetchSheet(CONFIG.SHEETS.CROCHET, 'Material!A:B');
  const material = rowsToObjects(matRows);
  const ul2 = document.getElementById('cro-material');
  ul2.innerHTML = material.map(m => `<li>${m.item} <span style="color:var(--text2);margin-left:auto">${m.cantidad}</span></li>`).join('')
    || '<li style="color:var(--text2)">Sin inventario</li>';

  const ideaRows = await fetchSheet(CONFIG.SHEETS.CROCHET, 'Ideas!A:A');
  const ideas = rowsToObjects(ideaRows);
  const ul3 = document.getElementById('cro-ideas');
  ul3.innerHTML = ideas.map(i => `<li>${i.idea}</li>`).join('')
    || '<li style="color:var(--text2)">Sin ideas guardadas</li>';
}
