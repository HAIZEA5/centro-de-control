// ─── SUPABASE SYNC ───────────────────────────────────────────────────────────
// Sincroniza localStorage con Supabase para que los datos sean los mismos
// en todos los dispositivos (móvil, ordenador, etc.)
// ─────────────────────────────────────────────────────────────────────────────

const SUPA_URL = 'https://phxaqfsqmkrsignltkoi.supabase.co';
const SUPA_KEY = 'sb_publishable_oOS3q852QsT2A_bGdkDvag_kCh9xo4E';

// ── Escritura en Supabase (debounced para no saturar) ──────────────────────
const _origSetItem    = Storage.prototype.setItem.bind(localStorage);
const _origRemoveItem = Storage.prototype.removeItem.bind(localStorage);
const _pending = {};

function _supaPush(key, value) {
  clearTimeout(_pending[key]);
  _pending[key] = setTimeout(async () => {
    try {
      await fetch(`${SUPA_URL}/rest/v1/store`, {
        method: 'POST',
        headers: {
          'apikey': SUPA_KEY,
          'Authorization': `Bearer ${SUPA_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
      });
    } catch (e) { /* sin conexión — los datos siguen en localStorage */ }
  }, 800);
}

function _supaDelete(key) {
  try {
    fetch(`${SUPA_URL}/rest/v1/store?key=eq.${encodeURIComponent(key)}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
      },
    });
  } catch (e) { /* sin conexión */ }
}

// Sobreescribe localStorage.setItem / removeItem globalmente
localStorage.setItem = function (key, value) {
  _origSetItem(key, value);
  _supaPush(key, String(value));
};

localStorage.removeItem = function (key) {
  _origRemoveItem(key);
  _supaDelete(key);
};

// ── Carga inicial desde Supabase ───────────────────────────────────────────
async function supaInit() {
  try {
    const res = await fetch(`${SUPA_URL}/rest/v1/store?select=key,value`, {
      headers: {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
      },
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn(`[Supabase] Error ${res.status}:`, err);
      return;
    }
    const rows = await res.json();
    rows.forEach(({ key, value }) => {
      // fin_saldos sin _manual es dato antiguo (Supabase heredado) — JS tiene prioridad
      if (key === 'fin_saldos') {
        try {
          const obj = JSON.parse(value);
          if (!obj._manual) return; // ignorar: los saldos del JS son más recientes
        } catch (e) { return; }
      }
      _origSetItem(key, value);
    });
    console.info(`[Supabase] Sync OK — ${rows.length} clave(s) cargadas`);
  } catch (e) {
    console.warn('[Supabase] Sin conexión, usando datos locales', e);
  }
}

window.supaInit = supaInit;
