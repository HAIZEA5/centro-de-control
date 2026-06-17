// ─── MÓDULO LECTURA ───
// Columnas: titulo, autor, estado(leido/leyendo/pendiente), paginas, fecha_fin, mes

async function loadLectura() {
  const rows  = await fetchSheet(CONFIG.SHEETS.LECTURA, 'Libros!A:F');
  const libros = rowsToObjects(rows);

  const leidos   = libros.filter(l => l.estado?.toLowerCase() === 'leido');
  const leyendo  = libros.find(l => l.estado?.toLowerCase() === 'leyendo');
  const pend     = libros.filter(l => l.estado?.toLowerCase() === 'pendiente');

  document.getElementById('lec-leidos').textContent = leidos.length || '—';

  const mesActual = new Date().getMonth() + 1;
  const pags = leidos
    .filter(l => l.fecha_fin && new Date(l.fecha_fin).getMonth() + 1 === mesActual)
    .reduce((s, l) => s + (parseFloat(l.paginas) || 0), 0);
  document.getElementById('lec-paginas').textContent = pags || '—';

  document.getElementById('lec-actual').textContent = leyendo
    ? `${leyendo.titulo}${leyendo.autor ? ' — ' + leyendo.autor : ''}`
    : 'Sin libro activo';

  const ulPend = document.getElementById('lec-pendientes');
  ulPend.innerHTML = pend.map(l => `<li>${l.titulo}${l.autor ? ' <span style="color:var(--text2)">· ' + l.autor + '</span>' : ''}</li>`).join('')
    || '<li style="color:var(--text2)">Sin pendientes</li>';

  const ulLeidos = document.getElementById('lec-leidos-lista');
  ulLeidos.innerHTML = leidos.slice(-10).reverse().map(l => `<li>${l.titulo}</li>`).join('')
    || '<li style="color:var(--text2)">Aún no</li>';
}
