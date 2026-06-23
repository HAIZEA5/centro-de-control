// ─── AUTENTICACIÓN SIMPLE ───
const AUTH_KEY = 'cdc_auth';

function isAuthenticated() {
  return true;
}

function setupAuth() {
  document.getElementById('loginScreen')?.classList.add('hidden');
  document.getElementById('mainApp')?.classList.remove('hidden');
}
