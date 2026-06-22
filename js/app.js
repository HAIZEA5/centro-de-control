// ─── APLICACIÓN PRINCIPAL ───
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof supaInit === 'function') await supaInit();
  setupAuth();
  if (isAuthenticated()) initApp();
});

function initApp() {
  setupNavigation();
  setupMobileMenu();
  loadDashboard();
  loadAllModules();
}

function loadAllModules() {
  loadFinanzas();
  loadPiso();
  loadCarnet();
  loadOposiciones();
  loadAgenda();
  loadTareas();
  loadItTxartelas();
  renderAgeGastosFijos();
}

function setupNavigation() {
  const links    = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('.section');

  links.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const target = link.dataset.section;

      links.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));

      link.classList.add('active');
      document.getElementById(target)?.classList.add('active');

      // Renderizar gráfica de patrimonio cuando la sección finanzas se hace visible
      if (target === 'finanzas' && typeof fin_patrRenderChart === 'function') {
        requestAnimationFrame(() => fin_patrRenderChart());
      }

      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebarOverlay')?.classList.remove('open');
    });
  });
}


function setupMobileMenu() {
  const toggle  = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!toggle || toggle._mobileSetup) return;
  toggle._mobileSetup = true;

  toggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('open');
    overlay?.classList.toggle('open', isOpen);
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });
}
