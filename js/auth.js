// ─── AUTENTICACIÓN SIMPLE ───
const AUTH_KEY = 'cdc_auth';

function isAuthenticated() {
  return localStorage.getItem(AUTH_KEY) === 'ok';
}

function setupAuth() {
  const loginScreen = document.getElementById('loginScreen');
  const mainApp     = document.getElementById('mainApp');
  const loginBtn    = document.getElementById('loginBtn');
  const input       = document.getElementById('passwordInput');
  const error       = document.getElementById('loginError');

  if (isAuthenticated()) {
    loginScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');
    return;
  }

  loginScreen.classList.remove('hidden');
  mainApp.classList.add('hidden');

  function tryLogin() {
    if (input.value === CONFIG.PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'ok');
      loginScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      initApp();
    } else {
      error.textContent = 'Contraseña incorrecta';
      input.value = '';
      input.focus();
      setTimeout(() => { error.textContent = ''; }, 2000);
    }
  }

  loginBtn.addEventListener('click', tryLogin);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
  input.focus();
}
