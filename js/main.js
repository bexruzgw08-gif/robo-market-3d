import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWorld, SPOTS, DOOR } from './world.js';
import { Customer } from './characters.js';
import { Robot } from './robot.js';
import { Tablet, statusLabel } from './tablet.js';
import { LEVELS, PRODUCT_BY_ID, CATEGORIES, makeRequest, CUSTOMER_NAMES, ACCENTS, THANKS, ANGRY } from './data.js';
import { initAudio, sfx, speak, setMotor, setSoundEnabled } from './audio.js';

const $ = (s) => document.querySelector(s);
const rand = (a) => a[Math.floor(Math.random() * a.length)];

// ---------- Renderer & scene ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.82;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd9f2);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 120);
scene.add(new THREE.HemisphereLight(0xffffff, 0x9a8f80, 0.4));
const sun = new THREE.DirectionalLight(0xfff4e0, 1.0);
sun.position.set(6, 14, 8);
sun.target.position.set(0, 0, -2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -17, right: 17, top: 15, bottom: -15, near: 1, far: 40 });
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);

const world = buildWorld(scene);
const robot = new Robot(scene, world.nav, world.inventory);

// ---------- Game state ----------
const SAVE = 'roboMarket3d.v1';
const saved = (() => { try { return JSON.parse(localStorage.getItem(SAVE)) || {}; } catch { return {}; } })();

const game = {
  level: saved.level || 1,
  score: 0,
  served: 0,
  correct: 0,
  mistakes: 0,
  orders: [],
  customers: [],
  selectedOrder: null,
  settings: { sound: saved.sound ?? true, api: saved.api ?? false },
  inventory: world.inventory,
  tabletOpen: false,
  started: false,
  spawnTimer: 2,
  nextOrderId: 1,
  spots: SPOTS.map(() => null),

  saveSettings() {
    try { localStorage.setItem(SAVE, JSON.stringify({ level: this.level, sound: this.settings.sound, api: this.settings.api, best: Math.max(saved.best || 0, this.score) })); } catch { /* ignore */ }
  },

  setLevel(lv, auto = false) {
    if (lv === this.level) return;
    this.level = lv;
    this.saveSettings();
    updateHud();
    if (auto) {
      sfx('levelup');
      banner(`LEVEL UP!`, `Level ${lv} — ${LEVELS[lv].name}`);
    } else toast(`English level: <b>${LEVELS[lv].name}</b>`);
  },

  toggleSound() {
    this.settings.sound = !this.settings.sound;
    setSoundEnabled(this.settings.sound);
    this.saveSettings();
  },

  addScore(n, why) {
    this.score = Math.max(0, this.score + n);
    floatScore(n, why);
    const L = LEVELS[this.level];
    if (this.score >= L.next && this.level < 3) this.setLevel(this.level + 1, true);
    updateHud();
  },

  repeatRequest(o) {
    o.customer.say(o.english, 7);
    speakAs(o.customer, o.english);
    subtitle(o.customer.name, o.english);
  },

  async translate(o) {
    if (o.uzShown) return;
    o.uzShown = true;
    o.translated = true;
    sfx('beep');
    if (this.settings.api) {
      try {
        const ctl = new AbortController();
        const to = setTimeout(() => ctl.abort(), 5000);
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(o.english)}&langpair=en|uz`, { signal: ctl.signal });
        clearTimeout(to);
        const j = await r.json();
        const t = j?.responseData?.translatedText;
        if (t && !/MYMEMORY|INVALID/i.test(t)) o.apiText = t;
      } catch { toast('Online translation unavailable — using the built-in dictionary.'); }
    }
  },

  // Checks the player's product selection against the customer's request.
  confirm(o) {
    const inv = this.inventory;
    const sel = { ...o.selection };
    const used = new Set();
    let substitutions = 0;
    for (const { product: p, qty } of o.items) {
      if (sel[p.id] === qty) { used.add(p.id); continue; }
      if (sel[p.id] !== undefined) return this.wrong(o, `Check the quantity of <b>${p.name}</b>. Read the request again.`);
      // allowed: same-category alternative when the requested product is out of stock
      if (inv.available(p.id) < qty) {
        const alt = Object.keys(sel).find((id) => !used.has(id) && PRODUCT_BY_ID[id].cat === p.cat && sel[id] === qty && !o.items.some((i) => i.product.id === id));
        if (alt) { used.add(alt); substitutions++; continue; }
      }
      const extra = Object.keys(sel).find((id) => !used.has(id) && !o.items.some((i) => i.product.id === id));
      if (extra) return this.wrong(o, `The customer did not ask for <b>${PRODUCT_BY_ID[extra].name}</b>. Listen again!`);
      return this.wrong(o, 'Something is missing from the order.');
    }
    const extra = Object.keys(sel).find((id) => !used.has(id));
    if (extra) return this.wrong(o, `The customer did not ask for <b>${PRODUCT_BY_ID[extra].name}</b>.`);
    for (const id of used) {
      if (inv.available(id) < sel[id]) {
        sfx('error');
        return { ok: false, text: `⚠️ Not enough <b>${PRODUCT_BY_ID[id].name}</b> in stock. Pick an alternative or restock it.` };
      }
    }
    // Correct! Reserve real shelf items and send the robot.
    const items = [];
    for (const id of used) items.push(...inv.reserve(id, sel[id]));
    o.status = 'queued';
    o.confirmedAt = performance.now();
    robot.enqueue({ order: o, items });
    this.correct++;
    const lines = o.items.length;
    this.addScore(10 * lines, 'Correct order');
    if (!o.translated && this.level > 1) this.addScore(10, 'No-translate bonus');
    if (substitutions) toast(`Alternative chosen for ${substitutions} item${substitutions > 1 ? 's' : ''}.`);
    sfx('success');
    toast(`✅ Order for <b>${o.customer.name}</b> sent to the robot.`);
    o.customer.say(rand(['Great, thanks!', 'Okay, I\'ll wait here.', 'Perfect.']), 2.5);
    updateHud();
    return { ok: true, text: `✅ Correct! The robot is on its way.${o.translated || this.level === 1 ? '' : ' <b>+10 bonus</b> for understanding without translation.'}` };
  },

  wrong(o, text) {
    this.mistakes++;
    this.addScore(-5, 'Wrong order');
    o.customer.doGesture('angry', 1.2);
    sfx('error');
    return { ok: false, text: '❌ ' + text };
  },

  restock(id) {
    const cost = id ? 5 : 20;
    if (id) this.inventory.restock(id);
    else Object.keys(this.inventory.byId).forEach((k) => this.inventory.restock(k));
    this.score = Math.max(0, this.score - cost);
    updateHud();
    toast(id ? `Restocked <b>${PRODUCT_BY_ID[id].name}</b>.` : 'All shelves restocked.');
  },

  openTablet() {
    if (this.tabletOpen) return;
    this.tabletOpen = true;
    controls.unlock();
    tablet.open();
    $('#hud').classList.add('dim');
  },
  closeTablet() {
    if (!this.tabletOpen) return;
    this.tabletOpen = false;
    tablet.close();
    $('#hud').classList.remove('dim');
    controls.lock();
  },
};

const tablet = new Tablet(game, world.tablet);
setSoundEnabled(game.settings.sound);

// ---------- Player controller ----------
const controls = new PointerLockControls(camera, document.body);
camera.position.set(-8.5, 1.65, 2.6);
camera.lookAt(-8.5, 1.3, 6);
const keys = {};
const vel = new THREE.Vector3();
const PLAYER_R = 0.3;
let bobT = 0, stepDist = 0;

addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyE' && controls.isLocked) interact();
  if ((e.code === 'Escape' || e.code === 'Tab') && game.tabletOpen) { e.preventDefault(); game.closeTablet(); }
  else if (e.code === 'Tab' && controls.isLocked) { e.preventDefault(); if (nearTablet()) game.openTablet(); else toast('Walk to the tablet on the service counter.'); }
});
addEventListener('keyup', (e) => (keys[e.code] = false));

function nearTablet() { return camera.position.distanceTo(world.tablet.group.position) < 3; }

function movePlayer(dt) {
  if (!controls.isLocked) { vel.set(0, 0, 0); return; }
  const fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd);
  fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
  const wish = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) wish.add(fwd);
  if (keys.KeyS || keys.ArrowDown) wish.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) wish.add(right);
  if (keys.KeyA || keys.ArrowLeft) wish.sub(right);
  const speed = keys.ShiftLeft || keys.ShiftRight ? 5.2 : 3.2;
  if (wish.lengthSq()) wish.normalize().multiplyScalar(speed);
  vel.lerp(wish, Math.min(1, dt * 10));
  const p = camera.position;
  p.x += vel.x * dt;
  p.z += vel.z * dt;
  // collide against boxes (circle vs AABB push-out)
  const solids = [...world.colliders,
    ...game.customers.map((c) => circleBox(c.root.position, 0.3)),
    circleBox(robot.root.position, 0.38)];
  for (let i = 0; i < 2; i++) {
    for (const b of solids) {
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz);
      if (d < PLAYER_R) {
        if (d > 1e-5) { p.x += (dx / d) * (PLAYER_R - d); p.z += (dz / d) * (PLAYER_R - d); }
        else p.z += PLAYER_R;
      }
    }
  }
  // head bob + footsteps
  const sp = Math.hypot(vel.x, vel.z);
  bobT += dt * sp * 2.6;
  p.y = 1.65 + Math.sin(bobT * 2) * 0.03 * Math.min(1, sp / 3);
  stepDist += sp * dt;
  if (stepDist > (speed > 4 ? 0.75 : 0.6)) { stepDist = 0; sfx('step'); }
}
const circleBox = (pos, r) => ({ minX: pos.x - r, maxX: pos.x + r, minZ: pos.z - r, maxZ: pos.z + r });

// ---------- Interaction (raycast from the crosshair) ----------
const ray = new THREE.Raycaster();
ray.far = 3.4;
let hovered = null;

function findTarget() {
  ray.setFromCamera({ x: 0, y: 0 }, camera);
  const objs = [...world.interactables, robot.root, ...game.customers.map((c) => c.root)];
  const hits = ray.intersectObjects(objs, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.interact) o = o.parent;
    if (o) return { ...o.userData.interact, instanceId: h.instanceId };
    return null;   // something else (e.g. shelf) is in front
  }
  return null;
}

function updatePrompt() {
  hovered = controls.isLocked ? findTarget() : null;
  const pr = $('#prompt'), info = $('#infoCard');
  $('#crosshair').classList.toggle('active', !!hovered);
  info.hidden = true;
  if (!hovered) { pr.hidden = true; return; }
  pr.hidden = false;
  if (hovered.type === 'tablet') pr.innerHTML = '<kbd>E</kbd> Use translation tablet';
  else if (hovered.type === 'customer') {
    const o = game.orders.find((x) => x.customer === hovered.customer && x.status !== 'done');
    pr.innerHTML = `<kbd>E</kbd> Talk to ${hovered.customer.name}${o ? ' — ' + statusLabel(o.status) : ''}`;
  } else if (hovered.type === 'robot') pr.innerHTML = `<kbd>E</kbd> Robot: ${robot.status}`;
  else if (hovered.type === 'product') {
    const p = hovered.product;
    pr.innerHTML = `<kbd>E</kbd> Learn this word`;
    info.hidden = false;
    info.innerHTML = `<b>${p.name}</b><span class="uz">${p.uzName}</span><span>${CATEGORIES.find((c) => c.id === p.cat).en} • Stock ${game.inventory.stock(p.id)}</span>`;
  }
}

function interact() {
  if (!hovered) return;
  sfx('click');
  if (hovered.type === 'tablet') game.openTablet();
  else if (hovered.type === 'customer') {
    const c = hovered.customer;
    const o = game.orders.find((x) => x.customer === c && x.status !== 'done' && x.status !== 'cancelled');
    if (o && o.status === 'waiting') game.repeatRequest(o);
    else if (o) { c.say('I\'m waiting for the robot, thanks!', 3); speakAs(c, 'I\'m waiting for the robot, thanks!'); }
    else { c.say('Hello!', 2); c.doGesture('wave'); }
  } else if (hovered.type === 'robot') {
    robot.head.rotation.y = 0;
    sfx('beep');
    toast(`🤖 ${robot.status}${robot.queue.length ? ` • ${robot.queue.length} order(s) in queue` : ''}`);
  } else if (hovered.type === 'product') {
    const p = hovered.product;
    speak(p.c ? p.pl : p.en, { rate: 0.85 });
    toast(`📖 <b>${p.name}</b> = ${p.uzName}`);
  }
}

// ---------- Customers & orders ----------
function speakAs(c, text) {
  speak(text, { lang: c.accent.lang, rate: LEVELS[game.level].rate, pitch: c.pitch });
}

function spawnCustomer() {
  const L = LEVELS[game.level];
  const active = game.customers.filter((c) => !c.leaving).length;
  if (active >= L.maxCustomers) return;
  const order = game.level === 1 ? [0] : [0, 1, 2];
  const spotIdx = order.find((i) => !game.spots[i]);
  if (spotIdx === undefined) return;
  const used = game.customers.map((c) => c.name);
  const name = rand(CUSTOMER_NAMES.filter((n) => !used.includes(n)));
  const accent = game.level === 3 ? rand(ACCENTS) : game.level === 2 ? rand(ACCENTS.slice(0, 2)) : ACCENTS[0];
  const c = new Customer(scene, { name, accent, pitch: 0.8 + Math.random() * 0.5 });
  c.root.position.set(DOOR.x + (Math.random() - 0.5), 0, 17);
  c.yaw = c.targetYaw = Math.PI;
  game.customers.push(c);
  const spot = SPOTS[spotIdx];
  game.spots[spotIdx] = c;
  c.spotIdx = spotIdx;
  c.walkTo([[0, 11.5], [0, 8.6], [spot.x, 7.3], [spot.x, spot.z]], () => customerArrived(c));
}

function customerArrived(c) {
  c.faceTowards(SPOTS[c.spotIdx].x, 2);
  c.doGesture('wave', 1.2);
  const req = makeRequest(game.level);
  const o = {
    id: game.nextOrderId++, customer: c, ...req, selection: {}, status: 'waiting',
    uzShown: LEVELS[game.level].autoTranslate, translated: false, apiText: null,
    patience: 1, patienceTime: LEVELS[game.level].patience, created: performance.now(),
  };
  game.orders.push(o);
  if (game.selectedOrder == null || !game.orders.some((x) => x.id === game.selectedOrder && x.status === 'waiting')) game.selectedOrder = o.id;
  setTimeout(() => {
    if (c.gone) return;
    c.say(o.english, 8);
    speakAs(c, o.english);
    subtitle(c.name, o.english);
  }, 700);
  sfx('notify');
  toast(`🔔 New request from <b>${c.name}</b> — check the tablet.`);
  tablet.render();
  updateOrdersHud();
}

function customerLeave(c, happy) {
  if (c.leaving) return;
  c.leaving = true;
  const line = happy ? rand(THANKS) : rand(ANGRY);
  c.say(line, 3, happy ? '#e7ffe9' : '#ffe3e3');
  speakAs(c, line);
  c.doGesture(happy ? 'happy' : 'angry', 1.8);
  setTimeout(() => {
    game.spots[c.spotIdx] = null;
    c.gone = true;
    const s = SPOTS[c.spotIdx];
    c.walkTo([[s.x, 7.3], [0, 8.6], [0, 11.5], [0.5, 18]], () => {
      c.dispose();
      game.customers.splice(game.customers.indexOf(c), 1);
    });
    game.spawnTimer = 3 + Math.random() * 4;
  }, 2200);
}

robot.on('delivered', (o) => {
  const secs = (performance.now() - o.created) / 1000;
  const speedBonus = Math.max(0, Math.round(25 - secs / 6));
  game.served++;
  game.addScore(5 * o.items.reduce((s, i) => s + i.qty, 0), 'Delivered');
  if (speedBonus) game.addScore(speedBonus, 'Fast delivery');
  sfx('success');
  toast(`🎉 Order completed for <b>${o.customer.name}</b>!`);
  customerLeave(o.customer, true);
  tablet.render();
  updateOrdersHud();
});
robot.on('status', (s) => { $('#robotStatus').textContent = s; });
robot.on('order', () => { tablet.render(); updateOrdersHud(); });
robot.on('stock', () => { if (game.tabletOpen && tablet.page === 'inventory') tablet.render(); });
robot.obstacles = () => [...game.customers.map((c) => c.root.position), camera.position];

function updateOrders(dt) {
  for (const o of game.orders) {
    if (o.status !== 'waiting' && o.status !== 'queued') continue;
    // patience drains slower once the order is confirmed
    o.patience -= dt / o.patienceTime * (o.status === 'queued' ? 0.4 : 1);
    if (o.patience < 0.3 && !o.warned) { o.warned = true; o.customer.doGesture('impatient', 3); o.customer.say('Excuse me… is anyone helping me?', 3, '#fff4d6'); }
    if (o.patience <= 0) {
      if (o.status === 'queued') { o.patience = 0.01; continue; }   // robot already working — they wait
      o.status = 'cancelled';
      o.customer.gone = true;
      game.addScore(-10, 'Customer left');
      toast(`😞 <b>${o.customer.name}</b> waited too long and left.`);
      customerLeave(o.customer, false);
      tablet.render();
    }
  }
  game.orders = game.orders.filter((o) => !(o.status === 'done' || o.status === 'cancelled') || performance.now() - o.created < 120000);
}

// ---------- HUD ----------
function updateHud() {
  const L = LEVELS[game.level];
  $('#score').textContent = game.score;
  $('#levelName').textContent = `Level ${game.level} — ${L.name}`;
  $('#served').textContent = game.served;
  const total = game.correct + game.mistakes;
  $('#accuracy').textContent = total ? Math.round((game.correct / total) * 100) + '%' : '—';
  const prev = game.level === 1 ? 0 : LEVELS[game.level - 1].next;
  $('#levelBar').style.width = L.next === Infinity ? '100%' : Math.min(100, ((game.score - prev) / (L.next - prev)) * 100) + '%';
  $('#nextLevel').textContent = L.next === Infinity ? 'Max level' : `Next level at ${L.next} ⭐`;
}

function updateOrdersHud() {
  const active = game.orders.filter((o) => o.status !== 'done' && o.status !== 'cancelled');
  $('#ordersList').innerHTML = active.length ? active.map((o) => `
    <div class="ord st-${o.status}"><b>${o.customer.name}</b><span>${statusLabel(o.status)}</span>
    <i style="width:${Math.max(0, o.patience * 100)}%"></i></div>`).join('') : '<div class="muted">No active orders</div>';
}

let toastId = 0;
function toast(html) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = html;
  t.id = 'toast' + toastId++;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 4000);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}
function banner(title, sub) {
  const b = $('#banner');
  b.innerHTML = `<b>${title}</b><span>${sub}</span>`;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}
function floatScore(n, why) {
  const f = document.createElement('div');
  f.className = 'float-score ' + (n >= 0 ? 'pos' : 'neg');
  f.textContent = `${n >= 0 ? '+' : ''}${n} ${why}`;
  $('#scoreFloats').appendChild(f);
  setTimeout(() => f.remove(), 1800);
}
let subTimer;
function subtitle(name, text) {
  const s = $('#subtitle');
  s.innerHTML = `<b>${name}:</b> “${text}”`;
  s.classList.add('show');
  clearTimeout(subTimer);
  subTimer = setTimeout(() => s.classList.remove('show'), 7000);
}

// ---------- Menus ----------
function renderLevelCards() {
  $('#levelCards').innerHTML = Object.entries(LEVELS).map(([n, l]) => `
    <button class="lvcard ${game.level === +n ? 'on' : ''}" data-level="${n}">
      <small>Level ${n}</small><b>${l.name}</b><i>${l.uzName}</i><span>${l.desc}</span></button>`).join('');
}
$('#levelCards').addEventListener('click', (e) => {
  const b = e.target.closest('[data-level]');
  if (!b) return;
  game.level = +b.dataset.level;
  game.saveSettings();
  renderLevelCards();
});
$('#playBtn').addEventListener('click', () => {
  initAudio();
  setSoundEnabled(game.settings.sound);
  game.started = true;
  $('#menu').hidden = true;
  camera.position.set(-8.5, 1.65, 2.6);
  camera.lookAt(-8.5, 1.3, 6);
  updateHud();
  controls.lock();
});
$('#resumeBtn').addEventListener('click', () => controls.lock());
$('#pauseTablet').addEventListener('click', () => { $('#pause').hidden = true; game.openTablet(); });
controls.addEventListener('lock', () => { $('#pause').hidden = true; $('#hud').hidden = false; });
controls.addEventListener('unlock', () => {
  if (!game.started || game.tabletOpen) return;
  $('#pause').hidden = false;
});
document.addEventListener('pointerlockerror', () => { if (game.started && !game.tabletOpen) $('#pause').hidden = false; });
renderer.domElement.addEventListener('click', () => { if (game.started && !game.tabletOpen && !controls.isLocked) controls.lock(); });
renderLevelCards();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------- Main loop ----------
const clock = new THREE.Clock();
function simulate(dt) {
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) { spawnCustomer(); game.spawnTimer = 4 + Math.random() * 4; }
  updateOrders(dt);
  robot.update(dt);
  for (const c of game.customers) c.update(dt, camera);
  world.doors.update(dt, [...game.customers.map((c) => c.root.position), camera.position], () => sfx('door'));
  setMotor(robot.motorLevel || 0, robot.root.position.distanceTo(camera.position));
}
let hudTimer = 0, screenTimer = 0;
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  // The game keeps running while the tablet is open (time matters), but pauses in the pause menu.
  const running = game.started && (controls.isLocked || game.tabletOpen);
  if (running) {
    movePlayer(dt);
    simulate(dt);
  } else {
    setMotor(0);
    if (!game.started) {            // slow camera drift behind the start menu
      const t = clock.elapsedTime * 0.08;
      camera.position.set(Math.sin(t) * 6, 3.2, 7 + Math.cos(t) * 1.5);
      camera.lookAt(0, 1, -5);
      for (const c of game.customers) c.update(dt, camera);
      robot.update(dt);
    }
  }
  hudTimer -= dt;
  if (hudTimer <= 0) { hudTimer = 0.25; updateOrdersHud(); updatePrompt(); }
  screenTimer -= dt;
  if (screenTimer <= 0) { screenTimer = 1; tablet.renderScreen(); if (game.tabletOpen) $('#tabletClock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  if (!window.__noRender) renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
updateHud();
tablet.renderScreen();
loop();

// handy for debugging from the console
window.__game = { game, robot, world, camera, controls, spawnCustomer, tick: (dt) => simulate(dt), render: () => renderer.render(scene, camera) };
