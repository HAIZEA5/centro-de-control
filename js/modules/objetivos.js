// ─── MÓDULO OBJETIVOS ───
// Columnas: nombre, emoji, progreso(0-100), descripcion

// Datos por defecto mientras no hay Sheet conectado
const OBJETIVOS_DEFAULT = [
  { nombre: 'Euskera diario', emoji: '🗣️', progreso: 0, descripcion: 'Hablar o estudiar cada día' },
  { nombre: 'Comer variado', emoji: '🥗', progreso: 0, descripcion: 'Ampliar recetario sin gluten' },
  { nombre: 'Journal', emoji: '📝', progreso: 0, descripcion: 'Escribir en el diario' },
  { nombre: 'Menos móvil', emoji: '📵', progreso: 0, descripcion: 'Reducir tiempo de pantalla' },
  { nombre: 'Organización hogar', emoji: '🏠', progreso: 0, descripcion: 'Mantener casa ordenada' },
  { nombre: 'Lectura', emoji: '📖', progreso: 0, descripcion: 'Leer cada día' },
  { nombre: 'Pasos diarios', emoji: '👟', progreso: 0, descripcion: 'Meta: 8.000 pasos/día' },
];

async function loadObjetivos() {
  const rows = await fetchSheet(CONFIG.SHEETS.OBJETIVOS, 'Objetivos!A:D');
  const data = rows ? rowsToObjects(rows) : [];
  const objetivos = data.length ? data : OBJETIVOS_DEFAULT;
  renderObjetivos(objetivos);

  // Dashboard
  const completados = objetivos.filter(o => parseFloat(o.progreso) >= 100).length;
  document.getElementById('dash-objetivos').textContent =
    `${completados}/${objetivos.length} esta semana`;
}

function renderObjetivos(objetivos) {
  const grid = document.getElementById('objetivos-grid');
  grid.innerHTML = objetivos.map(o => {
    const pct = Math.min(100, parseFloat(o.progreso) || 0);
    return `
      <div class="objetivo-card">
        <div class="objetivo-header">
          <span class="objetivo-name">${o.emoji || '🎯'} ${o.nombre}</span>
          <span class="objetivo-pct">${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        ${o.descripcion ? `<p style="font-size:.78rem;color:var(--text2);margin-top:8px">${o.descripcion}</p>` : ''}
      </div>
    `;
  }).join('');
}
