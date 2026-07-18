(() => {
  'use strict';

  const SAVE_KEY = 'dmi-evolution-save-v1';
  const TICK_MS = 200;
  const AUTOSAVE_MS = 10000;
  const OFFLINE_CAP_BASE_S = 3 * 60 * 60;
  const OFFLINE_CAP_PERK_S = 8 * 60 * 60;

  // ─── ECONOMY CONSTANTS ──────────────────────────────────────────────────
  // Cadena de hitos al estilo Cells to Singularity: cada nodo produce solo,
  // se puede "potenciar" (multiplicar) por separado, y hay que ahorrar para
  // desbloquear el siguiente. Ritmo validado en /scratchpad/sim3.js, que
  // simula clics activos además de producción idle (el arranque se sentía
  // demasiado rápido cuando solo se medía la producción pasiva).

  const PROD0 = 0.2;
  const PROD_GROWTH = 1.42;
  const UNLOCK0MULT = 40;
  const COST_GROWTH = 1.55;
  const MULT_PER_LEVEL = 1.35;
  const MULT_COST_GROWTH = 1.5;
  const MULT_BASE_FACTOR = 60;

  const PRESTIGE_DIVISOR = 1e5;
  const PRESTIGE_BONUS_PER_POINT = 0.02;
  const PRESTIGE_BONUS_PER_POINT_PERK = 0.03;
  const DISCOVERY_BONUS_PER = 0.0025;
  const CLICK_FLAT = 0.5;
  const CLICK_FACTOR = 2;
  const PERK_DISCOUNT = 0.85;
  const BOOST_MULT = 3;
  const BOOST_DURATION_S = 20;
  const BOOST_COOLDOWN_S = 90;
  const HEADSTART_FRONTIER = 2;
  const STANLEY_IDLE_THRESHOLD_S = 15;
  const STANLEY_IDLE_MULT = 1.6;
  const DARRYL_BONUS = 1.15;
  const HOLLY_DURATION_MULT = 1.5;

  function baseProd(i) { return PROD0 * Math.pow(PROD_GROWTH, i); }
  function unlockCost(i) {
    if (i === 0) return 0;
    const base = UNLOCK0MULT * Math.pow(COST_GROWTH, i - 1);
    return perkBought('p_unlockdiscount') ? base * PERK_DISCOUNT : base;
  }
  function multBaseCost(i) { return baseProd(i) * MULT_BASE_FACTOR; }
  function multCost(i, level) {
    const base = multBaseCost(i) * Math.pow(MULT_COST_GROWTH, level);
    return perkBought('p_multdiscount') ? base * PERK_DISCOUNT : base;
  }
  function nodeProd(i, level) { return baseProd(i) * Math.pow(MULT_PER_LEVEL, level); }

  function perkBought(id) { return !!(state && state.perks && state.perks[id]); }

  // ─── DATA: PERKS (mejoras permanentes compradas con Dundies) ──

  const PERKS = [
    { id: 'p_headstart', name: 'Arranque rápido', desc: 'Cada reinicio con Corporate empieza con los 3 primeros hitos ya desbloqueados.', emoji: '🚀', cost: 5 },
    { id: 'p_unlockdiscount', name: 'Negociador nato', desc: 'El coste de desbloquear hitos baja un 15% para siempre.', emoji: '💰', cost: 10 },
    { id: 'p_multdiscount', name: 'Eficiencia de Corporate', desc: 'El coste de potenciar hitos baja un 15% para siempre.', emoji: '⚡', cost: 10 },
    { id: 'p_click', name: 'Café ilimitado', desc: 'Poder de clic x2 para siempre.', emoji: '☕', cost: 8 },
    { id: 'p_offline', name: 'Horario flexible', desc: 'El límite de progreso offline sube de 3 a 8 horas.', emoji: '🕐', cost: 15 },
    { id: 'p_events', name: 'Buena fama en la oficina', desc: 'Los eventos y los iconos flotantes aparecen el doble de a menudo.', emoji: '🎉', cost: 12 },
    { id: 'p_discovery', name: 'Memoria de elefante', desc: 'Cada página del diario da el doble de bonus permanente.', emoji: '📖', cost: 20 },
    { id: 'p_stanley', name: 'Modo Stanley', desc: 'Si pasas 15s sin hacer clic, la producción sube un 60% mientras esperas — como quien hace crucigramas y no necesita más.', emoji: '🧩', cost: 18 },
    { id: 'p_darryl', name: 'Turno de Darryl', desc: 'El almacén abre un turno extra: +15% de producción para siempre.', emoji: '📦', cost: 14 },
    { id: 'p_holly', name: 'Holly en RRHH', desc: 'Los eventos, impulsos y bonus temporales duran un 50% más.', emoji: '💛', cost: 16 },
    { id: 'p_corebonus', name: 'Contrato mejorado con Sabre', desc: 'Cada Dundie da +3% de producción en vez de +2%.', emoji: '🌀', cost: 30 },
    { id: 'p_autobuy', name: 'Piloto automático', desc: 'Cuando puedas permitirte potenciar el hito más rentable, se compra solo.', emoji: '🤖', cost: 25 },
  ];

  // ─── DATA: ERAS ─────────────────────────────────────────────────────────

  const ERAS = [
    { name: 'Los novatos de Scranton', emoji: '🗂️', color: '#8fa7c9' },
    { name: 'Vida en la oficina', emoji: '🎉', color: '#3fb8a4' },
    { name: 'Ascenso en Dunder Mifflin', emoji: '📈', color: '#e0a53d' },
    { name: 'La era Corporate', emoji: '🏢', color: '#9b6fd1' },
    { name: 'La era Sabre', emoji: '💠', color: '#3dc7d6' },
    { name: 'Imperio del papel digital', emoji: '🌐', color: '#4fbf7a' },
    { name: 'La Singularidad de la Oficina', emoji: '✨', color: '#e8b93f' },
  ];

  // ─── DATA: NODES (cadena de 42 hitos, 6 por era) ───────────────────────

  const NODES = [
    // Era 0 — Los novatos de Scranton
    { name: 'Fotocopias y café', emoji: '📠', discovery: 'Primer día. Nadie recuerda tu nombre todavía, pero ya sabes dónde está la cafetera.' },
    { name: 'Becario del correo interno', emoji: '📬', discovery: 'Ryan reparte el correo... o eso dice él. En realidad lo hace Kevin.' },
    { name: 'Asistente de Toby en RRHH', emoji: '😔', discovery: 'Aprendes que en RRHH la respuesta a casi todo es "no puedo confirmar ni desmentir eso".' },
    { name: 'Primeras llamadas en frío', emoji: '☎️', discovery: 'Marcas cien números. Te cuelgan noventa y nueve. El cien es Stanley, y también te cuelga.' },
    { name: 'Primer cliente cerrado', emoji: '🤝', discovery: 'Vendes tu primera resma de papel. Dwight te mira con un respeto que dura tres segundos.' },
    { name: 'Escritorio propio asignado', emoji: '🪑', discovery: 'Tienes silla, mesa y una grapadora. La grapadora desaparecerá en gelatina antes de fin de mes.' },
    // Era 1 — Vida en la oficina
    { name: 'Miembro del Comité de Fiestas', emoji: '🎈', discovery: 'Angela dirige el comité con mano de hierro. Nada de purpurina sin su aprobación.' },
    { name: 'Superviviente del simulacro de incendio', emoji: '🔥', discovery: 'Dwight prende un fuego "controlado" para entrenar a la oficina. Nadie está entrenado. Todos corren.' },
    { name: 'Ganador de un Dundie', emoji: '🏆', discovery: 'Te llevas el premio a "Mejor Actitud Nunca Vista Fuera del Trabajo". Hay lágrimas, las tuyas.' },
    { name: 'Superviviente de Diversity Day', emoji: '🌈', discovery: 'Michael organiza una charla de sensibilidad cultural. Termina siendo la razón por la que hace falta otra.' },
    { name: 'Campeón de las Olimpiadas de la Oficina', emoji: '🥇', discovery: 'Ganas el evento estrella: lanzamiento de bolígrafo a la papelera desde el escritorio de Kevin.' },
    { name: 'Bromista certificado', emoji: '😏', discovery: 'Pones la grapadora de Dwight en gelatina. Él jura venganza. Vuelves a hacerlo la semana que viene.' },
    // Era 2 — Ascenso en Dunder Mifflin
    { name: 'Vendedor del mes', emoji: '📊', discovery: 'Tu foto va a la pared de la sala de descanso. Duraría más si Creed no la usara de posavasos.' },
    { name: 'Asistente del Gerente Regional', emoji: '🎖️', discovery: 'Dwight insiste en que el título es real. Legalmente no lo es. Emocionalmente, para él, lo es todo.' },
    { name: 'Sobrevives la fusión con Stamford', emoji: '🚚', discovery: 'Llegan escritorios, sillas y un tal Andy Bernard cantando a capela sin que nadie se lo pida.' },
    { name: 'Co-gerente de la sucursal', emoji: '👔', discovery: 'Michael y Jim comparten el puesto. La reunión de equipo dura el doble por el doble de anécdotas.' },
    { name: 'Gerente de la sucursal de Scranton', emoji: '🏅', discovery: 'Corporate te felicita por email. Es el gesto más cálido que vas a recibir de Corporate en años.' },
    { name: 'Premio a la sucursal más rentable', emoji: '💹', discovery: 'Scranton supera a todas las demás sucursales. Josh, de Stamford, no lo puede creer.' },
    // Era 3 — La era Corporate
    { name: 'Sobrevives un recorte de personal', emoji: '✂️', discovery: 'Corporate anuncia despidos. Todos rezan. Holly llega desde RRHH a gestionar el caos con una sonrisa nerviosa.' },
    { name: 'Auditor infiltrado de Corporate', emoji: '🕵️', discovery: 'Alguien de la central se sienta entre vosotros "sin razón aparente". Todos actúan como si no lo notaran.' },
    { name: 'Fundación de Michael Scott Paper Company', emoji: '📎', discovery: 'Michael, Pam y Ryan alquilan una oficina diminuta. El logo lo dibuja Pam en cinco minutos y queda perfecto.' },
    { name: 'Recompra por Dunder Mifflin', emoji: '🔄', discovery: 'La pequeña empresa de Michael acaba comprada por la propia Dunder Mifflin. Nadie sabe cómo sentirse.' },
    { name: 'Vicepresidente Regional del Nororeste', emoji: '🗺️', discovery: 'Un ascenso con un título larguísimo y, sorprendentemente, casi ningún poder real.' },
    { name: 'Sobrevives la salida de Michael a Colorado', emoji: '✈️', discovery: 'El jefe más regional del mundo se va a vivir su final feliz. La oficina no vuelve a ser igual.' },
    // Era 4 — La era Sabre
    { name: 'Adquisición por Sabre', emoji: '💠', discovery: 'Una empresa de tecnología compra Dunder Mifflin. Nadie entiende muy bien por qué, ni siquiera Sabre.' },
    { name: 'Sobrevives el lanzamiento del Sabre Store', emoji: '📱', discovery: 'Se inaugura una tienda de tablets dentro de la oficina. Los tablets no funcionan bien. La tienda tampoco.' },
    { name: 'Sobrevives a un CEO temporal caótico', emoji: '🎭', discovery: 'Robert California toma el mando con una filosofía de gestión que ni él mismo logra explicar.' },
    { name: 'Bajo el mando de Nellie Bertram', emoji: '🎩', discovery: 'Una nueva jefa llega sin que nadie la haya contratado oficialmente. Se queda de todos modos.' },
    { name: 'Dwight, nuevo Gerente Regional', emoji: '🥕', discovery: 'Después de años de esfuerzo, Dwight consigue el título que siempre quiso. Se lo ha ganado.' },
    { name: 'Presidente de Sabre Norteamérica', emoji: '🌎', discovery: 'Dwight asciende más allá de la sucursal. Scranton sigue siendo, para él, el centro del universo.' },
    // Era 5 — Imperio del papel digital
    { name: 'Dunder Mifflin se vuelve marca global', emoji: '🌐', discovery: 'El logo empieza a aparecer en catálogos de medio mundo. Sigue oliendo a papel recién impreso.' },
    { name: 'El fiasco de WUPHF.com', emoji: '📡', discovery: 'Ryan lanza una app que te notifica en todos tus dispositivos a la vez. Es imparable, durante un tiempo.' },
    { name: 'Digitalización total de resmas', emoji: '💻', discovery: 'El inventario ya no se cuenta a mano. Kevin sigue insistiendo en revisarlo a mano, por si acaso.' },
    { name: 'Franquicias en cada estado', emoji: '🗽', discovery: 'Hay una sucursal de Dunder Mifflin en lugares donde ni Michael habría imaginado vender papel.' },
    { name: 'Fusión con una startup de impresión 3D', emoji: '🖨️', discovery: 'La empresa que vendía resmas ahora también imprime objetos. Kevin pregunta si se puede imprimir chile.' },
    { name: 'Dunder Mifflin sale a bolsa', emoji: '📈', discovery: 'Las acciones suben. Oscar hace una hoja de cálculo para explicarlo. Nadie más la entiende.' },
    // Era 6 — La Singularidad de la Oficina
    { name: 'Automatización total del Annex', emoji: '🤖', discovery: 'El almacén se gestiona solo. Creed sigue teniendo, inexplicablemente, un despacho ahí dentro.' },
    { name: 'Nace Dwight-Bot, la IA de ventas', emoji: '🥕', discovery: 'Una inteligencia artificial entrenada con los correos de Dwight. Implacable, leal y algo aterradora.' },
    { name: 'Robots repartiendo papel por la sucursal', emoji: '🚚', discovery: 'Máquinas silenciosas recorren los pasillos. Kevin les pone nombre. A todas las llama "Nueva Kevin".' },
    { name: 'La oficina se sube a la nube', emoji: '☁️', discovery: 'Archivos, contratos y memes de Jim viven ahora en un servidor en alguna parte del mundo.' },
    { name: 'Fusión de todas las sucursales en una IA colectiva', emoji: '🧠', discovery: 'Scranton, Stamford, Utica y Nashua funcionan como una sola mente digital. Sigue prefiriendo el papel.' },
    { name: 'La Singularidad: el papel gobierna el universo', emoji: '✨', discovery: 'La línea entre "vender papel" y "controlarlo todo" se difumina. Michael estaría orgullosísimo.' },
  ];

  function eraOf(i) { return Math.floor(i / 6); }

  // ─── DATA: DISCOVERIES EXTRA (hitos que no son de la cadena) ───────────

  const MILESTONE_DISCOVERIES = [
    { id: 'm_clicks50', name: 'Archivo perdido: primer día real', desc: 'Un post-it con 50 tareas tachadas. Todas decían "trabajar horas extra".', icon: '📄', check: s => s.clicks >= 50 },
    { id: 'm_clicks100', name: 'Eso es lo que ella dijo', desc: '100 llamadas en frío. Al menos una conversación ha sido... ambigua.', icon: '😏', check: s => s.clicks >= 100 },
    { id: 'm_clicks500', name: 'Leyenda urbana: Creed', desc: '500 clics después, nadie sabe muy bien qué hace Creed en la oficina. Ni él.', icon: '👴', check: s => s.clicks >= 500 },
    { id: 'm_prestige1', name: 'Memo interno: primer reinicio', desc: '"Se ha optimizado la sucursal." — Corporate, sobre absolutamente todo.', icon: '🌀', check: s => s.prestigeCount >= 1 },
    { id: 'm_prestige25', name: 'Informe confidencial: Accionista', desc: '25 Dundies conseguidos. Empiezas a entender los correos de Sabre.', icon: '📊', check: s => s.prestigePointsLifetime >= 25 },
    { id: 'm_prestige100', name: 'Informe confidencial: Magnate', desc: '100 Dundies conseguidos. Corporate ahora te devuelve las llamadas.', icon: '💎', check: s => s.prestigePointsLifetime >= 100 },
    { id: 'm_streak3', name: 'Vas cogiéndole el gusto', desc: '3 días seguidos volviendo a la sucursal. Ya casi eres de la familia.', icon: '📅', check: s => s.streakDays >= 3 },
    { id: 'm_streak7', name: 'Committed to Scranton', desc: '7 días seguidos. En Scranton no se van, se quedan.', icon: '🏙️', check: s => s.streakDays >= 7 },
    { id: 'm_allnodes', name: 'Archivo completo: la oficina entera', desc: 'Has recorrido toda la cadena, de la fotocopiadora a la Singularidad.', icon: '🗄️', check: s => s.frontier >= NODES.length - 1 },
  ];

  function nodeDiscoveryId(i) { return 'node_' + i; }
  const TOTAL_DISCOVERIES = NODES.length + MILESTONE_DISCOVERIES.length;

  // ─── EVENTS ─────────────────────────────────────────────────────────────

  const EVENTS = [
    { weight: 3, text: '🎉 ¡Fiesta improvisada en la sala de descanso! Producción x2 durante 20s.', apply: () => addBuff('cps', 2, 20) },
    { weight: 2, text: '🏆 Ganas un Dundie. Producción +25% durante 30s.', apply: () => addBuff('cps', 1.25, 30) },
    { weight: 2, text: '🎤 Prison Mike anima a la oficina. Poder de clic x2 durante 15s.', apply: () => addBuff('click', 2, 15) },
    { weight: 2, text: '💰 Encuentras un cheque perdido de Kevin bajo el escritorio.', apply: () => { const bonus = Math.max(20, totalProduction() * 30); addResource(bonus); } },
    { weight: 1, text: '🔥 Dwight activa la alarma de incendios. Evacuación: producción -50% durante 8s.', apply: () => addBuff('cps', 0.5, 8) },
    { weight: 1, text: '📠 La fotocopiadora se atasca. Poder de clic -50% durante 10s.', apply: () => addBuff('click', 0.5, 10) },
    { weight: 2, text: '👴 Creed hace algo que nadie puede explicar. El resultado es... impredecible, durante 25s.', apply: () => addBuff('cps', 0.5 + Math.random() * 2, 25) },
  ];

  // Iconos flotantes al estilo Cells to Singularity: aparecen un momento y
  // hay que pillarlos a tiempo para llevarte el bonus.
  const FLOAT_BONUSES = [
    { emoji: '🥕', catchText: '¡Has pillado a Dwight espiando y le has quitado una zanahoria de Schrute Farms!' },
    { emoji: '🌶️', catchText: '¡Has salvado el chile de Kevin antes de que se derramara otra vez!' },
    { emoji: '✈️', catchText: '¡Has interceptado un avión de papel de Jim en pleno vuelo!' },
    { emoji: '🍷', catchText: '¡Has rescatado la copa de vino escondida de Meredith justo a tiempo!' },
    { emoji: '🐱', catchText: '¡Has encontrado al gato que Angela había perdido en la oficina!' },
    { emoji: '🥨', catchText: '¡Has pillado el último pretzel de Pretzel Day!' },
    { emoji: '🏆', catchText: '¡Has encontrado un Dundie perdido debajo de una mesa!' },
    { emoji: '🐍', catchText: '¡Has atrapado la serpiente de Dwight antes de que asustara a Kelly!' },
    { emoji: '📎', catchText: '¡Has recuperado el clip gigante de la sala de Corporate!' },
    { emoji: '🧇', catchText: '¡Has cazado uno de los gofres de Schrute Farms antes de que se enfriara!' },
  ];

  // Evento "meteorito" de C2S adaptado: hay que hacer clic rápido durante
  // unos segundos para maximizar la recompensa antes de que se acabe el tiempo.
  const URGENT_EVENTS = [
    { icon: '🚨', title: '¡Visita sorpresa de Corporate!', prompt: 'Haz clic rápido para impresionarlos antes de que se vayan.', success: 'Corporate se ha ido gratamente sorprendida.', meh: 'Corporate no se ha quedado muy impresionada, pero algo es algo.' },
    { icon: '🔥', title: '¡Incendio de verdad en la cocina!', prompt: 'Ryan ha dejado un burrito en el microondas demasiado tiempo. Nadie se cree que sea real después del simulacro de Dwight. Haz clic rápido para apagarlo.', success: 'Habéis apagado el fuego justo a tiempo. Otra vez.', meh: 'El fuego se apaga casi solo, pero por los pelos.' },
    { icon: '🫀', title: '¡Día de entrenamiento de RCP!', prompt: 'Michael os enseña a hacer compresiones al ritmo de "Stayin\' Alive". Haz clic rápido siguiendo el ritmo.', success: 'Toda la oficina domina el ritmo perfecto de compresiones.', meh: 'Perdéis el ritmo a media canción, pero se entiende la idea.' },
    { icon: '🎬', title: '¡Están grabando el documental!', prompt: 'Da lo mejor de ti antes de que corten la cámara.', success: 'Saldrás genial en el documental de la NBC.', meh: 'Te han grabado, pero seguro que editan esta parte.' },
    { icon: '🥨', title: '¡Es Pretzel Day!', prompt: 'Aprovecha el chute de azúcar de la oficina mientras dura.', success: 'Toda la oficina está a tope de energía por los pretzels.', meh: 'El subidón de azúcar se te ha pasado muy rápido.' },
    { icon: '📞', title: '¡Cliente importante al teléfono!', prompt: 'Cierra la venta antes de que cuelgue.', success: 'Has cerrado el trato del año.', meh: 'El cliente ha colgado, pero no parecía enfadado.' },
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
    return {
      resource: 0,
      runEarned: 0,
      lifetimeEarned: 0,
      clicks: 0,
      frontier: 0,
      levels: new Array(NODES.length).fill(0),
      discoveries: { [nodeDiscoveryId(0)]: true },
      prestigePoints: 0,
      prestigePointsLifetime: 0,
      prestigeCount: 0,
      perks: {},
      lastPlayDate: null,
      streakDays: 0,
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
      const merged = Object.assign(def, parsed, {
        levels: (parsed.levels && parsed.levels.length === NODES.length) ? parsed.levels : def.levels,
        discoveries: parsed.discoveries || def.discoveries,
        perks: parsed.perks || def.perks,
        prestigePointsLifetime: parsed.prestigePointsLifetime !== undefined ? parsed.prestigePointsLifetime : (parsed.prestigePoints || 0),
      });
      for (let i = 0; i <= merged.frontier; i++) merged.discoveries[nodeDiscoveryId(i)] = true;
      return merged;
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

  function discoveryCount() { return Object.keys(state.discoveries).filter(k => state.discoveries[k]).length; }

  function globalMultiplier() {
    const bonusPerPoint = perkBought('p_corebonus') ? PRESTIGE_BONUS_PER_POINT_PERK : PRESTIGE_BONUS_PER_POINT;
    const discoveryBonus = perkBought('p_discovery') ? DISCOVERY_BONUS_PER * 2 : DISCOVERY_BONUS_PER;
    let mult = 1 + state.prestigePointsLifetime * bonusPerPoint;
    mult *= (1 + discoveryCount() * discoveryBonus);
    if (perkBought('p_darryl')) mult *= DARRYL_BONUS;
    if (perkBought('p_stanley') && (Date.now() - lastClickAt) / 1000 >= STANLEY_IDLE_THRESHOLD_S) mult *= STANLEY_IDLE_MULT;
    buffs.forEach(b => { if (b.kind === 'cps') mult *= b.mult; });
    return mult;
  }

  function activeBuffMultiplier(kind) {
    let m = 1;
    buffs.forEach(b => { if (b.kind === kind) m *= b.mult; });
    return m;
  }

  function totalProduction() {
    let sum = 0;
    for (let i = 0; i <= state.frontier; i++) sum += nodeProd(i, state.levels[i]);
    return sum * globalMultiplier();
  }

  function clickValue() {
    const clickPerk = perkBought('p_click') ? 2 : 1;
    return Math.max(CLICK_FLAT, totalProduction() * CLICK_FACTOR) * activeBuffMultiplier('click') * clickPerk;
  }

  function offlineCapS() { return perkBought('p_offline') ? OFFLINE_CAP_PERK_S : OFFLINE_CAP_BASE_S; }

  function eventFreqFactor() { return perkBought('p_events') ? 0.5 : 1; }

  function addResource(amount) {
    state.resource += amount;
    state.runEarned += amount;
    state.lifetimeEarned += amount;
  }

  function addBuff(kind, mult, seconds) {
    const durationMult = perkBought('p_holly') ? HOLLY_DURATION_MULT : 1;
    buffs.push({ kind, mult, expires: Date.now() + seconds * durationMult * 1000 });
  }

  function prestigeGain(runEarned) {
    return Math.floor(Math.sqrt(Math.max(0, runEarned) / PRESTIGE_DIVISOR));
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

  // ─── DOM REFS ───────────────────────────────────────────────────────────

  const $ = sel => document.querySelector(sel);
  const statMoney = $('#statMoney');
  const statCps = $('#statCps');
  const statPrestige = $('#statPrestige');
  const prestigeStatBlock = $('#prestigeStatBlock');
  const clickPowerLabel = $('#clickPowerLabel');
  const clickBtn = $('#clickBtn');
  const floatContainer = $('#floatContainer');
  const nodeChainEl = $('#nodeChain');
  const eraBannerEl = $('#eraBanner');
  const discoveryListEl = $('#discoveryList');
  const discoveryProgressEl = $('#discoveryProgress');
  const perkListEl = $('#perkList');
  const eventToast = $('#eventToast');
  const clickEmojiEl = $('.click-emoji');
  const clickTextEl = $('.click-text');
  const michaelQuote = $('#michaelQuote');
  const boostBtn = $('#boostBtn');
  const boostStateEl = $('#boostState');
  const nextEvoNameEl = $('#nextEvoName');
  const nextEvoHaveEl = $('#nextEvoHave');
  const nextEvoCostEl = $('#nextEvoCost');
  const nextEvoFillEl = $('#nextEvoFill');
  const bigBangFlashEl = $('#bigBangFlash');

  // ─── TABS ───────────────────────────────────────────────────────────────

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('#panel-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab !== 'carrera') clearFloatBonus();
      if (btn.dataset.tab === 'carrera') renderChain();
      if (btn.dataset.tab === 'descubrimientos') renderDiscoveries();
      if (btn.dataset.tab === 'corporate') renderPrestige();
    });
  });

  // ─── CLICK ──────────────────────────────────────────────────────────────

  let lastClickAt = Date.now();

  clickBtn.addEventListener('click', ev => {
    const gain = clickValue();
    addResource(gain);
    state.clicks++;
    lastClickAt = Date.now();
    spawnFloat(gain, ev);
    if (urgentEvent && Date.now() < urgentEvent.endsAt) {
      urgentEvent.taps++;
      renderUrgentBanner();
    }
    checkDiscoveries();
  });

  let boostReadyAt = 0;

  boostBtn.addEventListener('click', () => {
    if (Date.now() < boostReadyAt) return;
    addBuff('cps', BOOST_MULT, BOOST_DURATION_S);
    boostReadyAt = Date.now() + BOOST_COOLDOWN_S * 1000;
    showToast(`🚀 ¡Impulso activado! Producción x${BOOST_MULT} durante ${BOOST_DURATION_S}s.`);
    renderBoostBtn();
  });

  function renderBoostBtn() {
    const now = Date.now();
    const activeBuff = buffs.find(b => b.kind === 'cps' && b.mult === BOOST_MULT);
    if (activeBuff && activeBuff.expires > now) {
      boostBtn.disabled = true;
      boostBtn.classList.add('active');
      boostStateEl.textContent = Math.ceil((activeBuff.expires - now) / 1000) + 's';
    } else if (now < boostReadyAt) {
      boostBtn.disabled = true;
      boostBtn.classList.remove('active');
      boostStateEl.textContent = Math.ceil((boostReadyAt - now) / 1000) + 's';
    } else {
      boostBtn.disabled = false;
      boostBtn.classList.remove('active');
      boostStateEl.textContent = 'listo';
    }
  }

  function renderNextEvo() {
    if (state.frontier >= NODES.length - 1) {
      nextEvoNameEl.textContent = '¡Cadena completa!';
      nextEvoHaveEl.textContent = fmt(state.resource);
      nextEvoCostEl.textContent = '—';
      nextEvoFillEl.style.width = '100%';
      return;
    }
    const i = state.frontier + 1;
    const cost = unlockCost(i);
    const pct = cost > 0 ? Math.min(100, (state.resource / cost) * 100) : 100;
    nextEvoNameEl.textContent = `${NODES[i].emoji} ${NODES[i].name}`;
    nextEvoHaveEl.textContent = fmt(state.resource);
    nextEvoCostEl.textContent = fmt(cost);
    nextEvoFillEl.style.width = pct.toFixed(1) + '%';
  }

  function spawnFloat(amount, ev) {
    const rect = clickBtn.getBoundingClientRect();
    const parentRect = floatContainer.getBoundingClientRect();
    const x = (ev.clientX || (rect.left + rect.width / 2)) - parentRect.left;
    const y = (ev.clientY || (rect.top + rect.height / 2)) - parentRect.top;
    const el = document.createElement('div');
    el.className = 'float-number';
    el.textContent = '+' + fmt(amount);
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    floatContainer.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // ─── NODE CHAIN RENDER ──────────────────────────────────────────────────

  function renderEraBanner() {
    const eraIndex = eraOf(Math.min(state.frontier, NODES.length - 1));
    const era = ERAS[eraIndex];
    const eraNext = ERAS[Math.min(eraIndex + 1, ERAS.length - 1)];
    eraBannerEl.style.setProperty('--era-color', era.color);
    eraBannerEl.textContent = `${era.emoji} ${era.name}`;
    document.documentElement.style.setProperty('--era-glow', era.color);
    document.documentElement.style.setProperty('--era-glow2', eraNext.color);
  }

  function updateHeroVisual() {
    const node = NODES[Math.min(state.frontier, NODES.length - 1)];
    if (clickEmojiEl) clickEmojiEl.textContent = node.emoji;
    if (clickTextEl) clickTextEl.textContent = node.name;
  }

  function renderChain() {
    renderEraBanner();
    updateHeroVisual();
    nodeChainEl.innerHTML = '';
    let lastEra = -1;
    NODES.forEach((node, i) => {
      const era = eraOf(i);
      if (era !== lastEra) {
        lastEra = era;
        const divider = document.createElement('div');
        divider.className = 'era-divider';
        divider.style.setProperty('--era-color', ERAS[era].color);
        divider.textContent = `${ERAS[era].emoji} ${ERAS[era].name}`;
        nodeChainEl.appendChild(divider);
      }

      const card = document.createElement('div');
      const level = state.levels[i];

      if (i <= state.frontier) {
        const prod = nodeProd(i, level);
        const cost = multCost(i, level);
        const affordable = state.resource >= cost;
        card.className = 'node-card state-active' + (affordable ? ' affordable-mult' : '');
        card.innerHTML = `
          <div class="node-emoji">${node.emoji}</div>
          <div class="node-info">
            <div class="node-name">${node.name} ${level > 0 ? `<span class="node-level-badge">Nivel ${level}</span>` : ''}</div>
            <div class="node-stats">Produce ${fmt(prod)}/s</div>
          </div>
          <button class="node-btn btn-mult" ${affordable ? '' : 'disabled'}>Potenciar<br>${fmt(cost)}</button>
        `;
        card.querySelector('.node-btn').addEventListener('click', () => buyMult(i));
      } else if (i === state.frontier + 1) {
        const cost = unlockCost(i);
        const affordable = state.resource >= cost;
        card.className = 'node-card state-next' + (affordable ? ' affordable-unlock' : '');
        card.innerHTML = `
          <div class="node-emoji">${node.emoji}</div>
          <div class="node-info">
            <div class="node-name">${node.name}</div>
            <div class="node-stats">Producirá ${fmt(baseProd(i))}/s al desbloquearlo</div>
          </div>
          <button class="node-btn btn-unlock" ${affordable ? '' : 'disabled'}>Desbloquear<br>${fmt(cost)}</button>
        `;
        card.querySelector('.node-btn').addEventListener('click', () => buyUnlock());
      } else {
        card.className = 'node-card state-locked';
        card.innerHTML = `
          <div class="node-emoji">${node.emoji}</div>
          <div class="node-info">
            <div class="node-name">${node.name}</div>
            <div class="node-locked-label">Bloqueado — desbloquea antes el hito anterior</div>
          </div>
        `;
      }

      nodeChainEl.appendChild(card);
    });
  }

  function buyUnlock() {
    const i = state.frontier + 1;
    if (i >= NODES.length) return;
    const cost = unlockCost(i);
    if (state.resource < cost) return;
    state.resource -= cost;
    state.frontier = i;
    state.discoveries[nodeDiscoveryId(i)] = true;
    renderChain();
    checkDiscoveries();
    saveState();
  }

  function buyMult(i) {
    if (i > state.frontier) return;
    const cost = multCost(i, state.levels[i]);
    if (state.resource < cost) return;
    state.resource -= cost;
    state.levels[i]++;
    renderChain();
    saveState();
  }

  function autoBuyTick() {
    if (!perkBought('p_autobuy')) return;
    for (let guard = 0; guard < 25; guard++) {
      let bestIdx = null, bestRatio = -1;
      for (let i = 0; i <= state.frontier; i++) {
        const cost = multCost(i, state.levels[i]);
        if (state.resource < cost) continue;
        const cur = nodeProd(i, state.levels[i]);
        const next = nodeProd(i, state.levels[i] + 1);
        const ratio = (next - cur) / cost;
        if (ratio > bestRatio) { bestRatio = ratio; bestIdx = i; }
      }
      if (bestIdx === null) break;
      state.resource -= multCost(bestIdx, state.levels[bestIdx]);
      state.levels[bestIdx]++;
    }
  }

  // ─── DISCOVERIES ────────────────────────────────────────────────────────

  function checkDiscoveries() {
    let newlyUnlocked = null;
    MILESTONE_DISCOVERIES.forEach(d => {
      if (!state.discoveries[d.id] && d.check(state)) {
        state.discoveries[d.id] = true;
        newlyUnlocked = d;
      }
    });
    if (newlyUnlocked) {
      showToast(`📖 Nueva página del diario: ${newlyUnlocked.name}`);
      if ($('#panel-descubrimientos').classList.contains('active')) renderDiscoveries();
    }
  }

  function renderDiscoveries() {
    const collected = discoveryCount();
    discoveryProgressEl.innerHTML = `<div class="discovery-progress-fill" style="width:${(collected / TOTAL_DISCOVERIES * 100).toFixed(1)}%"></div>`;

    discoveryListEl.innerHTML = '';
    NODES.forEach((node, i) => {
      const id = nodeDiscoveryId(i);
      const unlocked = !!state.discoveries[id];
      appendDiscoveryCard(unlocked ? node.emoji : '🔒', unlocked ? node.name : '???', unlocked ? node.discovery : 'Aún no has llegado a este hito de la cadena.', unlocked);
    });
    MILESTONE_DISCOVERIES.forEach(d => {
      const unlocked = !!state.discoveries[d.id];
      appendDiscoveryCard(unlocked ? d.icon : '🔒', unlocked ? d.name : '???', unlocked ? d.desc : 'Sigue jugando para desbloquear esta página.', unlocked);
    });
  }

  function appendDiscoveryCard(icon, name, desc, unlocked) {
    const card = document.createElement('div');
    card.className = 'disc-card' + (unlocked ? ' unlocked' : '');
    card.innerHTML = `
      <div class="disc-icon">${icon}</div>
      <div>
        <div class="disc-name">${name}</div>
        <div class="disc-desc">${desc}</div>
      </div>
    `;
    discoveryListEl.appendChild(card);
  }

  // ─── PRESTIGE ───────────────────────────────────────────────────────────

  function renderPrestige() {
    const gain = prestigeGain(state.runEarned);
    const bonusPerPoint = perkBought('p_corebonus') ? PRESTIGE_BONUS_PER_POINT_PERK : PRESTIGE_BONUS_PER_POINT;
    $('#prestigeGainPreview').textContent = `+${gain} Dundie${gain === 1 ? '' : 's'}`;
    $('#prestigeDetail').textContent = gain > 0
      ? 'Reinicia con Corporate: pierdes la cadena de hitos y el progreso de esta partida, pero tus descubrimientos, Dundies y mejoras se quedan contigo para siempre.'
      : `Sigue avanzando en la cadena para conseguir tu primer Dundie (llevas ${fmt(state.runEarned)} de progreso en esta partida).`;
    $('#prestigeCurrent').textContent = fmt(state.prestigePoints);
    $('#prestigeLifetime').textContent = fmt(state.prestigePointsLifetime);
    $('#prestigeBonus').textContent = '+' + Math.round(state.prestigePointsLifetime * bonusPerPoint * 100) + '%';
    $('#prestigeCount').textContent = fmt(state.prestigeCount);
    $('#prestigeBtn').disabled = gain <= 0;
    renderPerks();
  }

  $('#prestigeBtn').addEventListener('click', () => {
    const gain = prestigeGain(state.runEarned);
    if (gain <= 0) return;
    if (!confirm(`¿Reiniciar con Corporate? Ganarás ${gain} Dundies pero volverás al primer hito de la cadena (tus descubrimientos y mejoras se conservan).`)) return;
    fireBigBangFlash();
    state.prestigePoints += gain;
    state.prestigePointsLifetime += gain;
    state.prestigeCount += 1;
    state.resource = 0;
    state.runEarned = 0;
    state.frontier = perkBought('p_headstart') ? HEADSTART_FRONTIER : 0;
    state.levels = new Array(NODES.length).fill(0);
    for (let i = 0; i <= state.frontier; i++) state.discoveries[nodeDiscoveryId(i)] = true;
    buffs = [];
    checkDiscoveries();
    renderPrestige();
    renderChain();
    saveState();
    showToast('🌀 ¡Corporate ha reiniciado la sucursal! Dundies disponibles: ' + fmt(state.prestigePoints));
  });

  function renderPerks() {
    perkListEl.innerHTML = '';
    PERKS.forEach(p => {
      const bought = !!state.perks[p.id];
      const affordable = state.prestigePoints >= p.cost;
      const card = document.createElement('div');
      card.className = 'perk-card' + (bought ? ' bought' : '');
      card.innerHTML = `
        <div class="perk-emoji">${p.emoji}</div>
        <div class="perk-name">${p.name}</div>
        <div class="perk-desc">${p.desc}</div>
        ${bought ? '<span class="perk-bought-label">✔ Comprada</span>' : `<button class="perk-btn" ${affordable ? '' : 'disabled'}>Comprar &middot; ${p.cost} Dundies</button>`}
      `;
      if (!bought) card.querySelector('.perk-btn').addEventListener('click', () => buyPerk(p));
      perkListEl.appendChild(card);
    });
  }

  function buyPerk(p) {
    if (state.perks[p.id] || state.prestigePoints < p.cost) return;
    state.prestigePoints -= p.cost;
    state.perks[p.id] = true;
    renderPerks();
    renderPrestige();
    updateStats();
    saveState();
    showToast(`${p.emoji} Mejora permanente activada: ${p.name}`);
  }

  // ─── TOASTS / EVENTS ────────────────────────────────────────────────────

  let toastTimer = null;
  function showToast(text) {
    eventToast.textContent = text;
    eventToast.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => eventToast.classList.add('hidden'), 4200);
  }

  function fireBigBangFlash() {
    bigBangFlashEl.classList.remove('firing');
    void bigBangFlashEl.offsetWidth;
    bigBangFlashEl.classList.add('firing');
  }

  function randRange(a, b) { return a + Math.random() * (b - a); }
  let nextEventAt = Date.now() + randRange(45, 90) * 1000 * eventFreqFactor();

  function maybeTriggerEvent() {
    if (Date.now() < nextEventAt) return;
    nextEventAt = Date.now() + randRange(60, 130) * 1000 * eventFreqFactor();
    const totalWeight = EVENTS.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * totalWeight;
    for (const ev of EVENTS) {
      r -= ev.weight;
      if (r <= 0) {
        ev.apply();
        showToast(ev.text);
        break;
      }
    }
  }

  // ─── FLOATING BONUS (icono flotante a lo Cells to Singularity) ─────────

  const FLOAT_BONUS_LIFETIME_MS = 5000;
  let floatBonusEl = null;
  let nextFloatBonusAt = Date.now() + randRange(20, 40) * 1000 * eventFreqFactor();

  function carreraTabActive() {
    const panel = $('#panel-carrera');
    return panel && panel.classList.contains('active');
  }

  function clearFloatBonus() {
    if (floatBonusEl) { floatBonusEl.remove(); floatBonusEl = null; }
  }

  function maybeSpawnFloatBonus() {
    if (Date.now() < nextFloatBonusAt) return;
    nextFloatBonusAt = Date.now() + randRange(25, 55) * 1000 * eventFreqFactor();
    if (!carreraTabActive() || document.hidden || floatBonusEl) return;

    const item = FLOAT_BONUSES[Math.floor(Math.random() * FLOAT_BONUSES.length)];
    const margin = 70;
    const x = randRange(margin, Math.max(margin + 1, window.innerWidth - margin));
    const y = randRange(160, Math.max(220, window.innerHeight - 120));

    const el = document.createElement('button');
    el.className = 'float-bonus';
    el.textContent = item.emoji;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.setAttribute('aria-label', 'Bonus');

    const remove = () => { if (floatBonusEl === el) floatBonusEl = null; el.classList.add('leaving'); setTimeout(() => el.remove(), 250); };
    const timeout = setTimeout(remove, FLOAT_BONUS_LIFETIME_MS);

    el.addEventListener('click', ev => {
      clearTimeout(timeout);
      const bonus = Math.max(5, totalProduction() * randRange(15, 30));
      addResource(bonus);
      spawnFloat(bonus, ev);
      showToast(`${item.emoji} ${item.catchText} +${fmt(bonus)}`);
      checkDiscoveries();
      saveState();
      remove();
    });

    document.body.appendChild(el);
    floatBonusEl = el;
  }

  // ─── URGENT EVENT (evento "meteorito" de clic rápido) ──────────────────

  const URGENT_EVENT_DURATION_MS = 8000;
  const urgentBannerEl = $('#urgentEventBanner');
  let urgentEvent = null; // { def, taps, endsAt }
  let nextUrgentEventAt = Date.now() + randRange(180, 300) * 1000 * eventFreqFactor();

  function maybeTriggerUrgentEvent() {
    if (urgentEvent) return;
    if (Date.now() < nextUrgentEventAt) return;
    nextUrgentEventAt = Date.now() + randRange(240, 420) * 1000 * eventFreqFactor();
    if (!carreraTabActive() || document.hidden) return;

    const def = URGENT_EVENTS[Math.floor(Math.random() * URGENT_EVENTS.length)];
    urgentEvent = { def, taps: 0, endsAt: Date.now() + URGENT_EVENT_DURATION_MS };
    clickBtn.classList.add('urgent-active');
    renderUrgentBanner();
  }

  function renderUrgentBanner() {
    if (!urgentEvent) { urgentBannerEl.classList.add('hidden'); return; }
    const remaining = Math.max(0, urgentEvent.endsAt - Date.now());
    const pct = (remaining / URGENT_EVENT_DURATION_MS) * 100;
    urgentBannerEl.classList.remove('hidden');
    urgentBannerEl.innerHTML = `
      <div class="urgent-title">${urgentEvent.def.icon} ${urgentEvent.def.title}</div>
      <div class="urgent-prompt">${urgentEvent.def.prompt}</div>
      <div class="urgent-meter"><div class="urgent-meter-fill" style="width:${pct.toFixed(0)}%"></div></div>
      <div class="urgent-footer"><span>Clics: ${urgentEvent.taps}</span><span>${Math.ceil(remaining / 1000)}s</span></div>
    `;
  }

  function resolveUrgentEventIfDone() {
    if (!urgentEvent) return;
    if (Date.now() < urgentEvent.endsAt) return;
    const { def, taps } = urgentEvent;
    const success = taps >= 12;
    const bonus = success ? totalProduction() * taps * 3 : totalProduction() * 8;
    addResource(Math.max(bonus, 5));
    showToast(`${def.icon} ${success ? def.success : def.meh} +${fmt(Math.max(bonus, 5))}`);
    urgentEvent = null;
    clickBtn.classList.remove('urgent-active');
    urgentBannerEl.classList.add('hidden');
    checkDiscoveries();
    saveState();
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
          levels: (parsed.levels && parsed.levels.length === NODES.length) ? parsed.levels : def.levels,
          discoveries: parsed.discoveries || def.discoveries,
          perks: parsed.perks || def.perks,
          prestigePointsLifetime: parsed.prestigePointsLifetime !== undefined ? parsed.prestigePointsLifetime : (parsed.prestigePoints || 0),
        });
        for (let i = 0; i <= state.frontier; i++) state.discoveries[nodeDiscoveryId(i)] = true;
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
    statMoney.textContent = fmt(state.resource);
    statCps.textContent = fmt(totalProduction()) + ' /s';
    clickPowerLabel.textContent = fmt(clickValue());
    if (state.prestigePoints > 0 || state.prestigeCount > 0) {
      prestigeStatBlock.style.display = '';
      statPrestige.textContent = fmt(state.prestigePoints);
    }
  }

  let lastTick = Date.now();
  function tick() {
    const now = Date.now();
    const dt = (now - lastTick) / 1000;
    lastTick = now;

    buffs = buffs.filter(b => b.expires > now);

    const prod = totalProduction();
    if (prod > 0) addResource(prod * dt);

    autoBuyTick();

    maybeTriggerEvent();
    maybeSpawnFloatBonus();
    maybeTriggerUrgentEvent();
    resolveUrgentEventIfDone();
    if (urgentEvent) renderUrgentBanner();
    updateStats();
    renderBoostBtn();
    renderNextEvo();

    const activePanel = document.querySelector('.tab-panel.active');
    if (activePanel && activePanel.id === 'panel-carrera') renderChain();
    if (activePanel && activePanel.id === 'panel-corporate') renderPrestige();

    checkDiscoveries();
  }

  function renderAll() {
    updateStats();
    renderBoostBtn();
    renderNextEvo();
    renderChain();
    renderDiscoveries();
    renderPrestige();
  }

  function updateStreak() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastPlayDate === today) return;
    const prev = state.lastPlayDate ? new Date(state.lastPlayDate) : null;
    const diffDays = prev ? Math.round((new Date(today) - prev) / 86400000) : null;
    state.streakDays = diffDays === 1 ? state.streakDays + 1 : 1;
    state.lastPlayDate = today;
  }

  function applyOfflineProgress() {
    const now = Date.now();
    const elapsedS = Math.min(offlineCapS(), Math.max(0, (now - (state.lastSeen || now)) / 1000));
    if (elapsedS > 30) {
      const prod = totalProduction();
      const earned = prod * elapsedS;
      if (earned > 0) {
        addResource(earned);
        showToast(`👋 Bienvenido de nuevo. Mientras estabas fuera ganaste ${fmt(earned)}.`);
      }
    }
  }

  function rotateQuote() {
    michaelQuote.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }

  function init() {
    updateStreak();
    applyOfflineProgress();
    checkDiscoveries();
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
