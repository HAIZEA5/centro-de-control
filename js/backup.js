// ─── BACKUP & SCHEMA ───────────────────────────────────────────────────────

const CDC_SCHEMA_VERSION = 1;

// Prefijos de claves que pertenecen a esta app (se incluyen en el backup)
const CDC_BACKUP_PREFIXES = ['cdc_', 'car_', 'opos_', 'fin_', 'local_', 'piso_', 'tareas_', 'cdc_auth'];

/* ── Migraciones de schema ── */
function cdc_runMigrations() {
  const stored = parseInt(Store.get('cdc_schema_version', 0));
  if (stored >= CDC_SCHEMA_VERSION) return;

  // v1: primera versión — nada que migrar, solo estampar la versión
  Store.set('cdc_schema_version', CDC_SCHEMA_VERSION);
}

/* ── Exportar backup ── */
function cdc_exportBackup() {
  const data = { _exported: new Date().toISOString(), _version: CDC_SCHEMA_VERSION };

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (CDC_BACKUP_PREFIXES.some(p => k.startsWith(p))) {
      data[k] = localStorage.getItem(k);
    }
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `cdc_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  Store.set('cdc_last_backup', Date.now());
  document.getElementById('cdc-backup-banner')?.style.setProperty('display', 'none');
}

/* ── Importar backup ── */
function cdc_importBackup() {
  const input   = document.createElement('input');
  input.type    = 'file';
  input.accept  = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        const fecha = data._exported ? data._exported.split('T')[0] : 'fecha desconocida';
        if (!confirm(`¿Restaurar el backup del ${fecha}?\n\nEsto sobreescribirá todos los datos actuales.`)) return;
        let count = 0;
        Object.entries(data).forEach(([k, v]) => {
          if (!k.startsWith('_')) { localStorage.setItem(k, v); count++; }
        });
        alert(`Backup restaurado correctamente (${count} claves). La página se va a recargar.`);
        location.reload();
      } catch {
        alert('Error: el archivo no es un backup válido de CdC.');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ── Banner de aviso si hace >30 días sin backup ── */
function cdc_checkBackupReminder() {
  const last    = Store.get('cdc_last_backup', 0);
  const diasSin = last ? Math.floor((Date.now() - last) / 86400000) : 999;
  const banner  = document.getElementById('cdc-backup-banner');
  if (banner && diasSin > 30) banner.style.display = 'flex';
}
