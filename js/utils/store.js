// ─── STORE — wrapper de localStorage ────────────────────────────────────────
// Elimina la duplicación de JSON.parse / JSON.stringify en todo el proyecto.
// Store.get  → lee y parsea (devuelve el default si no existe o hay error)
// Store.set  → serializa y guarda (también dispara el sync con Supabase)
// ─────────────────────────────────────────────────────────────────────────────

const Store = {
  get(key, def = {}) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : def;
    } catch {
      return def;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};
