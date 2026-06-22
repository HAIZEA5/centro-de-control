// ─── FMT — formateadores reutilizables ──────────────────────────────────────

const Fmt = {
  eur:  v => parseFloat(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }),
  eur2: v => parseFloat(v || 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  num:  v => parseFloat(v || 0).toLocaleString('es-ES'),
  pct:  v => `${parseFloat(v || 0).toFixed(1)}%`,
};

function mostrarOk(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2500);
}
