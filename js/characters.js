// Procedural, animated 3D customers: unique looks, walking, idle, talking gestures, speech bubbles.
import * as THREE from 'three';

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0xd1a17a];
const HAIR = [0x2b1b0e, 0x6a4e23, 0xd8b45a, 0x111111, 0xa0522d, 0x9e9e9e, 0x4a2c1a];
const SHIRT = [0xe63946, 0x457b9d, 0x2a9d8f, 0xf4a261, 0x9b5de5, 0x06d6a0, 0xffbe0b, 0xef476f, 0x3a86ff, 0x8338ec, 0xffffff];
const PANTS = [0x22223b, 0x1d3557, 0x6c584c, 0x3d405b, 0x264653, 0x5c677d];
const HAIRSTYLES = ['short', 'long', 'bun', 'cap', 'bald', 'curly', 'ponytail'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...o });

function part(parent, geo, material, x, y, z) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export class Customer {
  constructor(scene, { name, accent, pitch }) {
    this.scene = scene;
    this.name = name;
    this.accent = accent;
    this.pitch = pitch;
    this.root = new THREE.Group();
    this.path = [];
    this.speed = 1.1 + Math.random() * 0.35;
    this.yaw = 0;
    this.targetYaw = 0;
    this.phase = Math.random() * 10;
    this.walkAmt = 0;
    this.talkTime = 0;
    this.gesture = null;      // 'wave' | 'receive' | 'happy' | 'angry'
    this.gestureTime = 0;
    this.lookTimer = 2 + Math.random() * 4;
    this.headYawTarget = 0;
    this.build();
    scene.add(this.root);
  }

  build() {
    const height = 0.9 + Math.random() * 0.22;
    const width = 0.88 + Math.random() * 0.3;
    const skin = mat(pick(SKIN));
    const shirt = mat(pick(SHIRT));
    const pants = mat(pick(PANTS));
    const shoes = mat(pick([0x111111, 0xffffff, 0x5d4037, 0x9e2a2b]));
    const hairMat = mat(pick(HAIR), { roughness: 0.9 });
    const dress = Math.random() < 0.25;

    const body = new THREE.Group();
    body.scale.set(width, height, width);
    this.root.add(body);
    this.body = body;
    const hipY = 0.92;

    // Legs pivot at the hips; knees bend on the lower leg.
    this.legs = [-1, 1].map((s) => {
      const hip = new THREE.Group();
      hip.position.set(s * 0.1, hipY, 0);
      body.add(hip);
      part(hip, new THREE.BoxGeometry(0.14, 0.46, 0.15), pants, 0, -0.23, 0);
      const knee = new THREE.Group();
      knee.position.y = -0.46;
      hip.add(knee);
      part(knee, new THREE.BoxGeometry(0.12, 0.42, 0.13), dress ? skin : pants, 0, -0.21, 0);
      part(knee, new THREE.BoxGeometry(0.13, 0.07, 0.24), shoes, 0, -0.43, 0.04);
      return { hip, knee };
    });

    this.torso = new THREE.Group();
    this.torso.position.y = hipY;
    body.add(this.torso);
    part(this.torso, new THREE.BoxGeometry(0.4, 0.58, 0.23), shirt, 0, 0.3, 0);
    if (dress) part(this.torso, new THREE.CylinderGeometry(0.2, 0.33, 0.45, 12), shirt, 0, -0.12, 0);
    part(this.torso, new THREE.BoxGeometry(0.41, 0.06, 0.24), mat(0x333333), 0, 0.02, 0);   // belt
    part(this.torso, new THREE.CylinderGeometry(0.055, 0.06, 0.08, 10), skin, 0, 0.62, 0);   // neck

    this.arms = [-1, 1].map((s) => {
      const sh = new THREE.Group();
      sh.position.set(s * 0.26, 0.54, 0);
      this.torso.add(sh);
      part(sh, new THREE.BoxGeometry(0.1, 0.3, 0.11), shirt, 0, -0.14, 0);
      const elbow = new THREE.Group();
      elbow.position.y = -0.3;
      sh.add(elbow);
      part(elbow, new THREE.BoxGeometry(0.09, 0.27, 0.1), skin, 0, -0.13, 0);
      part(elbow, new THREE.SphereGeometry(0.055, 10, 8), skin, 0, -0.3, 0);
      return { sh, elbow };
    });

    // Head
    this.head = new THREE.Group();
    this.head.position.y = 0.8;
    this.torso.add(this.head);
    part(this.head, new THREE.SphereGeometry(0.13, 18, 14).scale(1, 1.1, 1), skin, 0, 0, 0);
    const eye = mat(0x1a1a1a, { roughness: 0.3 });
    for (const s of [-1, 1]) {
      part(this.head, new THREE.SphereGeometry(0.018, 8, 6), eye, s * 0.045, 0.02, 0.12);
      part(this.head, new THREE.BoxGeometry(0.05, 0.01, 0.01), hairMat, s * 0.045, 0.065, 0.122);
    }
    part(this.head, new THREE.SphereGeometry(0.02, 8, 6), skin, 0, -0.02, 0.135);  // nose
    this.mouth = part(this.head, new THREE.BoxGeometry(0.05, 0.012, 0.01), mat(0x8b2e2e), 0, -0.07, 0.12);
    for (const s of [-1, 1]) part(this.head, new THREE.SphereGeometry(0.025, 8, 6), skin, s * 0.13, 0, 0);  // ears

    const style = pick(HAIRSTYLES);
    if (style !== 'bald') {
      const capGeo = new THREE.SphereGeometry(0.138, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.55);
      if (style === 'cap') {
        const capMat = mat(pick(SHIRT));
        part(this.head, capGeo, capMat, 0, 0.02, 0);
        part(this.head, new THREE.BoxGeometry(0.2, 0.015, 0.12), capMat, 0, 0.06, 0.15);
      } else {
        part(this.head, capGeo, hairMat, 0, 0.015, -0.005);
      }
      if (style === 'long') part(this.head, new THREE.BoxGeometry(0.27, 0.32, 0.08), hairMat, 0, -0.1, -0.09);
      if (style === 'bun') part(this.head, new THREE.SphereGeometry(0.06, 10, 8), hairMat, 0, 0.13, -0.08);
      if (style === 'ponytail') part(this.head, new THREE.CylinderGeometry(0.03, 0.05, 0.25, 8), hairMat, 0, -0.06, -0.15);
      if (style === 'curly') for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        part(this.head, new THREE.SphereGeometry(0.05, 8, 6), hairMat, Math.cos(a) * 0.11, 0.08, Math.sin(a) * 0.11);
      }
    }
    if (Math.random() < 0.3) {   // glasses
      const gm = mat(0x111111);
      for (const s of [-1, 1]) part(this.head, new THREE.TorusGeometry(0.03, 0.006, 6, 14), gm, s * 0.048, 0.02, 0.13);
      part(this.head, new THREE.BoxGeometry(0.03, 0.006, 0.006), gm, 0, 0.025, 0.132);
    }
    if (style === 'short' && Math.random() < 0.4) part(this.head, new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, Math.PI * 0.55, Math.PI * 0.4), hairMat, 0, -0.02, 0.02);  // beard

    // Some customers carry a basket
    if (Math.random() < 0.4) {
      const basket = new THREE.Group();
      part(basket, new THREE.BoxGeometry(0.32, 0.18, 0.22), mat(pick([0xd62828, 0x1e88e5])), 0, -0.14, 0);
      basket.position.set(0, -0.32, 0.05);
      this.arms[0].elbow.add(basket);
      this.basket = basket;
    }

    // Speech bubble sprite
    this.bubbleCanvas = document.createElement('canvas');
    this.bubbleCanvas.width = 1024; this.bubbleCanvas.height = 320;
    this.bubbleTex = new THREE.CanvasTexture(this.bubbleCanvas);
    this.bubbleTex.colorSpace = THREE.SRGBColorSpace;
    this.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bubbleTex, depthTest: false, transparent: true }));
    this.bubble.scale.set(1.9, 0.6, 1);
    this.bubble.position.y = 2.35 * height;
    this.bubble.renderOrder = 10;
    this.bubble.visible = false;
    this.root.add(this.bubble);
    this.bubbleTimer = 0;

    this.root.traverse((o) => (o.userData.interact = { type: 'customer', customer: this }));
  }

  say(text, seconds = 6, tone = '#ffffff') {
    const c = this.bubbleCanvas, g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = tone; g.strokeStyle = '#2b2140'; g.lineWidth = 8;
    const r = 40, w = c.width - 20, h = c.height - 70;
    g.beginPath();
    g.roundRect(10, 10, w, h, r);
    g.moveTo(c.width / 2 - 30, h + 10); g.lineTo(c.width / 2, c.height - 8); g.lineTo(c.width / 2 + 30, h + 10);
    g.fill(); g.stroke();
    g.fillStyle = tone; g.fillRect(c.width / 2 - 26, h, 52, 16);
    g.fillStyle = '#2b2140'; g.textAlign = 'center'; g.textBaseline = 'middle';
    let size = 50, lines;
    do {
      g.font = `700 ${size}px Nunito, Arial`;
      lines = wrap(g, text, w - 60);
      size -= 4;
    } while (lines.length * size * 1.25 > h - 30 && size > 22);
    const lh = (size + 4) * 1.2;
    lines.forEach((l, i) => g.fillText(l, c.width / 2, 10 + h / 2 + (i - (lines.length - 1) / 2) * lh));
    this.bubbleTex.needsUpdate = true;
    this.bubble.visible = true;
    this.bubbleTimer = seconds;
    this.talkTime = Math.min(seconds, 2 + text.length * 0.05);
  }

  walkTo(points, onArrive) {
    this.path = points.map(([x, z]) => new THREE.Vector3(x, 0, z));
    this.onArrive = onArrive;
  }
  faceTowards(x, z) { this.targetYaw = Math.atan2(x - this.root.position.x, z - this.root.position.z); }
  doGesture(type, time = 1.6) { this.gesture = type; this.gestureTime = time; }

  update(dt, camera) {
    const pos = this.root.position;
    let moving = false;
    if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - pos.x, dz = t.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.05) {
        this.path.shift();
        if (!this.path.length) { const cb = this.onArrive; this.onArrive = null; cb?.(); }
      } else {
        const step = Math.min(d, this.speed * dt);
        pos.x += (dx / d) * step; pos.z += (dz / d) * step;
        this.targetYaw = Math.atan2(dx, dz);
        moving = true;
      }
    }
    // Smooth turning
    let dy = this.targetYaw - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * Math.min(1, dt * 6);
    this.root.rotation.y = this.yaw;

    // Walk cycle blending
    this.walkAmt += ((moving ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 6);
    this.phase += dt * (moving ? this.speed * 5.5 : 1.5);
    const w = this.walkAmt, s = Math.sin(this.phase);
    this.legs[0].hip.rotation.x = s * 0.55 * w;
    this.legs[1].hip.rotation.x = -s * 0.55 * w;
    this.legs[0].knee.rotation.x = Math.max(0, -Math.cos(this.phase)) * 0.7 * w;
    this.legs[1].knee.rotation.x = Math.max(0, Math.cos(this.phase)) * 0.7 * w;
    this.body.position.y = Math.abs(Math.cos(this.phase)) * 0.035 * w;
    let armL = -s * 0.45 * w, armR = s * 0.45 * w, armRz = 0, armLz = 0, elbowR = -0.15, elbowL = -0.15;
    if (this.basket) { armL = -0.2; elbowL = -1.2; }

    // Idle: breathing, sway and looking around
    const breathe = Math.sin(this.phase * 1.3) * 0.012 * (1 - w);
    this.torso.scale.set(1, 1 + breathe, 1 + breathe);
    this.torso.rotation.z = Math.sin(this.phase * 0.5) * 0.02 * (1 - w);
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.headYawTarget = moving ? 0 : (Math.random() - 0.5) * 1.2;
      this.lookTimer = 2 + Math.random() * 4;
    }

    // Talking: mouth, nodding and a hand gesture
    if (this.talkTime > 0) {
      this.talkTime -= dt;
      this.mouth.scale.y = 1 + Math.abs(Math.sin(this.phase * 9)) * 3;
      this.head.rotation.x = Math.sin(this.phase * 3) * 0.06;
      armR = -0.9 + Math.sin(this.phase * 2.5) * 0.25; armRz = 0.25; elbowR = -0.9;
      this.headYawTarget = 0;
    } else {
      this.mouth.scale.y = 1;
      this.head.rotation.x *= 0.9;
    }

    if (this.gestureTime > 0) {
      this.gestureTime -= dt;
      const k = Math.sin(this.phase * 6);
      if (this.gesture === 'wave') { armR = -2.6; armRz = 0.3 + k * 0.3; elbowR = -0.3; }
      if (this.gesture === 'receive') { armR = -1.2; armL = -1.2; elbowR = elbowL = -0.4; }
      if (this.gesture === 'happy') { armR = -2.8; armL = -2.8; armRz = 0.3; armLz = -0.3; this.body.position.y = Math.abs(k) * 0.08; }
      if (this.gesture === 'angry') { armR = armL = -0.3; armRz = 0.6; armLz = -0.6; this.head.rotation.y = k * 0.4; }
      if (this.gesture === 'impatient') { this.legs[1].hip.rotation.x = Math.max(0, k) * -0.3; }
    } else {
      this.head.rotation.y += (this.headYawTarget - this.head.rotation.y) * Math.min(1, dt * 3);
    }

    const lerp = (o, v) => o + (v - o) * Math.min(1, dt * 10);
    this.arms[0].sh.rotation.x = lerp(this.arms[0].sh.rotation.x, armL);
    this.arms[1].sh.rotation.x = lerp(this.arms[1].sh.rotation.x, armR);
    this.arms[0].sh.rotation.z = lerp(this.arms[0].sh.rotation.z, armLz);
    this.arms[1].sh.rotation.z = lerp(this.arms[1].sh.rotation.z, armRz);
    this.arms[0].elbow.rotation.x = lerp(this.arms[0].elbow.rotation.x, elbowL);
    this.arms[1].elbow.rotation.x = lerp(this.arms[1].elbow.rotation.x, elbowR);

    if (this.bubbleTimer > 0) {
      this.bubbleTimer -= dt;
      if (this.bubbleTimer <= 0) this.bubble.visible = false;
    }
    // Hide the bubble when the camera is very close so it doesn't block the view.
    if (camera && this.bubble.visible) this.bubble.material.opacity = THREE.MathUtils.clamp((camera.position.distanceTo(pos) - 0.8) / 1.2, 0.15, 1);
  }

  dispose() {
    this.scene.remove(this.root);
    this.root.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
  }
}

function wrap(g, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
