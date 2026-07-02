// ─── APLICACIÓN PRINCIPAL ───
document.addEventListener('DOMContentLoaded', async () => {
  if (typeof supaInit === 'function') await supaInit();
  setupAuth();
  if (isAuthenticated()) initApp();
});

function initApp() {
  cdc_runMigrations();
  setupNavigation();
  setupMobileMenu();
  loadDashboard();
  loadAllModules();
  cdc_checkBackupReminder();
}

function loadAllModules() {
  const modules = [
    loadFinanzas, loadPiso, loadCarnet, loadOposiciones,
    loadAgenda, loadTareas, loadItTxartelas, renderAgeGastosFijos,
  ];
  modules.forEach(fn => {
    try {
      fn();
    } catch (err) {
      console.error(`[CdC] Error cargando ${fn.name}:`, err);
      _cdc_showModuleError(fn.name, err);
    }
  });
}

function _cdc_showModuleError(name, err) {
  // Muestra un aviso visible en lugar de dejar la sección en blanco
  const sectionMap = {
    loadFinanzas:       'fin-resumen-content',
    loadPiso:           'piso-ahorro-bar',
    loadCarnet:         'car-stats-row',
    loadOposiciones:    'opos-lista',
    loadAgenda:         'agenda-content',
    loadTareas:         'tar-bandeja-lista',
  };
  const elId = sectionMap[name];
  if (!elId) return;
  const el = document.getElementById(elId);
  if (el) el.innerHTML = `<p style="color:var(--red);font-size:.82rem;padding:8px 0">⚠️ Error cargando datos (${name}). Abre la consola para más detalles.</p>`;
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
