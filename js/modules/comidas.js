// ─── MÓDULO COMIDAS ───
// Hojas: "Planning" (dia, comida, cena), "Recetas" (nombre, tiempo, notas), "Compra" (item, cantidad)

async function loadComidas() {
  const planRows = await fetchSheet(CONFIG.SHEETS.COMIDAS, 'Planning!A:C');
  const plan = rowsToObjects(planRows);
  const ul1 = document.getElementById('com-planning');
  ul1.innerHTML = plan.map(p =>
    `<li><strong>${p.dia}</strong>: ${[p.comida, p.cena].filter(Boolean).join(' · ')}</li>`
  ).join('') || '<li style="color:var(--text2)">Sin planning esta semana</li>';

  const recRows = await fetchSheet(CONFIG.SHEETS.COMIDAS, 'Recetas!A:C');
  const recetas = rowsToObjects(recRows);
  const ul2 = document.getElementById('com-recetas');
  ul2.innerHTML = recetas.map(r => `<li>${r.nombre}${r.tiempo ? ' <span style="color:var(--text2)">· ' + r.tiempo + '</span>' : ''}</li>`).join('')
    || '<li style="color:var(--text2)">Sin recetas</li>';

  const compRows = await fetchSheet(CONFIG.SHEETS.COMIDAS, 'Compra!A:B');
  const compra = rowsToObjects(compRows);
  const ul3 = document.getElementById('com-compra');
  ul3.innerHTML = compra.map(c => `<li>${c.item}${c.cantidad ? ' <span style="color:var(--text2)">× ' + c.cantidad + '</span>' : ''}</li>`).join('')
    || '<li style="color:var(--text2)">Lista vacía</li>';
}
