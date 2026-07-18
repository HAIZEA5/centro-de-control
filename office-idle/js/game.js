(() => {
  'use strict';

  const SAVE_KEY = 'dmi-save-v1';
  const COST_GROWTH = 1.15;
  const AUTOSAVE_MS = 10000;
  const TICK_MS = 200;
  const OFFLINE_CAP_S = 3 * 60 * 60;

  // ─── DATA ───────────────────────────────────────────────────────────────

  const EMPLOYEES = [
    { id: 'kevin',   name: 'Kevin Malone',     emoji: '🍫', role: 'Contable júnior',        quote: '"Trato de hacer mi trabajo bien, y también trato de comer mucho chile."', baseCost: 15,           baseCps: 0.1 },
    { id: 'meredith',name: 'Meredith Palmer',  emoji: '🍷', role: 'Suministros',            quote: '"No es que tenga un problema. Es que ustedes tienen un problema con mi problema."', baseCost: 100,          baseCps: 1 },
    { id: 'creed',   name: 'Creed Bratton',    emoji: '👴', role: 'Control de Calidad',     quote: '"No sé qué está pasando aquí, pero quiero ser parte de ello."', baseCost: 550,          baseCps: 5 },
    { id: 'ryan',    name: 'Ryan Howard',      emoji: '💼', role: 'Becario',                quote: '"Voy a ser el Steve Jobs del papel."', baseCost: 3000,         baseCps: 25 },
    { id: 'kelly',   name: 'Kelly Kapoor',     emoji: '💅', role: 'Atención al cliente',    quote: '"Callaos todos, está sonando mi canción."', baseCost: 15000,        baseCps: 110 },
    { id: 'toby',    name: 'Toby Flenderson',  emoji: '😔', role: 'Recursos Humanos',       quote: '"En un mundo justo, nada de esto habría pasado."', baseCost: 75000,        baseCps: 500 },
    { id: 'phyllis', name: 'Phyllis Vance',    emoji: '🧶', role: 'Ventas',                 quote: '"He estado vendiendo papel más tiempo que Michael en esta empresa."', baseCost: 350000,       baseCps: 2200 },
    { id: 'stanley', name: 'Stanley Hudson',   emoji: '🧩', role: 'Ventas',                 quote: '"Ya me he jubilado mentalmente."', baseCost: 1600000,      baseCps: 10000 },
    { id: 'angela',  name: 'Angela Martin',    emoji: '🐱', role: 'Contabilidad jefa',      quote: '"Los gatos nunca me han decepcionado como las personas."', baseCost: 7500000,      baseCps: 45000 },
    { id: 'oscar',   name: 'Oscar Martinez',   emoji: '📊', role: 'Contabilidad',           quote: '"En realidad no es así como funciona."', baseCost: 35000000,     baseCps: 200000 },
    { id: 'andy',    name: 'Andy Bernard',     emoji: '🎵', role: 'Ventas (Cornell)',       quote: '"¡Fiesta de camisa naranja!"', baseCost: 165000000,    baseCps: 900000 },
    { id: 'dwight',  name: 'Dwight Schrute',   emoji: '🥕', role: 'Subgerente Regional',    quote: '"Falso. Osos, remolachas, Battlestar Galactica."', baseCost: 800000000,    baseCps: 4000000 },
    { id: 'jim',     name: 'Jim Halpert',      emoji: '😏', role: 'Ventas',                 quote: '"La mitad del tiempo vendo papel. La otra mitad, gasto bromas a Dwight."', baseCost: 3800000000,   baseCps: 18000000 },
    { id: 'pam',     name: 'Pam Beesly',       emoji: '🎨', role: 'Recepción / Arte',       quote: '"Creo firmemente que esta oficina debería estar más limpia."', baseCost: 18000000000,  baseCps: 80000000 },
    { id: 'michael', name: 'Michael Scott',    emoji: '🌎', role: 'Gerente Regional',       quote: '"No soy el mejor jefe... pero soy el jefe más regional del mundo."', baseCost: 85000000000,  baseCps: 360000000 },
  ];

  const EMPLOYEE_UPGRADES = EMPLOYEES.map((e, i) => ({
    id: 'emp_' + e.id,
    empIndex: i,
    reqOwned: 10,
    cost: e.baseCost * 12,
    name: 'Café doble para ' + e.name,
    desc: 'Duplica la producción de ' + e.name + '.',
    emoji: '☕',
    mult: 2,
  }));

  const GLOBAL_UPGRADES = [
    { id: 'g_jelly',    name: 'Grapadora en gelatina', emoji: '🍮', desc: 'Jim ataca de nuevo. Duplica el poder de clic.', cost: 500, type: 'click', mult: 2 },
    { id: 'g_dundies',  name: 'Fiesta de los Dundies', emoji: '🏆', desc: 'Toda la producción +10%.', cost: 10000, type: 'global', mult: 1.10 },
    { id: 'g_prison',   name: 'Charla de Prison Mike', emoji: '🎤', desc: 'Poder de clic x3.', cost: 2000000, type: 'click', mult: 3 },
    { id: 'g_threat',   name: 'Estreno de Threat Level Midnight', emoji: '🎬', desc: 'Toda la producción +20%.', cost: 20000000, type: 'global', mult: 1.20 },
    { id: 'g_diversity',name: 'Diversity Day, segunda edición', emoji: '🌈', desc: 'Toda la producción +15%.', cost: 150000000, type: 'global', mult: 1.15 },
    { id: 'g_beet',     name: 'Subvención de Schrute Farms', emoji: '🥕', desc: 'Toda la producción +20%.', cost: 1000000000, type: 'global', mult: 1.20 },
    { id: 'g_mspc',     name: 'Michael Scott Paper Company', emoji: '📎', desc: 'Producción +25% y poder de clic x2.', cost: 10000000000, type: 'both', mult: 1.25, clickMult: 2 },
    { id: 'g_dundie2',  name: 'Premio al Mejor Jefe del Mundo', emoji: '🏅', desc: 'Toda la producción +30%.', cost: 90000000000, type: 'global', mult: 1.30 },
  ];

  const ACHIEVEMENTS = [
    { id: 'a1',  name: 'Primer día en Dunder Mifflin', desc: 'Gana tu primer dólar.', icon: '📎', check: s => s.lifetimeEarned >= 1 },
    { id: 'a2',  name: 'Vendedor amateur', desc: 'Gana 1.000 $ en total.', icon: '💵', check: s => s.lifetimeEarned >= 1000 },
    { id: 'a3',  name: 'Regional Manager', desc: 'Gana 1.000.000 $ en total.', icon: '📈', check: s => s.lifetimeEarned >= 1e6 },
    { id: 'a4',  name: 'Imperio del papel', desc: 'Gana 1.000.000.000 $ en total.', icon: '🏢', check: s => s.lifetimeEarned >= 1e9 },
    { id: 'a5',  name: 'Corporate no puede pararte', desc: 'Gana 1 billón de $ en total.', icon: '🏙️', check: s => s.lifetimeEarned >= 1e12 },
    { id: 'a6',  name: 'Contrata a Kevin', desc: 'Ficha a tu primer empleado.', icon: '🍫', check: s => s.employees.kevin >= 1 },
    { id: 'a7',  name: 'Equipo completo', desc: 'Ten al menos 1 de cada empleado.', icon: '👥', check: s => EMPLOYEES.every(e => (s.employees[e.id] || 0) >= 1) },
    { id: 'a8',  name: 'Ejército de Dwights', desc: 'Contrata 25 Dwights.', icon: '🥕', check: s => (s.employees.dwight || 0) >= 25 },
    { id: 'a9',  name: 'Dedo ágil', desc: 'Haz clic 100 veces.', icon: '👆', check: s => s.clicks >= 100 },
    { id: 'a10', name: 'Dedo de acero', desc: 'Haz clic 1.000 veces.', icon: '🖱️', check: s => s.clicks >= 1000 },
    { id: 'a11', name: 'Nunca dejes de hacer clic', desc: 'Haz clic 10.000 veces.', icon: '⚡', check: s => s.clicks >= 10000 },
    { id: 'a12', name: 'Primera venta a Corporate', desc: 'Realiza tu primer prestigio.', icon: '📊', check: s => s.prestigeCount >= 1 },
    { id: 'a13', name: 'Accionista', desc: 'Consigue 10 Acciones de Sabre.', icon: '📉', check: s => s.prestigePoints >= 10 },
    { id: 'a14', name: 'Magnate de Sabre', desc: 'Consigue 50 Acciones de Sabre.', icon: '💎', check: s => s.prestigePoints >= 50 },
    { id: 'a15', name: 'Todas las mejoras globales', desc: 'Compra todas las mejoras globales.', icon: '⭐', check: s => GLOBAL_UPGRADES.every(u => s.globalUpgrades[u.id]) },
    { id: 'a16', name: 'El jefe más regional del mundo', desc: 'Ficha a Michael Scott.', icon: '🌎', check: s => (s.employees.michael || 0) >= 1 },
    { id: 'a17', name: 'That\'s what she said', desc: 'Haz clic 500 veces.', icon: '😏', check: s => s.clicks >= 500 },
  ];

  const EVENTS = [
    { weight: 3, text: '🎉 ¡Fiesta improvisada en la sala de descanso! Producción x2 durante 20s.', apply: s => addBuff('cps', 2, 20) },
    { weight: 2, text: '🏆 Ganas un Dundie. Producción +25% durante 30s.', apply: s => addBuff('cps', 1.25, 30) },
    { weight: 2, text: '🎤 Prison Mike anima a la oficina. Poder de clic x2 durante 15s.', apply: s => addBuff('click', 2, 15) },
    { weight: 2, text: '💰 Encuentras un cheque perdido de Kevin bajo el escritorio.', apply: s => { const bonus = Math.max(50, totalCps() * 30); addMoney(bonus); } },
    { weight: 1, text: '🔥 Dwight activa la alarma de incendios. Evacuación: producción -50% durante 8s.', apply: s => addBuff('cps', 0.5, 8) },
    { weight: 1, text: '📠 La fotocopiadora se atasca. Poder de clic -50% durante 10s.', apply: s => addBuff('click', 0.5, 10) },
  ];

  const QUOTES = [
    '"No soy el mejor jefe... pero soy el jefe más regional del mundo." — Michael',
    '"Identity theft is not a joke, Jim. Millones de familias sufren cada año." — Dwight',
    '"Bears. Beets. Battlestar Galactica." — Dwight',
    '"Callaos todos, está sonando mi canción." — Kelly',
    '"Ya me he jubilado mentalmente." — Stanley',
    '"No sé qué está pasando aquí, pero quiero ser parte de ello." — Creed',
    '"En un mundo justo, nada de esto habría pasado." — Toby',
    '"Fiesta de camisa naranja." — Andy',
    '"Trato de hacer mi trabajo bien, y también trato de comer mucho chile." — Kevin',
    '"Soy Beyoncé, siempre." — Michael',
  ];

  // ─── STATE ──────────────────────────────────────────────────────────────

  function defaultState() {
    const employees = {};
    EMPLOYEES.forEach(e => employees[e.id] = 0);
    return {
      money: 0,
      runEarned: 0,
      lifetimeEarned: 0,
      clicks: 0,
      employees,
      employeeUpgrades: {},
      globalUpgrades: {},
      achievements: {},
      prestigePoints: 0,
      prestigeCount: 0,
      lastSeen: Date.now(),
    };
  }

  let state = loadState();
  let buffs = [];

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const def = defaultState();
      return Object.assign(def, parsed, {
        employees: Object.assign(def.employees, parsed.employees || {}),
        employeeUpgrades: parsed.employeeUpgrades || {},
        globalUpgrades: parsed.globalUpgrades || {},
        achievements: parsed.achievements || {},
      });
    } catch (e) {
      console.error('No se pudo cargar la partida', e);
      return defaultState();
    }
  }

  function saveState() {
    state.lastSeen = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  // ─── FORMULAS ───────────────────────────────────────────────────────────

  function employeeCost(idx) {
    const e = EMPLOYEES[idx];
    const owned = state.employees[e.id] || 0;
    return Math.ceil(e.baseCost * Math.pow(COST_GROWTH, owned));
  }

  function globalMultiplier() {
    let mult = 1 + state.prestigePoints * 0.02;
    GLOBAL_UPGRADES.forEach(u => {
      if (state.globalUpgrades[u.id] && (u.type === 'global' || u.type === 'both')) mult *= u.mult;
    });
    const unlockedAch = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
    mult *= (1 + unlockedAch * 0.005);
    buffs.forEach(b => { if (b.kind === 'cps') mult *= b.mult; });
    return mult;
  }

  function clickMultiplier() {
    let mult = 1;
    GLOBAL_UPGRADES.forEach(u => {
      if (state.globalUpgrades[u.id]) {
        if (u.type === 'click') mult *= u.mult;
        if (u.type === 'both') mult *= u.clickMult;
      }
    });
    buffs.forEach(b => { if (b.kind === 'click') mult *= b.mult; });
    return mult;
  }

  function employeeCps(idx) {
    const e = EMPLOYEES[idx];
    const owned = state.employees[e.id] || 0;
    if (owned <= 0) return 0;
    let base = owned * e.baseCps;
    const upg = EMPLOYEE_UPGRADES[idx];
    if (state.employeeUpgrades[upg.id]) base *= upg.mult;
    return base;
  }

  function totalCps() {
    let sum = 0;
    for (let i = 0; i < EMPLOYEES.length; i++) sum += employeeCps(i);
    return sum * globalMultiplier();
  }

  function clickValue() {
    return 1 * clickMultiplier() * globalMultiplier();
  }

  function addMoney(amount) {
    state.money += amount;
    state.runEarned += amount;
    state.lifetimeEarned += amount;
  }

  function addBuff(kind, mult, seconds) {
    buffs.push({ kind, mult, expires: Date.now() + seconds * 1000 });
  }

  function activeBuffMultiplier(kind) {
    let m = 1;
    buffs.forEach(b => { if (b.kind === kind) m *= b.mult; });
    return m;
  }

  function prestigeGain(runEarned) {
    return Math.floor(Math.sqrt(Math.max(0, runEarned) / 1e7));
  }

  // ─── NUMBER FORMAT ──────────────────────────────────────────────────────

  const UNITS = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function fmt(n) {
    if (n === undefined || n === null || isNaN(n)) return '0';
    const sign = n < 0 ? '-' : '';
    n = Math.abs(n);
    if (n < 1000) return sign + (Number.isInteger(n) ? n : n.toFixed(1));
    let tier = Math.floor(Math.log10(n) / 3);
    if (tier >= UNITS.length) tier = UNITS.length - 1;
    const scaled = n / Math.pow(10, tier * 3);
    return sign + scaled.toFixed(2) + UNITS[tier];
  }
  function fmtMoney(n) { return fmt(n) + ' $'; }

  // ─── DOM REFS ───────────────────────────────────────────────────────────

  const $ = sel => document.querySelector(sel);
  const statMoney = $('#statMoney');
  const statCps = $('#statCps');
  const statPrestige = $('#statPrestige');
  const prestigeStatBlock = $('#prestigeStatBlock');
  const clickPowerLabel = $('#clickPowerLabel');
  const clickBtn = $('#clickBtn');
  const floatContainer = $('#floatContainer');
  const employeeListEl = $('#employeeList');
  const upgradeListEl = $('#upgradeList');
  const achievementListEl = $('#achievementList');
  const officeSummaryEl = $('#officeSummary');
  const eventToast = $('#eventToast');
  const michaelQuote = $('#michaelQuote');

  // ─── TABS ───────────────────────────────────────────────────────────────

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('#panel-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'empleados') renderEmployees();
      if (btn.dataset.tab === 'mejoras') renderUpgrades();
      if (btn.dataset.tab === 'logros') renderAchievements();
      if (btn.dataset.tab === 'corporate') renderPrestige();
    });
  });

  // ─── CLICK ──────────────────────────────────────────────────────────────

  clickBtn.addEventListener('click', ev => {
    const gain = clickValue();
    addMoney(gain);
    state.clicks++;
    spawnFloat(gain, ev);
    checkAchievements();
  });

  function spawnFloat(amount, ev) {
    const rect = clickBtn.getBoundingClientRect();
    const parentRect = floatContainer.getBoundingClientRect();
    const x = (ev.clientX || (rect.left + rect.width / 2)) - parentRect.left;
    const y = (ev.clientY || (rect.top + rect.height / 2)) - parentRect.top;
    const el = document.createElement('div');
    el.className = 'float-number';
    el.textContent = '+' + fmtMoney(amount);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    floatContainer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ─── EMPLOYEES RENDER ───────────────────────────────────────────────────

  function renderEmployees() {
    employeeListEl.innerHTML = '';
    EMPLOYEES.forEach((e, idx) => {
      const owned = state.employees[e.id] || 0;
      const cost = employeeCost(idx);
      const affordable = state.money >= cost;
      const card = document.createElement('div');
      card.className = 'employee-card' + (affordable ? ' affordable' : '');
      card.innerHTML = `
        <div class="emp-emoji">${e.emoji}</div>
        <div class="emp-info">
          <div class="emp-name">${e.name} ${owned > 0 ? `<span class="emp-owned-badge">x${owned}</span>` : ''}</div>
          <div class="emp-role">${e.role}</div>
          <div class="emp-quote">${e.quote}</div>
          <div class="emp-stats">Produce ${fmtMoney(employeeCps(idx))}/s ${owned > 0 ? `&middot; ${fmtMoney(e.baseCps)}/s cada uno` : ''}</div>
        </div>
        <button class="emp-buy-btn" ${affordable ? '' : 'disabled'}>Contratar<br>${fmtMoney(cost)}</button>
      `;
      card.querySelector('.emp-buy-btn').addEventListener('click', () => buyEmployee(idx));
      employeeListEl.appendChild(card);
    });
  }

  function buyEmployee(idx) {
    const cost = employeeCost(idx);
    if (state.money < cost) return;
    state.money -= cost;
    const e = EMPLOYEES[idx];
    state.employees[e.id] = (state.employees[e.id] || 0) + 1;
    renderEmployees();
    checkAchievements();
    saveState();
  }

  // ─── UPGRADES RENDER ────────────────────────────────────────────────────

  function renderUpgrades() {
    upgradeListEl.innerHTML = '';

    GLOBAL_UPGRADES.forEach(u => {
      const bought = !!state.globalUpgrades[u.id];
      const affordable = state.money >= u.cost;
      const card = document.createElement('div');
      card.className = 'upgrade-card' + (bought ? ' bought' : '');
      card.innerHTML = `
        <div class="upg-emoji">${u.emoji}</div>
        <div class="upg-name">${u.name}</div>
        <div class="upg-desc">${u.desc}</div>
        ${bought ? '<span class="upg-bought-label">✔ Comprada</span>' : `<button class="upg-btn" ${affordable ? '' : 'disabled'}>Comprar &middot; ${fmtMoney(u.cost)}</button>`}
      `;
      if (!bought) card.querySelector('.upg-btn').addEventListener('click', () => buyGlobalUpgrade(u));
      upgradeListEl.appendChild(card);
    });

    EMPLOYEE_UPGRADES.forEach(u => {
      const e = EMPLOYEES[u.empIndex];
      const owned = state.employees[e.id] || 0;
      if (owned < 1) return;
      const bought = !!state.employeeUpgrades[u.id];
      const unlocked = owned >= u.reqOwned;
      const affordable = state.money >= u.cost;
      const card = document.createElement('div');
      card.className = 'upgrade-card' + (bought ? ' bought' : '') + (!unlocked ? ' locked' : '');
      card.innerHTML = `
        <div class="upg-emoji">${u.emoji}</div>
        <div class="upg-name">${u.name}</div>
        <div class="upg-desc">${u.desc}</div>
        ${bought
          ? '<span class="upg-bought-label">✔ Comprada</span>'
          : unlocked
            ? `<button class="upg-btn" ${affordable ? '' : 'disabled'}>Comprar &middot; ${fmtMoney(u.cost)}</button>`
            : `<span class="upg-bought-label" style="color:var(--text3)">Requiere ${u.reqOwned}x ${e.name}</span>`
        }
      `;
      if (!bought && unlocked) card.querySelector('.upg-btn').addEventListener('click', () => buyEmployeeUpgrade(u));
      upgradeListEl.appendChild(card);
    });
  }

  function buyGlobalUpgrade(u) {
    if (state.globalUpgrades[u.id] || state.money < u.cost) return;
    state.money -= u.cost;
    state.globalUpgrades[u.id] = true;
    renderUpgrades();
    checkAchievements();
    saveState();
  }

  function buyEmployeeUpgrade(u) {
    if (state.employeeUpgrades[u.id] || state.money < u.cost) return;
    state.money -= u.cost;
    state.employeeUpgrades[u.id] = true;
    renderUpgrades();
    saveState();
  }

  // ─── ACHIEVEMENTS ───────────────────────────────────────────────────────

  function checkAchievements() {
    let newlyUnlocked = null;
    ACHIEVEMENTS.forEach(a => {
      if (!state.achievements[a.id] && a.check(state)) {
        state.achievements[a.id] = true;
        newlyUnlocked = a;
      }
    });
    if (newlyUnlocked) {
      showToast(`🏆 Logro desbloqueado: ${newlyUnlocked.name}`);
      if ($('#panel-logros').classList.contains('active')) renderAchievements();
    }
  }

  function renderAchievements() {
    achievementListEl.innerHTML = '';
    ACHIEVEMENTS.forEach(a => {
      const unlocked = !!state.achievements[a.id];
      const card = document.createElement('div');
      card.className = 'ach-card' + (unlocked ? ' unlocked' : '');
      card.innerHTML = `
        <div class="ach-icon">${unlocked ? a.icon : '🔒'}</div>
        <div>
          <div class="ach-name">${a.name}</div>
          <div class="ach-desc">${a.desc}</div>
        </div>
      `;
      achievementListEl.appendChild(card);
    });
  }

  // ─── PRESTIGE ───────────────────────────────────────────────────────────

  function renderPrestige() {
    const gain = prestigeGain(state.runEarned);
    $('#prestigeGainPreview').textContent = `+${gain} ${gain === 1 ? 'acción' : 'acciones'}`;
    $('#prestigeDetail').textContent = gain > 0
      ? 'Vende la sucursal a Corporate y reinicia el dinero y los empleados a cambio de un bonus permanente.'
      : `Necesitas ganar más dinero en esta partida para conseguir tu primera acción (llevas ${fmtMoney(state.runEarned)}).`;
    $('#prestigeCurrent').textContent = fmt(state.prestigePoints);
    $('#prestigeBonus').textContent = '+' + Math.round(state.prestigePoints * 2) + '%';
    $('#prestigeCount').textContent = fmt(state.prestigeCount);
    const btn = $('#prestigeBtn');
    btn.disabled = gain <= 0;
  }

  $('#prestigeBtn').addEventListener('click', () => {
    const gain = prestigeGain(state.runEarned);
    if (gain <= 0) return;
    if (!confirm(`¿Vender la sucursal a Corporate? Ganarás ${gain} Acciones de Sabre pero perderás el dinero y los empleados de esta partida (las mejoras y logros se conservan).`)) return;
    state.prestigePoints += gain;
    state.prestigeCount += 1;
    state.money = 0;
    state.runEarned = 0;
    EMPLOYEES.forEach(e => state.employees[e.id] = 0);
    buffs = [];
    checkAchievements();
    renderPrestige();
    renderEmployees();
    renderUpgrades();
    saveState();
    showToast('📈 ¡Trato cerrado con Corporate! Acciones de Sabre: ' + fmt(state.prestigePoints));
  });

  // ─── TOASTS / EVENTS ────────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(text) {
    eventToast.textContent = text;
    eventToast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => eventToast.classList.add('hidden'), 4200);
  }

  let nextEventAt = Date.now() + randRange(45, 90) * 1000;
  function randRange(a, b) { return a + Math.random() * (b - a); }

  function maybeTriggerEvent() {
    if (Date.now() < nextEventAt) return;
    nextEventAt = Date.now() + randRange(60, 130) * 1000;
    const totalWeight = EVENTS.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * totalWeight;
    for (const ev of EVENTS) {
      r -= ev.weight;
      if (r <= 0) {
        ev.apply(state);
        showToast(ev.text);
        break;
      }
    }
  }

  // ─── SETTINGS ───────────────────────────────────────────────────────────

  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dunder-mifflin-idle-save.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', ev => {
    const file = ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const def = defaultState();
        state = Object.assign(def, parsed, {
          employees: Object.assign(def.employees, parsed.employees || {}),
          employeeUpgrades: parsed.employeeUpgrades || {},
          globalUpgrades: parsed.globalUpgrades || {},
          achievements: parsed.achievements || {},
        });
        buffs = [];
        saveState();
        renderAll();
        showToast('✅ Partida importada correctamente.');
      } catch (e) {
        alert('El archivo no es una partida válida.');
      }
    };
    reader.readAsText(file);
    ev.target.value = '';
  });

  $('#resetBtn').addEventListener('click', () => {
    if (!confirm('¿Seguro que quieres borrar toda tu partida? Esta acción no se puede deshacer.')) return;
    state = defaultState();
    buffs = [];
    saveState();
    renderAll();
    showToast('🗑️ Partida reiniciada.');
  });

  // ─── MAIN LOOP ──────────────────────────────────────────────────────────

  function updateStats() {
    statMoney.textContent = fmtMoney(state.money);
    statCps.textContent = fmt(totalCps()) + ' $/s';
    clickPowerLabel.textContent = fmt(clickValue());
    if (state.prestigePoints > 0 || state.prestigeCount > 0) {
      prestigeStatBlock.style.display = '';
      statPrestige.textContent = fmt(state.prestigePoints);
    }
  }

  function updateOfficeSummary() {
    const totalEmployees = EMPLOYEES.reduce((s, e) => s + (state.employees[e.id] || 0), 0);
    officeSummaryEl.innerHTML = `
      <div class="os-item"><span class="os-label">Empleados totales</span><span class="os-value">${fmt(totalEmployees)}</span></div>
      <div class="os-item"><span class="os-label">Clics totales</span><span class="os-value">${fmt(state.clicks)}</span></div>
      <div class="os-item"><span class="os-label">Ganado en total</span><span class="os-value">${fmtMoney(state.lifetimeEarned)}</span></div>
      <div class="os-item"><span class="os-label">Logros</span><span class="os-value">${ACHIEVEMENTS.filter(a => state.achievements[a.id]).length} / ${ACHIEVEMENTS.length}</span></div>
      <div class="os-item"><span class="os-label">Acciones de Sabre</span><span class="os-value">${fmt(state.prestigePoints)}</span></div>
      <div class="os-item"><span class="os-label">Ventas a Corporate</span><span class="os-value">${fmt(state.prestigeCount)}</span></div>
    `;
  }

  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    buffs = buffs.filter(b => b.expires > now);

    const cps = totalCps();
    if (cps > 0) addMoney(cps * dt);

    maybeTriggerEvent();
    updateStats();

    const activePanel = document.querySelector('.tab-panel.active');
    if (activePanel && activePanel.id === 'panel-empleados') refreshAffordability();
    if (activePanel && activePanel.id === 'panel-mejoras') renderUpgrades();
    if (activePanel && activePanel.id === 'panel-oficina') updateOfficeSummary();
    if (activePanel && activePanel.id === 'panel-corporate') renderPrestige();

    checkAchievements();
  }

  function refreshAffordability() {
    document.querySelectorAll('.employee-card .emp-buy-btn').forEach((btn, idx) => {
      const cost = employeeCost(idx);
      const affordable = state.money >= cost;
      btn.disabled = !affordable;
      btn.parentElement.classList.toggle('affordable', affordable);
    });
  }

  function renderAll() {
    updateStats();
    renderEmployees();
    renderUpgrades();
    renderAchievements();
    renderPrestige();
    updateOfficeSummary();
  }

  function applyOfflineProgress() {
    const now = Date.now();
    const elapsedS = Math.min(OFFLINE_CAP_S, Math.max(0, (now - (state.lastSeen || now)) / 1000));
    if (elapsedS > 30) {
      const cps = totalCps();
      const earned = cps * elapsedS;
      if (earned > 0) {
        addMoney(earned);
        showToast(`👋 Bienvenido de nuevo. Mientras estabas fuera ganaste ${fmtMoney(earned)}.`);
      }
    }
  }

  function rotateQuote() {
    michaelQuote.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  function init() {
    applyOfflineProgress();
    renderAll();
    rotateQuote();
    setInterval(rotateQuote, 12000);
    setInterval(tick, TICK_MS);
    setInterval(saveState, AUTOSAVE_MS);
    window.addEventListener('beforeunload', saveState);
    lastTick = Date.now();
  }

  init();
})();
