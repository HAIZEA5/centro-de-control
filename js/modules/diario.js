// ─── MÓDULO DIARIO ───
// Guardado en localStorage (privado, solo en este navegador)

const DIARIO_KEY = 'cdc_diario';

function loadDiario() {
  renderDiario();

  document.getElementById('dia-guardar').addEventListener('click', () => {
    const hecho    = document.getElementById('dia-hecho').value.trim();
    const bueno    = document.getElementById('dia-bueno').value.trim();
    const pendiente= document.getElementById('dia-pendiente').value.trim();

    if (!hecho && !bueno && !pendiente) return;

    const entradas = getDiarioEntradas();
    const hoy = new Date().toLocaleDateString('es-ES');

    // Si ya hay entrada de hoy, la reemplaza
    const idx = entradas.findIndex(e => e.fecha === hoy);
    const entrada = { fecha: hoy, hecho, bueno, pendiente };
    if (idx >= 0) entradas[idx] = entrada;
    else entradas.unshift(entrada);

    Store.set(DIARIO_KEY, entradas.slice(0, 365));

    document.getElementById('dia-hecho').value = '';
    document.getElementById('dia-bueno').value = '';
    document.getElementById('dia-pendiente').value = '';
    renderDiario();
  });
}

function getDiarioEntradas() {
  return Store.get(DIARIO_KEY, []);
  catch { return []; }
}

function renderDiario() {
  const entradas = getDiarioEntradas();
  const ul = document.getElementById('dia-lista');
  ul.innerHTML = entradas.map(e => `
    <li>
      <span class="diario-fecha">${e.fecha}</span>
      ${e.hecho    ? `<span class="diario-texto">📌 ${e.hecho}</span>`     : ''}
      ${e.bueno    ? `<span class="diario-texto">✨ ${e.bueno}</span>`     : ''}
      ${e.pendiente? `<span class="diario-texto">⏳ ${e.pendiente}</span>` : ''}
    </li>
  `).join('') || '<li style="color:var(--text2)">Aún no hay entradas</li>';
}
