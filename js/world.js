// Builds the 3D supermarket: building, aisles, shelves, instanced products, counter, tablet, doors.
import * as THREE from 'three';
import { CATEGORIES, PRODUCTS } from './data.js';
import { NavGrid } from './path.js';

export const ROWS = [-10, -5, 0, 5, 10];            // shelf row centre x
export const SLOT_Z = [-11, -9, -7, -5, -3];         // 2 m slots along each row
export const LEVEL_Y = [0.12, 0.55, 0.98, 1.41];     // shelf board tops
export const COUNTER = { x1: -12, x2: -5, z1: 4.1, z2: 4.9, h: 1.0 };
export const SPOTS = [{ x: -8.5, z: 5.7 }, { x: -10.6, z: 5.7 }, { x: -6.4, z: 5.7 }];
export const STATION = { x: -3.3, z: 3.0 };
export const DOOR = { x: 0, z: 10 };

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });

function addBox(parent, w, h, d, mat, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function textTexture(lines, { w = 512, h = 128, bg = '#ffffff', fg = '#222', sizes = [56, 36], font = 'Nunito, Arial' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const total = lines.length;
  lines.forEach((t, i) => {
    g.font = `800 ${sizes[i] || sizes.at(-1)}px ${font}`;
    g.globalAlpha = i === 0 ? 1 : 0.8;
    g.fillText(t, w / 2, (h / (total + 1)) * (i + 1));
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// ---------- Procedural product models ----------
// Returns parts [{geo, color}] with geometry already positioned so the base sits at y = 0, plus footprint width and height.
function modelParts(p) {
  const parts = [];
  const add = (geo, color, x = 0, y = 0, z = 0, rx = 0, rz = 0) => {
    if (rx) geo.rotateX(rx);
    if (rz) geo.rotateZ(rz);
    geo.translate(x, y, z);
    parts.push({ geo, color });
  };
  let w = 0.1, h = 0.2;
  switch (p.model) {
    case 'bottle':
      add(new THREE.CylinderGeometry(0.042, 0.045, 0.2, 14), p.col, 0, 0.1);
      add(new THREE.CylinderGeometry(0.047, 0.047, 0.07, 14), p.acc, 0, 0.1);
      add(new THREE.CylinderGeometry(0.018, 0.035, 0.06, 10), p.col, 0, 0.23);
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 10), p.acc, 0, 0.27);
      w = 0.1; h = 0.28; break;
    case 'can':
      add(new THREE.CylinderGeometry(0.034, 0.034, 0.12, 14), p.col, 0, 0.06);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14), p.acc, 0, 0.07);
      w = 0.075; h = 0.12; break;
    case 'carton':
      add(new THREE.BoxGeometry(0.075, 0.19, 0.075), p.col, 0, 0.095);
      add(new THREE.BoxGeometry(0.078, 0.06, 0.078), p.acc, 0, 0.1);
      add(new THREE.CylinderGeometry(0.001, 0.055, 0.04, 4).rotateY(Math.PI / 4), p.col, 0, 0.21);
      w = 0.09; h = 0.23; break;
    case 'eggs':
      add(new THREE.BoxGeometry(0.24, 0.07, 0.12), p.col, 0, 0.035);
      add(new THREE.BoxGeometry(0.2, 0.012, 0.09), p.acc, 0, 0.074);
      w = 0.26; h = 0.08; break;
    case 'cheese':
      add(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 3), p.col, 0, 0.035);
      add(new THREE.CylinderGeometry(0.091, 0.091, 0.012, 3), p.acc, 0, 0.065);
      w = 0.17; h = 0.07; break;
    case 'cup':
      add(new THREE.CylinderGeometry(0.042, 0.034, 0.08, 14), p.col, 0, 0.04);
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.01, 14), p.acc, 0, 0.083);
      w = 0.095; h = 0.09; break;
    case 'loaf':
      add(new THREE.CapsuleGeometry(0.055, 0.14, 4, 10), p.col, 0, 0.055, 0, 0, Math.PI / 2);
      add(new THREE.BoxGeometry(0.12, 0.012, 0.06), p.acc, 0, 0.105);
      w = 0.27; h = 0.11; break;
    case 'bag':
      add(new THREE.BoxGeometry(0.15, 0.22, 0.07), p.col, 0, 0.11);
      add(new THREE.BoxGeometry(0.152, 0.07, 0.072), p.acc, 0, 0.12);
      add(new THREE.BoxGeometry(0.13, 0.02, 0.03), p.col, 0, 0.23);
      w = 0.17; h = 0.24; break;
    case 'box': {
      const [bw, bh, bd] = p.flat ? [0.2, 0.07, 0.1] : p.small ? [0.08, 0.13, 0.025] : [0.17, 0.26, 0.06];
      add(new THREE.BoxGeometry(bw, bh, bd), p.col, 0, bh / 2);
      add(new THREE.BoxGeometry(bw * 0.7, bh * 0.35, bd + 0.004), p.acc, 0, bh * 0.55);
      w = bw + 0.03; h = bh; break;
    }
    case 'fruit': {
      const r = p.size || 0.08;
      add(new THREE.SphereGeometry(r, 14, 10).scale(1, 0.92, 1), p.col, 0, r * 0.92);
      add(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 5), p.acc, 0, r * 1.85);
      w = r * 2.2; h = r * 2; break;
    }
    case 'banana':
      for (let i = 0; i < 3; i++) {
        add(new THREE.TorusGeometry(0.1, 0.022, 6, 12, Math.PI * 0.65).rotateZ(Math.PI * 0.18), p.col, -0.03, 0.12 - i * 0.004, (i - 1) * 0.035);
      }
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 5), p.acc, 0.04, 0.18);
      w = 0.24; h = 0.2; break;
    case 'potato':
      add(new THREE.SphereGeometry(0.06, 10, 8).scale(1.3, 0.8, 0.9), p.col, 0, 0.048);
      w = 0.17; h = 0.1; break;
    case 'carrot':
      add(new THREE.ConeGeometry(0.026, 0.2, 10), p.col, 0, 0.026, 0, 0, Math.PI / 2);
      add(new THREE.ConeGeometry(0.02, 0.07, 6), p.acc, 0.13, 0.026, 0, 0, -Math.PI / 2);
      w = 0.07; h = 0.06; break;
    case 'bar':
      add(new THREE.BoxGeometry(0.07, 0.16, 0.016), p.col, 0, 0.08);
      add(new THREE.BoxGeometry(0.072, 0.05, 0.018), p.acc, 0, 0.11);
      w = 0.085; h = 0.16; break;
    case 'headphones':
      add(new THREE.TorusGeometry(0.07, 0.01, 6, 16, Math.PI), p.col, 0, 0.06);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), p.acc, -0.07, 0.04, 0, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), p.acc, 0.07, 0.04, 0, 0, Math.PI / 2);
      w = 0.2; h = 0.14; break;
    case 'bulb':
      add(new THREE.SphereGeometry(0.04, 12, 10), p.col, 0, 0.09);
      add(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10), p.acc, 0, 0.03);
      w = 0.09; h = 0.13; break;
    case 'spray':
      add(new THREE.CylinderGeometry(0.04, 0.045, 0.19, 12).scale(1, 1, 0.6), p.col, 0, 0.095);
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8), p.acc, 0, 0.215);
      add(new THREE.BoxGeometry(0.06, 0.015, 0.015), p.acc, 0.02, 0.235);
      w = 0.1; h = 0.24; break;
    case 'sponge':
      add(new THREE.BoxGeometry(0.1, 0.035, 0.065), p.col, 0, 0.0175);
      add(new THREE.BoxGeometry(0.1, 0.012, 0.065), p.acc, 0, 0.041);
      w = 0.12; h = 0.05; break;
    case 'soap':
      add(new THREE.SphereGeometry(0.05, 12, 8).scale(1, 0.4, 0.65), p.col, 0, 0.02);
      w = 0.11; h = 0.04; break;
    case 'tube':
      add(new THREE.CylinderGeometry(0.022, 0.028, 0.15, 10), p.col, 0, 0.09);
      add(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8), p.acc, 0, 0.015);
      w = 0.07; h = 0.17; break;
    case 'roll':
      for (let i = 0; i < 2; i++) add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 14), p.col, (i - 0.5) * 0.1, 0.05);
      add(new THREE.BoxGeometry(0.2, 0.04, 0.102), p.acc, 0, 0.05);
      w = 0.22; h = 0.1; break;
  }
  return { parts, w, h };
}

const modelCache = {};
export function productModel(p) {
  if (!modelCache[p.id]) {
    const m = modelParts(p);
    m.mats = m.parts.map((pt) => std(pt.color, { roughness: 0.45 }));
    modelCache[p.id] = m;
  }
  return modelCache[p.id];
}

// A real (non-instanced) mesh of a product, for the robot to carry.
export function productMesh(p) {
  const m = productModel(p);
  const g = new THREE.Group();
  m.parts.forEach((pt, i) => {
    const mesh = new THREE.Mesh(pt.geo, m.mats[i]);
    mesh.castShadow = true;
    g.add(mesh);
  });
  return g;
}

// ---------- Inventory: every product on every shelf is an instance the robot can really take ----------
export class Inventory {
  constructor(scene) {
    this.scene = scene;
    this.byId = {};
    this.slots = [];
    this.meshes = [];
  }

  // Lay out capacity positions for every slot, then create instanced meshes per product part.
  build() {
    const tmp = new THREE.Object3D();
    PRODUCTS.forEach((p) => (this.byId[p.id] = { p, items: [], parts: [] }));
    for (const it of this.slots) {
      const m = productModel(it.product);
      const perLevel = Math.max(1, Math.min(6, Math.floor(1.7 / m.w)));
      const levels = it.product.model === 'eggs' || m.h < 0.12 ? [0, 1, 2, 3] : [0, 1, 2, 3];
      for (const lv of levels) {
        for (let k = 0; k < perLevel; k++) {
          const z = it.z - 0.85 + (1.7 / perLevel) * (k + 0.5);
          const pos = new THREE.Vector3(it.itemX, LEVEL_Y[lv] + 0.016, z);
          this.byId[it.product.id].items.push({ slot: it, pos, rotY: it.side * Math.PI / 2 + (Math.random() - 0.5) * 0.15, alive: true, reserved: false, index: 0 });
        }
      }
    }
    for (const rec of Object.values(this.byId)) {
      const m = productModel(rec.p);
      rec.items.forEach((item, i) => (item.index = i));
      rec.parts = m.parts.map((pt, i) => {
        const im = new THREE.InstancedMesh(pt.geo, m.mats[i], rec.items.length);
        im.userData.interact = { type: 'product', product: rec.p };
        im.receiveShadow = true;
        this.scene.add(im);
        this.meshes.push(im);
        return im;
      });
      // Start with a partly stocked shelf; a couple of products start almost sold out.
      const fill = 0.45 + Math.random() * 0.5;
      rec.items.forEach((item) => (item.alive = Math.random() < fill));
      this.refresh(rec, tmp);
    }
    const low = [...PRODUCTS].sort(() => Math.random() - 0.5).slice(0, 3);
    low.forEach((p, i) => {
      const rec = this.byId[p.id];
      rec.items.forEach((it, k) => (it.alive = k < i));
      this.refresh(rec, tmp);
    });
  }

  refresh(rec, tmp = new THREE.Object3D()) {
    for (const item of rec.items) {
      tmp.position.copy(item.pos);
      tmp.rotation.set(0, item.rotY, 0);
      tmp.scale.setScalar(item.alive ? 1 : 0);
      tmp.updateMatrix();
      rec.parts.forEach((im) => im.setMatrixAt(item.index, tmp.matrix));
    }
    rec.parts.forEach((im) => { im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); });
  }

  stock(id) { return this.byId[id].items.filter((i) => i.alive).length; }
  available(id) { return this.byId[id].items.filter((i) => i.alive && !i.reserved).length; }
  location(id) {
    const s = this.slots.find((sl) => sl.product.id === id);
    return s ? `Aisle ${s.aisle}, ${s.sideName} side` : '-';
  }

  // Reserve qty items, preferring items from as few slots as possible (nearest to the front).
  reserve(id, qty) {
    const free = this.byId[id].items.filter((i) => i.alive && !i.reserved)
      .sort((a, b) => (b.slot.z - a.slot.z) || (b.pos.y - a.pos.y));
    const chosen = free.slice(0, qty);
    chosen.forEach((i) => (i.reserved = true));
    return chosen;
  }
  release(items) { items.forEach((i) => (i.reserved = false)); }

  // Take an item off the shelf: hide the instance and return a real mesh at the same spot.
  take(item) {
    const rec = this.byId[item.slot.product.id];
    item.alive = false; item.reserved = false;
    this.refresh(rec);
    const mesh = productMesh(rec.p);
    mesh.position.copy(item.pos);
    mesh.rotation.y = item.rotY;
    this.scene.add(mesh);
    return mesh;
  }

  restock(id) {
    const rec = this.byId[id];
    rec.items.forEach((i) => { if (!i.reserved) i.alive = true; });
    this.refresh(rec);
  }
}

// ---------- The building ----------
export function buildWorld(scene) {
  const colliders = [];   // AABBs for the player
  const interactables = [];
  const nav = new NavGrid(-14, -14, 14, 10, 0.5);
  const collide = (x1, z1, x2, z2) => colliders.push({ minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2) });

  // Floor tiles
  const fc = document.createElement('canvas');
  fc.width = fc.height = 256;
  const fg = fc.getContext('2d');
  for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
    fg.fillStyle = (x + y) % 2 ? '#e9e4dc' : '#f6f3ee';
    fg.fillRect(x * 128, y * 128, 128, 128);
  }
  fg.strokeStyle = '#cfc8bd'; fg.lineWidth = 3;
  for (let i = 0; i <= 2; i++) { fg.beginPath(); fg.moveTo(i * 128, 0); fg.lineTo(i * 128, 256); fg.moveTo(0, i * 128); fg.lineTo(256, i * 128); fg.stroke(); }
  const floorTex = new THREE.CanvasTexture(fc);
  floorTex.colorSpace = THREE.SRGBColorSpace;
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(14, 12);
  floorTex.anisotropy = 8;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.25, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -2);
  floor.receiveShadow = true;
  scene.add(floor);

  // Outside ground and pavement
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), std(0x7d8b6a, { roughness: 1 }));
  outside.rotation.x = -Math.PI / 2; outside.position.set(0, -0.01, 30);
  scene.add(outside);
  const pave = new THREE.Mesh(new THREE.PlaneGeometry(28, 8), std(0xb8b3aa, { roughness: 0.9 }));
  pave.rotation.x = -Math.PI / 2; pave.position.set(0, 0.0, 14); pave.receiveShadow = true;
  scene.add(pave);

  // Walls and ceiling
  const wallMat = std(0xf3ede4, { roughness: 0.9 });
  const H = 4.5;
  addBox(scene, 28, H, 0.3, wallMat, 0, H / 2, -14.15, false);
  addBox(scene, 0.3, H, 24, wallMat, -14.15, H / 2, -2, false);
  addBox(scene, 0.3, H, 24, wallMat, 14.15, H / 2, -2, false);
  // Front wall with a glass shop window and door gap
  const frontMat = std(0x2d3a4a, { roughness: 0.5 });
  addBox(scene, 12.5, 0.8, 0.3, frontMat, -7.75, 0.4, 10.15, false);
  addBox(scene, 12.5, 0.8, 0.3, frontMat, 7.75, 0.4, 10.15, false);
  addBox(scene, 28, 1.5, 0.3, frontMat, 0, H - 0.75, 10.15, false);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe3ff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 });
  addBox(scene, 12.5, 2.2, 0.05, glass, -7.75, 1.9, 10.15, false);
  addBox(scene, 12.5, 2.2, 0.05, glass, 7.75, 1.9, 10.15, false);
  for (const x of [-13.9, -9, -4.5, -1.5, 1.5, 4.5, 9, 13.9]) addBox(scene, 0.12, 3, 0.32, frontMat, x, 1.5, 10.15, false);
  collide(-14.3, -14.3, 14.3, -14); collide(-14.3, -14.3, -14, 10.3); collide(14, -14.3, 14.3, 10.3);
  collide(-14.3, 10, 14.3, 10.3);   // the player stays inside the store

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), std(0xfafafa, { roughness: 1 }));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, H, -2);
  scene.add(ceil);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfffbf0, emissiveIntensity: 1.4 });
  for (let x = -11; x <= 11; x += 5.5) for (let z = -12; z <= 8; z += 4) addBox(scene, 2.4, 0.05, 0.5, panelMat, x, H - 0.03, z, false);

  // Store sign above the entrance (inside and outside)
  const signTex = textTexture(['ROBO MARKET', 'Supermarket • Supermarket'], { w: 1024, h: 200, bg: '#ff7a3d', fg: '#fff', sizes: [96, 40] });
  for (const [z, ry] of [[10.32, 0], [9.98, Math.PI]]) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.15), new THREE.MeshBasicMaterial({ map: signTex }));
    s.position.set(0, 3.7, z); s.rotation.y = ry;
    scene.add(s);
  }

  // ---------- Shelves ----------
  const inventory = new Inventory(scene);
  const shelfMat = std(0xd8dde3, { roughness: 0.4, metalness: 0.3 });
  const backMat = std(0x8a95a3, { roughness: 0.7 });
  const kickMat = std(0x39414d);
  const zMid = (SLOT_Z[0] + SLOT_Z.at(-1)) / 2, len = 10.2;
  ROWS.forEach((x0, r) => {
    addBox(scene, 0.05, 2.0, len, backMat, x0, 1.0, zMid);
    addBox(scene, 1.0, 0.12, len, kickMat, x0, 0.06, zMid);
    for (const zEnd of [zMid - len / 2, zMid + len / 2]) addBox(scene, 1.0, 2.05, 0.05, shelfMat, x0, 1.025, zEnd);
    for (const s of [-1, 1]) {
      for (const y of LEVEL_Y) addBox(scene, 0.48, 0.03, len, shelfMat, x0 + s * 0.26, y, zMid, false);
      const cat = CATEGORIES[r * 2 + (s > 0 ? 1 : 0)];
      // coloured header with the category name in English and Uzbek
      addBox(scene, 0.04, 0.22, len, std(cat.color), x0 + s * 0.5, 1.98, zMid, false);
      const tex = textTexture([cat.en.toUpperCase(), cat.uz], { w: 1024, h: 160, bg: '#' + cat.color.toString(16).padStart(6, '0'), fg: '#fff', sizes: [70, 46] });
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.62), new THREE.MeshBasicMaterial({ map: tex }));
      sign.position.set(x0 + s * 0.53, 2.45, zMid);
      sign.rotation.y = s * Math.PI / 2;
      scene.add(sign);
      const prods = PRODUCTS.filter((p) => p.cat === cat.id);
      SLOT_Z.forEach((z, k) => {
        inventory.slots.push({
          product: prods[k % prods.length], cat, z, side: s, aisle: r * 2 + (s > 0 ? 2 : 1), sideName: s > 0 ? 'right' : 'left',
          itemX: x0 + s * 0.27, accessX: x0 + s * 1.35, accessZ: z, faceYaw: s > 0 ? -Math.PI / 2 : Math.PI / 2,
        });
      });
    }
    // end-cap sign facing the front of the store
    const catL = CATEGORIES[r * 2], catR = CATEGORIES[r * 2 + 1];
    const capTex = textTexture([`◀ ${catL.en}   ${catR.en} ▶`, `${catL.uz} • ${catR.uz}`], { w: 1024, h: 180, bg: '#ffffff', fg: '#2b2140', sizes: [58, 40] });
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.46), new THREE.MeshBasicMaterial({ map: capTex }));
    cap.position.set(x0, 2.6, zMid + len / 2 + 0.03);
    scene.add(cap);
    collide(x0 - 0.52, zMid - len / 2 - 0.05, x0 + 0.52, zMid + len / 2 + 0.05);
    nav.blockRect(x0 - 0.5, zMid - len / 2, x0 + 0.5, zMid + len / 2, 0.45);
  });
  inventory.build();
  interactables.push(...inventory.meshes);

  // ---------- Service counter, tablet, charging station ----------
  const counterMat = std(0x6b4a35, { roughness: 0.55 });
  const topMat = std(0xf4efe8, { roughness: 0.25, metalness: 0.1 });
  const cx = (COUNTER.x1 + COUNTER.x2) / 2, cz = (COUNTER.z1 + COUNTER.z2) / 2, cw = COUNTER.x2 - COUNTER.x1;
  addBox(scene, cw, COUNTER.h - 0.05, 0.8, counterMat, cx, (COUNTER.h - 0.05) / 2, cz);
  addBox(scene, cw + 0.1, 0.05, 0.9, topMat, cx, COUNTER.h - 0.025, cz);
  const ctex = textTexture(['CUSTOMER SERVICE', "Mijozlarga xizmat ko'rsatish"], { w: 1024, h: 160, bg: '#2b2140', fg: '#fff', sizes: [64, 40] });
  const cs = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.56), new THREE.MeshBasicMaterial({ map: ctex }));
  cs.position.set(cx, 0.55, COUNTER.z2 + 0.01);
  scene.add(cs);
  collide(COUNTER.x1, COUNTER.z1, COUNTER.x2, COUNTER.z2);
  nav.blockRect(COUNTER.x1, COUNTER.z1, COUNTER.x2, COUNTER.z2, 0.45);

  // The 3D tablet: a real screen with a canvas texture that mirrors the tablet app.
  const tablet = new THREE.Group();
  const tabBody = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.31, 0.022), std(0x1b1b22, { roughness: 0.3, metalness: 0.5 }));
  tablet.add(tabBody);
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024; screenCanvas.height = 680;
  const screenTex = new THREE.CanvasTexture(screenCanvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.43, 0.285), new THREE.MeshBasicMaterial({ map: screenTex }));
  screen.position.z = 0.0115;
  tablet.add(screen);
  tablet.position.set(-8.5, COUNTER.h + 0.2, COUNTER.z1 + 0.15);
  tablet.rotation.set(-0.45, Math.PI, 0);   // screen faces the player behind the counter
  const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.2, 10), std(0x777777, { metalness: 0.7, roughness: 0.3 }));
  stand.position.set(-8.5, COUNTER.h + 0.1, COUNTER.z1 + 0.22);
  scene.add(stand, tablet);
  tablet.traverse((o) => (o.userData.interact = { type: 'tablet' }));
  interactables.push(tabBody, screen);

  // Charging station
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.04, 32), new THREE.MeshStandardMaterial({ color: 0x1e88e5, emissive: 0x1e88e5, emissiveIntensity: 0.6 }));
  pad.position.set(STATION.x, 0.02, STATION.z);
  scene.add(pad);
  const pole = addBox(scene, 0.25, 1.4, 0.2, std(0x30343c, { metalness: 0.4 }), STATION.x + 0.75, 0.7, STATION.z);
  const chargeLight = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), new THREE.MeshStandardMaterial({ color: 0x00e676, emissive: 0x00e676, emissiveIntensity: 2 }));
  chargeLight.position.set(STATION.x + 0.75, 1.45, STATION.z);
  scene.add(chargeLight);
  collide(STATION.x + 0.62, STATION.z - 0.1, STATION.x + 0.88, STATION.z + 0.1);
  nav.blockRect(STATION.x + 0.62, STATION.z - 0.1, STATION.x + 0.88, STATION.z + 0.1, 0.3);
  const stTex = textTexture(['ROBOT DOCK', 'Robot stansiyasi'], { w: 512, h: 128, bg: '#1e88e5', fg: '#fff', sizes: [48, 30] });
  const stSign = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.2), new THREE.MeshBasicMaterial({ map: stTex }));
  stSign.position.set(STATION.x + 0.75, 1.15, STATION.z + 0.105);
  scene.add(stSign);

  // ---------- Checkout, carts and baskets ----------
  addBox(scene, 3, 0.95, 0.9, counterMat, 7.5, 0.475, 6.5);
  addBox(scene, 3.1, 0.05, 1.0, topMat, 7.5, 0.97, 6.5);
  addBox(scene, 0.4, 0.3, 0.35, std(0x222831, { metalness: 0.5 }), 6.6, 1.15, 6.5);
  addBox(scene, 0.36, 0.22, 0.02, new THREE.MeshStandardMaterial({ color: 0x0b3d2e, emissive: 0x16a085, emissiveIntensity: 0.6 }), 6.6, 1.4, 6.4);
  addBox(scene, 1.6, 0.02, 0.5, std(0x111111, { roughness: 0.9 }), 8.2, 1.0, 6.5, false);  // conveyor belt
  const coTex = textTexture(['CHECKOUT', 'Kassa'], { w: 512, h: 160, bg: '#27ae60', fg: '#fff', sizes: [70, 44] });
  const co = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.44), new THREE.MeshBasicMaterial({ map: coTex }));
  co.position.set(7.5, 2.6, 6.5); scene.add(co);
  collide(6, 6.05, 9, 6.95);
  nav.blockRect(6, 6.05, 9, 6.95, 0.45);

  const cartMat = std(0xb0b7c0, { metalness: 0.8, roughness: 0.3 });
  const red = std(0xd62828);
  for (let i = 0; i < 4; i++) {
    const cart = new THREE.Group();
    addBox(cart, 0.55, 0.4, 0.85, new THREE.MeshStandardMaterial({ color: 0xb0b7c0, metalness: 0.8, roughness: 0.3, wireframe: true }), 0, 0.75, 0, false);
    addBox(cart, 0.55, 0.03, 0.85, cartMat, 0, 0.55, 0);
    addBox(cart, 0.6, 0.04, 0.04, red, 0, 1.05, -0.45);
    for (const [wx, wz] of [[-0.22, -0.35], [0.22, -0.35], [-0.22, 0.35], [0.22, 0.35]]) {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), std(0x222222));
      wh.rotation.z = Math.PI / 2; wh.position.set(wx, 0.05, wz); cart.add(wh);
    }
    addBox(cart, 0.04, 0.5, 0.04, cartMat, -0.22, 0.3, 0); addBox(cart, 0.04, 0.5, 0.04, cartMat, 0.22, 0.3, 0);
    cart.position.set(10.5 + i * 0.12, 0, 8.6 - i * 0.25);
    scene.add(cart);
  }
  collide(10.1, 7.6, 11.3, 9.1); nav.blockRect(10.1, 7.6, 11.3, 9.1, 0.4);
  for (let i = 0; i < 5; i++) {
    const b = new THREE.Group();
    addBox(b, 0.45, 0.25, 0.32, std(i % 2 ? 0xd62828 : 0x1e88e5), 0, 0.125, 0);
    addBox(b, 0.02, 0.15, 0.3, std(0x333333), 0, 0.3, 0);
    b.position.set(-12.8, i * 0.12, 8.6);
    scene.add(b);
  }
  collide(-13.1, 8.4, -12.5, 8.8); nav.blockRect(-13.1, 8.4, -12.5, 8.8, 0.3);

  // Plants by the door
  for (const x of [-2.2, 2.2]) {
    addBox(scene, 0.5, 0.5, 0.5, std(0x8d6e63), x, 0.25, 9.4);
    const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), std(0x2e7d32, { flatShading: true }));
    leaves.position.set(x, 0.95, 9.4); leaves.castShadow = true;
    scene.add(leaves);
    collide(x - 0.3, 9.1, x + 0.3, 9.7); nav.blockRect(x - 0.3, 9.1, x + 0.3, 9.7, 0.3);
  }

  // ---------- Automatic sliding doors ----------
  const doorMat = new THREE.MeshPhysicalMaterial({ color: 0xcfeaff, transparent: true, opacity: 0.35, roughness: 0.05 });
  const frameMat = std(0x9aa5b1, { metalness: 0.8, roughness: 0.3 });
  const leaves = [-1, 1].map((s) => {
    const g = new THREE.Group();
    addBox(g, 1.5, 2.6, 0.04, doorMat, 0, 1.3, 0, false);
    addBox(g, 1.5, 0.06, 0.06, frameMat, 0, 2.6, 0, false);
    addBox(g, 0.06, 2.6, 0.06, frameMat, s * 0.72, 1.3, 0, false);
    g.position.set(s * 0.75, 0, 10.15);
    scene.add(g);
    return { g, s };
  });
  let doorOpen = 0, doorWasOpen = false;
  const doors = {
    update(dt, positions, onOpen) {
      const near = positions.some((p) => Math.abs(p.x) < 2.5 && Math.abs(p.z - 10) < 3.2);
      doorOpen = THREE.MathUtils.clamp(doorOpen + (near ? dt : -dt) * 1.6, 0, 1);
      const e = doorOpen * doorOpen * (3 - 2 * doorOpen);
      for (const l of leaves) l.g.position.x = l.s * (0.75 + e * 1.45);
      if (near && !doorWasOpen) onOpen?.();
      doorWasOpen = near;
    },
  };

  return { colliders, interactables, nav, inventory, doors, tablet: { group: tablet, canvas: screenCanvas, texture: screenTex } };
}
