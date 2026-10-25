// Autonomous delivery robot: navigates with A*, picks real products from shelves, delivers to customers.
import * as THREE from 'three';
import { STATION } from './world.js';
import { setMotor, sfx } from './audio.js';

const COLORS = { idle: 0x00e676, moving: 0x2979ff, picking: 0xffc400, delivering: 0xd500f9, waiting: 0xff9100 };

export class Robot {
  constructor(scene, nav, inventory) {
    this.scene = scene;
    this.nav = nav;
    this.inventory = inventory;
    this.root = new THREE.Group();
    this.root.position.set(STATION.x, 0, STATION.z);
    this.yaw = Math.PI;
    this.speed = 1.8;
    this.queue = [];
    this.busy = false;
    this.state = 'idle';
    this.status = 'Charging at dock';
    this.waiters = [];
    this.trayItems = [];
    this.flying = [];
    this.obstacles = () => [];
    this.listeners = {};
    this.t = 0;
    this.build();
    scene.add(this.root);
  }

  on(ev, fn) { this.listeners[ev] = fn; }
  emit(ev, ...a) { this.listeners[ev]?.(...a); }

  build() {
    const white = new THREE.MeshStandardMaterial({ color: 0xf5f7fa, roughness: 0.3, metalness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x263238, roughness: 0.4, metalness: 0.5 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.3 });
    const mk = (geo, m, x, y, z, parent = this.root) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z); mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    mk(new THREE.CylinderGeometry(0.34, 0.36, 0.22, 28), white, 0, 0.17, 0);
    mk(new THREE.CylinderGeometry(0.355, 0.355, 0.05, 28), accent, 0, 0.2, 0);
    this.wheels = [-1, 1].map((s) => {
      const w = mk(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 18), dark, s * 0.33, 0.1, 0);
      w.rotation.z = Math.PI / 2;
      mk(new THREE.BoxGeometry(0.065, 0.02, 0.05), white, 0, 0.09, 0, w).rotation.z = Math.PI / 2;
      return w;
    });
    mk(new THREE.SphereGeometry(0.05, 10, 8), dark, 0, 0.05, 0.25);
    mk(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 24), white, 0, 0.53, 0);
    // tray
    this.tray = new THREE.Group();
    this.tray.position.set(0, 0.8, 0);
    this.root.add(this.tray);
    mk(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), dark, 0, 0, 0, this.tray);
    mk(new THREE.TorusGeometry(0.3, 0.015, 6, 28), accent, 0, 0.02, 0, this.tray).rotation.x = Math.PI / 2;
    mk(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10), dark, 0, 1.0, -0.12);
    // head
    this.head = new THREE.Group();
    this.head.position.set(0, 1.3, -0.12);
    this.root.add(this.head);
    mk(new THREE.SphereGeometry(0.17, 24, 16).scale(1.15, 0.85, 1), white, 0, 0, 0, this.head);
    mk(new THREE.SphereGeometry(0.15, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.6, 0.8).rotateX(Math.PI / 2), dark, 0, 0, 0.06, this.head);
    this.eyeMat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 2 });
    this.eyes = [-1, 1].map((s) => mk(new THREE.SphereGeometry(0.03, 12, 8).scale(1, 1.3, 0.5), this.eyeMat, s * 0.06, 0.01, 0.175, this.head));
    // rotating lidar sensor + antenna light
    this.lidar = mk(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 12), dark, 0, 0.17, 0, this.head);
    mk(new THREE.BoxGeometry(0.02, 0.02, 0.06), accent, 0, 0, 0.05, this.lidar);
    this.lightMat = new THREE.MeshStandardMaterial({ color: COLORS.idle, emissive: COLORS.idle, emissiveIntensity: 2.5 });
    mk(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), dark, 0.1, 0.18, 0, this.head);
    this.light = mk(new THREE.SphereGeometry(0.03, 10, 8), this.lightMat, 0.1, 0.25, 0, this.head);
    this.ring = mk(new THREE.TorusGeometry(0.345, 0.012, 6, 32), this.lightMat, 0, 0.29, 0);
    this.ring.rotation.x = Math.PI / 2;
    // arm: shoulder pivot on the right side, two segments and a gripper
    this.arm = new THREE.Group();
    this.arm.position.set(0.2, 0.95, 0);
    this.root.add(this.arm);
    mk(new THREE.SphereGeometry(0.05, 10, 8), dark, 0, 0, 0, this.arm);
    mk(new THREE.BoxGeometry(0.05, 0.05, 0.35), white, 0, 0, 0.17, this.arm);
    this.fore = new THREE.Group();
    this.fore.position.z = 0.35;
    this.arm.add(this.fore);
    mk(new THREE.BoxGeometry(0.04, 0.04, 0.3), accent, 0, 0, 0.15, this.fore);
    this.grip = new THREE.Group();
    this.grip.position.z = 0.32;
    this.fore.add(this.grip);
    this.fingers = [-1, 1].map((s) => mk(new THREE.BoxGeometry(0.012, 0.03, 0.07), dark, s * 0.035, 0, 0.03, this.grip));
    this.armPose = { sh: 0.9, el: -2.2, yaw: 0 };   // folded
    this.armTarget = { ...this.armPose };
    this.root.traverse((o) => (o.userData.interact = { type: 'robot' }));
  }

  setState(s, status) {
    this.state = s;
    if (status) this.status = status;
    this.lightMat.color.setHex(COLORS[s]);
    this.lightMat.emissive.setHex(COLORS[s]);
    this.emit('status', this.status);
  }

  enqueue(job) { this.queue.push(job); this.emit('status', this.status); if (!this.busy) this.run(); }

  // ---- coroutine helpers driven by update() ----
  until(fn) { return new Promise((res) => this.waiters.push({ fn, res })); }
  wait(sec) { let t = 0; return this.until((dt) => (t += dt) >= sec); }
  moveTo(x, z) {
    const p = this.root.position;
    this.path = this.nav.findPath(p.x, p.z, x, z).map(([a, b]) => new THREE.Vector3(a, 0, b));
    this.goal = new THREE.Vector3(x, 0, z);
    this.blockedFor = 0;
    return this.until(() => !this.path.length);
  }
  turnTo(yaw) { this.yawTarget = yaw; return this.until(() => Math.abs(angDiff(this.yaw, yaw)) < 0.03); }
  setArm(sh, el, yaw = 0, sec = 0.5) { this.armTarget = { sh, el, yaw }; return this.wait(sec); }

  async run() {
    this.busy = true;
    while (this.queue.length) {
      const job = this.queue.shift();
      try { await this.doJob(job); } catch (e) { console.error(e); }
    }
    this.setState('moving', 'Returning to dock');
    await this.moveTo(STATION.x, STATION.z);
    await this.turnTo(Math.PI);
    this.setState('idle', 'Charging at dock');
    this.busy = false;
    if (this.queue.length) this.run();
  }

  async doJob(job) {
    const { order } = job;
    order.status = 'picking';
    this.emit('order', order);
    // Group reserved items by shelf slot so each shelf is visited once.
    const bySlot = new Map();
    for (const it of job.items) {
      if (!bySlot.has(it.slot)) bySlot.set(it.slot, []);
      bySlot.get(it.slot).push(it);
    }
    for (const [slot, items] of bySlot) {
      if (order.customer.gone) break;
      this.setState('moving', `Going to ${slot.product.name} (aisle ${slot.aisle})`);
      await this.moveTo(slot.accessX, slot.accessZ);
      await this.turnTo(slot.faceYaw);
      this.setState('picking', `Picking ${slot.product.name}`);
      for (const item of items) await this.pick(item);
      await this.setArm(0.9, -2.2, 0, 0.4);
    }
    if (order.customer.gone) {           // customer left — put things back in stock
      this.clearTray(job.items);
      return;
    }
    order.status = 'delivering';
    this.emit('order', order);
    const c = order.customer;
    const cp = c.root.position;
    this.setState('delivering', `Delivering to ${c.name}`);
    await this.moveTo(cp.x, cp.z + 1.05);
    await this.turnTo(Math.PI);
    if (c.gone) { this.clearTray(job.items); return; }
    c.faceTowards(this.root.position.x, this.root.position.z);
    c.doGesture('receive', 2.2);
    sfx('beep');
    // delivery animation: lift tray, items glide into the customer's hands
    await this.setArm(-0.2, -0.3, 0, 0.4);
    for (const m of this.trayItems) {
      const start = new THREE.Vector3(); m.getWorldPosition(start);
      this.scene.attach(m);
      const end = cp.clone().add(new THREE.Vector3(0, 1.0, 0.25));
      this.fly(m, start, end, 0.45, () => this.scene.remove(m));
      await this.wait(0.18);
    }
    this.trayItems = [];
    await this.wait(0.5);
    await this.setArm(0.9, -2.2, 0, 0.3);
    order.status = 'done';
    this.emit('delivered', order);
  }

  async pick(item) {
    // reach towards the item height, grab, lift onto tray
    const reach = item.pos.y < 0.4 ? [1.0, 0.2] : item.pos.y < 0.9 ? [0.35, 0.1] : item.pos.y < 1.3 ? [-0.15, 0.05] : [-0.5, -0.1];
    await this.setArm(reach[0], reach[1], 0, 0.45);
    this.fingers.forEach((f, i) => (f.position.x = (i ? 1 : -1) * 0.02));
    const mesh = this.inventory.take(item);
    sfx('pick');
    this.emit('stock', item.slot.product.id);
    const gp = new THREE.Vector3(); this.grip.getWorldPosition(gp);
    await this.fly(mesh, mesh.position.clone(), gp, 0.3);
    await this.setArm(0.9, -1.6, 0, 0.35);
    // place on tray in a little ring
    const n = this.trayItems.length;
    const a = n * 2.4, r = n === 0 ? 0 : 0.12 + (n > 6 ? 0.08 : 0);
    const local = new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r);
    const world = this.tray.localToWorld(local.clone());
    await this.fly(mesh, mesh.position.clone(), world, 0.25);
    this.tray.attach(mesh);
    mesh.position.copy(local);
    this.trayItems.push(mesh);
    this.fingers.forEach((f, i) => (f.position.x = (i ? 1 : -1) * 0.035));
  }

  // The customer left: put everything back on the shelves.
  clearTray(items) {
    for (const m of this.trayItems) this.tray.remove(m);
    this.trayItems = [];
    const touched = new Set();
    for (const it of items) { it.alive = true; it.reserved = false; touched.add(it.slot.product.id); }
    touched.forEach((id) => { this.inventory.refresh(this.inventory.byId[id]); this.emit('stock', id); });
  }

  fly(mesh, from, to, dur, done) {
    return new Promise((res) => this.flying.push({ mesh, from, to, dur, t: 0, done, res }));
  }

  update(dt) {
    this.t += dt;
    for (const w of [...this.waiters]) if (w.fn(dt)) { this.waiters.splice(this.waiters.indexOf(w), 1); w.res(); }
    for (const f of [...this.flying]) {
      f.t += dt;
      const k = Math.min(1, f.t / f.dur), e = k * k * (3 - 2 * k);
      f.mesh.position.lerpVectors(f.from, f.to, e);
      f.mesh.position.y += Math.sin(Math.PI * k) * 0.15;
      if (k >= 1) { this.flying.splice(this.flying.indexOf(f), 1); f.done?.(); f.res(); }
    }

    // path following with simple obstacle waiting
    let moving = 0;
    const p = this.root.position;
    if (this.path?.length) {
      const t = this.path[0];
      const dx = t.x - p.x, dz = t.z - p.z, d = Math.hypot(dx, dz);
      if (d < 0.08) this.path.shift();
      else {
        const want = Math.atan2(dx, dz);
        const diff = angDiff(this.yaw, want);
        this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), dt * 4);
        const nearGoal = p.distanceTo(this.goal) < 1.4;
        const blocked = !nearGoal && this.obstacles().some((o) => {
          const ox = o.x - p.x, oz = o.z - p.z, od = Math.hypot(ox, oz);
          return od < 1.0 && (ox * dx + oz * dz) / (od * d) > 0.3;
        });
        if (blocked) {
          if (this.state !== 'waiting') { this.prevState = this.state; this.setState('waiting', 'Waiting — path blocked'); sfx('beep'); }
          this.blockedFor += dt;
          if (this.blockedFor > 4) { this.blockedFor = 0; this.path.unshift(new THREE.Vector3(p.x + Math.cos(this.yaw) * 0.6, 0, p.z - Math.sin(this.yaw) * 0.6)); }
        } else {
          if (this.state === 'waiting') this.setState(this.prevState || 'moving');
          const turnSlow = Math.abs(diff) > 0.6 ? 0.2 : 1;
          const step = Math.min(d, this.speed * dt * turnSlow);
          p.x += (dx / d) * step; p.z += (dz / d) * step;
          moving = turnSlow;
        }
      }
    } else if (this.yawTarget !== undefined) {
      const diff = angDiff(this.yaw, this.yawTarget);
      this.yaw += Math.sign(diff) * Math.min(Math.abs(diff), dt * 3.5);
      if (Math.abs(diff) > 0.03) moving = 0.3;
    }
    this.root.rotation.y = this.yaw;

    this.wheels.forEach((w) => (w.rotation.x += moving * this.speed * dt / 0.1));
    this.lidar.rotation.y += dt * (moving ? 12 : 3);
    this.root.children[0].position.y = 0.17 + (moving ? Math.sin(this.t * 30) * 0.004 : 0);
    this.head.rotation.y = moving ? Math.sin(this.t * 1.5) * 0.25 : Math.sin(this.t * 0.6) * 0.4;
    // blink
    const blink = (this.t % 3.5) < 0.12 ? 0.1 : 1;
    this.eyes.forEach((e) => (e.scale.y = blink));
    this.lightMat.emissiveIntensity = 1.8 + Math.sin(this.t * (this.state === 'idle' ? 2 : 8)) * 0.8;

    const a = this.armPose, T = this.armTarget, k = Math.min(1, dt * 8);
    a.sh += (T.sh - a.sh) * k; a.el += (T.el - a.el) * k;
    this.arm.rotation.x = a.sh;
    this.fore.rotation.x = a.el;
    this.motorLevel = moving;
  }
}

function angDiff(a, b) { return Math.atan2(Math.sin(b - a), Math.cos(b - a)); }
