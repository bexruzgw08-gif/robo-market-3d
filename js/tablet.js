// The translation tablet: HTML touchscreen app (zoomed-in view) + live mirror on the 3D tablet screen.
import { CATEGORIES, PRODUCTS, PRODUCT_BY_ID, LEVELS, uzPhrase } from './data.js';
import { sfx } from './audio.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Tablet {
  constructor(game, screen) {
    this.game = game;
    this.screen = screen;       // { canvas, texture } of the 3D tablet
    this.el = $('#tablet');
    this.page = 'orders';
    this.cat = 'all';
    this.warning = null;
    this.feedback = null;
    this.bind();
  }

  get order() { return this.game.orders.find((o) => o.id === this.game.selectedOrder) || null; }

  bind() {
    this.el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (!b || b.disabled) return;
      sfx('click');
      b.classList.add('tapped');
      setTimeout(() => b.classList.remove('tapped'), 150);
      const { act, id, qty } = b.dataset;
      const o = this.order;
      switch (act) {
        case 'close': this.game.closeTablet(); return;
        case 'page': this.page = id; this.feedback = null; break;
        case 'select': this.game.selectedOrder = +id; this.warning = null; this.feedback = null; break;
        case 'cat': this.cat = id; break;
        case 'add': this.addProduct(id); break;
        case 'inc': if (o) { o.selection[id] = Math.min(9, (o.selection[id] || 0) + 1); this.checkStock(id); } break;
        case 'dec': if (o) { o.selection[id]--; if (o.selection[id] <= 0) delete o.selection[id]; this.warning = null; } break;
        case 'remove': if (o) { delete o.selection[id]; this.warning = null; } break;
        case 'alt': if (o) { const q = o.selection[this.warning?.id] || 1; delete o.selection[this.warning.id]; o.selection[id] = q; this.warning = null; } break;
        case 'translate': if (o) this.game.translate(o).then(() => this.render()); break;
        case 'listen': if (o) this.game.repeatRequest(o); break;
        case 'confirm': if (o) this.feedback = this.game.confirm(o); break;
        case 'cancel': if (o) { o.selection = {}; this.warning = null; this.feedback = { ok: null, text: 'Selection cleared.' }; } break;
        case 'restock': this.game.restock(id); break;
        case 'restockAll': this.game.restock(null); break;
        case 'level': this.game.setLevel(+id); break;
        case 'sound': this.game.toggleSound(); break;
        case 'api': this.game.settings.api = !this.game.settings.api; this.game.saveSettings(); break;
      }
      this.render();
    });
  }

  addProduct(id) {
    const o = this.order;
    if (!o || o.status !== 'waiting') return;
    o.selection[id] = (o.selection[id] || 0) + 1;
    this.feedback = null;
    this.checkStock(id);
  }

  checkStock(id) {
    const o = this.order;
    const want = o.selection[id] || 0;
    const have = this.game.inventory.available(id);
    if (want > have) {
      const p = PRODUCT_BY_ID[id];
      const alts = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== id && this.game.inventory.available(x.id) >= want);
      this.warning = { id, have, alts };
      sfx('error');
    } else if (this.warning?.id === id) this.warning = null;
  }

  open() {
    this.el.hidden = false;
    requestAnimationFrame(() => this.el.classList.add('show'));
    if (!this.order) this.game.selectedOrder = this.game.orders.find((o) => o.status === 'waiting')?.id ?? null;
    this.render();
  }
  close() {
    this.el.classList.remove('show');
    setTimeout(() => (this.el.hidden = true), 250);
  }

  render() {
    this.renderScreen();
    if (this.el.hidden) return;
    const g = this.game;
    const L = LEVELS[g.level];
    const tabs = ['orders', 'inventory', 'settings'].map((p) =>
      `<button class="tab ${this.page === p ? 'on' : ''}" data-act="page" data-id="${p}">${{ orders: '🧾 Orders', inventory: '📦 Inventory', settings: '⚙️ Settings' }[p]}</button>`).join('');
    $('#tabletTabs').innerHTML = tabs;
    $('#tabletClock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $('#tabletScore').textContent = `⭐ ${g.score}  •  ${L.name}`;
    const body = $('#tabletBody');
    if (this.page === 'inventory') body.innerHTML = this.inventoryHtml();
    else if (this.page === 'settings') body.innerHTML = this.settingsHtml();
    else body.innerHTML = this.ordersHtml();
  }

  ordersHtml() {
    const g = this.game;
    const active = g.orders.filter((o) => o.status !== 'done' && o.status !== 'cancelled');
    const list = active.length
      ? active.map((o) => `
        <button class="order-chip ${o.id === g.selectedOrder ? 'on' : ''} st-${o.status}" data-act="select" data-id="${o.id}">
          <b>${esc(o.customer.name)}</b><span>${statusLabel(o.status)}</span>
          <i style="width:${Math.max(0, o.patience * 100)}%"></i>
        </button>`).join('')
      : '<div class="muted">No customers waiting. They will arrive soon…</div>';
    const o = this.order;
    if (!o || o.status === 'done' || o.status === 'cancelled') {
      return `<div class="order-list">${list}</div><div class="empty-state">🛒<br>Select a customer request.<br><span class="muted">Mijoz so'rovini tanlang.</span></div>`;
    }
    const locked = o.status !== 'waiting';
    const showUz = o.uzShown;
    const selection = Object.entries(o.selection);
    const cats = [{ id: 'all', en: 'All' }, ...CATEGORIES];
    const prods = PRODUCTS.filter((p) => this.cat === 'all' || p.cat === this.cat);

    return `
      <div class="order-list">${list}</div>
      <div class="req-grid">
        <section class="card">
          <div class="label">CUSTOMER REQUEST <span class="muted">— ${esc(o.customer.name)} (${o.customer.accent.label} English)</span></div>
          <div class="english">“${esc(o.english)}”</div>
          <button class="ghost" data-act="listen">🔊 Listen again</button>
        </section>
        <section class="card uz ${showUz ? 'reveal' : ''}">
          <div class="label">UZBEK TRANSLATION ${o.apiText ? '<span class="muted">(online)</span>' : ''}</div>
          ${showUz
            ? `<div class="uzbek">“${esc(o.apiText || o.uzbek)}”</div>${o.apiText ? `<div class="muted small">Built-in: “${esc(o.uzbek)}”</div>` : ''}`
            : `<div class="uzbek hidden-uz">Press <b>TRANSLATE</b> to see the Uzbek translation.<br><span class="muted small">Try to understand it yourself first — you get a bonus!</span></div>`}
        </section>
      </div>

      <section class="card">
        <div class="label">PRODUCT</div>
        <div class="selection">
          ${selection.length ? selection.map(([id, q]) => {
            const p = PRODUCT_BY_ID[id];
            return `<div class="sel-item">
              <span class="pname">${esc(p.name)} <b>× ${q}</b></span><span class="muted">${esc(uzPhrase(p, Math.min(q, 5)))}</span>
              ${locked ? '' : `<span class="qty"><button data-act="dec" data-id="${id}">−</button><button data-act="inc" data-id="${id}">+</button><button data-act="remove" data-id="${id}">✕</button></span>`}
            </div>`;
          }).join('') : '<div class="muted">Tap the products the customer asked for below. Use + / − for the quantity.</div>'}
        </div>
        ${this.warning ? `<div class="warn">⚠️ <b>${esc(PRODUCT_BY_ID[this.warning.id].name)}</b> is out of stock (only ${this.warning.have} left). Choose an alternative:
            <div class="alts">${this.warning.alts.length ? this.warning.alts.map((p) => `<button data-act="alt" data-id="${p.id}">${esc(p.name)} <span class="muted">(${this.game.inventory.available(p.id)})</span></button>`).join('') : '<span class="muted">No alternatives in stock — restock it in Inventory.</span>'}</div></div>` : ''}
        ${this.feedback ? `<div class="feedback ${this.feedback.ok === true ? 'ok' : this.feedback.ok === false ? 'bad' : ''}">${this.feedback.text}</div>` : ''}
        ${locked ? `<div class="feedback ok">🤖 Order confirmed — robot status: ${statusLabel(o.status)}</div>` : ''}
      </section>

      ${locked ? '' : `
      <section class="card catalog">
        <div class="cats">${cats.map((c) => `<button class="${this.cat === c.id ? 'on' : ''}" data-act="cat" data-id="${c.id}">${c.en}</button>`).join('')}</div>
        <div class="prod-grid">${prods.map((p) => {
          const st = this.game.inventory.available(p.id);
          return `<button class="prod ${st === 0 ? 'oos' : ''}" data-act="add" data-id="${p.id}">
            <b>${esc(p.name)}</b><span>${esc(p.uzName)}</span><small>${st === 0 ? 'OUT OF STOCK' : 'Stock: ' + st}</small></button>`;
        }).join('')}</div>
      </section>`}

      <div class="actions">
        <button class="btn translate" data-act="translate" ${showUz ? 'disabled' : ''}>🌐 TRANSLATE</button>
        <button class="btn confirm" data-act="confirm" ${locked || !selection.length ? 'disabled' : ''}>✅ CONFIRM ORDER</button>
        <button class="btn cancel" data-act="cancel" ${locked ? 'disabled' : ''}>✖ CANCEL</button>
      </div>`;
  }

  inventoryHtml() {
    const inv = this.game.inventory;
    return `<div class="inv-head"><span>Product database — robot finds items by shelf location.</span>
        <button class="ghost" data-act="restockAll">🔄 Restock all (−20 ⭐)</button></div>
      <table class="inv"><thead><tr><th>ID</th><th>English</th><th>Uzbek</th><th>Category</th><th>Stock</th><th>Location</th><th></th></tr></thead><tbody>
      ${PRODUCTS.map((p) => {
        const st = inv.stock(p.id), av = inv.available(p.id);
        return `<tr class="${st === 0 ? 'oos' : st < 4 ? 'low' : ''}"><td>${p.id}</td><td>${esc(p.name)}</td><td>${esc(p.uzName)}</td>
          <td>${CATEGORIES.find((c) => c.id === p.cat).en}</td><td>${st}${av !== st ? ` <span class="muted">(${st - av} reserved)</span>` : ''}</td>
          <td>${inv.location(p.id)}</td><td><button class="ghost sm" data-act="restock" data-id="${p.id}">Restock (−5)</button></td></tr>`;
      }).join('')}</tbody></table>`;
  }

  settingsHtml() {
    const g = this.game;
    return `
      <section class="card"><div class="label">ENGLISH LEVEL</div>
        <div class="lv-row">${Object.entries(LEVELS).map(([n, l]) => `
          <button class="lv ${g.level === +n ? 'on' : ''}" data-act="level" data-id="${n}"><b>Level ${n} — ${l.name}</b><span>${l.desc}</span></button>`).join('')}</div>
      </section>
      <section class="card"><div class="label">SOUND</div>
        <button class="toggle ${g.settings.sound ? 'on' : ''}" data-act="sound">${g.settings.sound ? '🔊 Sound & voices ON' : '🔇 Sound OFF'}</button></section>
      <section class="card"><div class="label">ONLINE TRANSLATION (OPTIONAL)</div>
        <button class="toggle ${g.settings.api ? 'on' : ''}" data-act="api">${g.settings.api ? '🌐 Online translation ON' : '📖 Built-in dictionary only'}</button>
        <p class="muted small">When ON, TRANSLATE also asks the free MyMemory API (en → uz) and shows its result next to the built-in translation. Needs internet; the built-in dictionary is always used as a fallback.</p></section>`;
  }

  // Mirror the app on the 3D tablet's screen texture.
  renderScreen() {
    const { canvas, texture } = this.screen;
    const c = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const grd = c.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, '#1f1b3a'); grd.addColorStop(1, '#2d2560');
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
    c.fillStyle = '#ffffff22'; c.fillRect(0, 0, W, 70);
    c.fillStyle = '#fff'; c.font = '800 38px Nunito, Arial'; c.textAlign = 'left';
    c.fillText('SmartTab • Translator', 30, 48);
    c.textAlign = 'right'; c.fillText(`⭐ ${this.game.score}`, W - 30, 48);
    const waiting = this.game.orders.filter((o) => o.status === 'waiting');
    const o = waiting[0] || this.game.orders.find((x) => x.status === 'picking' || x.status === 'delivering');
    c.textAlign = 'left';
    if (!o) {
      c.fillStyle = '#b8b0e0'; c.font = '700 44px Nunito, Arial';
      c.fillText('Waiting for customers…', 30, 200);
      c.font = '600 32px Nunito, Arial';
      c.fillText('Mijozlar kutilmoqda…', 30, 260);
    } else {
      c.fillStyle = waiting.length ? '#ffd166' : '#5df2a0'; c.font = '800 34px Nunito, Arial';
      c.fillText(waiting.length ? `🔔 ${waiting.length} NEW REQUEST${waiting.length > 1 ? 'S' : ''}` : '🤖 ROBOT ON THE WAY', 30, 130);
      c.fillStyle = '#9f96d0'; c.font = '700 26px Nunito, Arial'; c.fillText('CUSTOMER REQUEST — ' + o.customer.name, 30, 190);
      c.fillStyle = '#fff'; c.font = '700 40px Nunito, Arial';
      let y = wrapText(c, `“${o.english}”`, 30, 240, W - 60, 48);
      if (o.uzShown) {
        c.fillStyle = '#9f96d0'; c.font = '700 26px Nunito, Arial'; c.fillText("O'ZBEKCHA", 30, y + 30);
        c.fillStyle = '#5df2a0'; c.font = '700 36px Nunito, Arial';
        y = wrapText(c, `“${o.uzbek}”`, 30, y + 78, W - 60, 44);
      }
    }
    c.fillStyle = '#ffffff99'; c.font = '600 26px Nunito, Arial'; c.textAlign = 'center';
    c.fillText('Press E to use the tablet', W / 2, H - 24);
    texture.needsUpdate = true;
  }
}

function wrapText(c, text, x, y, maxW, lh) {
  let line = '';
  for (const w of text.split(' ')) {
    const t = line ? line + ' ' + w : w;
    if (c.measureText(t).width > maxW && line) { c.fillText(line, x, y); y += lh; line = w; } else line = t;
  }
  c.fillText(line, x, y);
  return y;
}

export function statusLabel(s) {
  return { waiting: 'Waiting', picking: 'Robot picking', delivering: 'Delivering', done: 'Done', cancelled: 'Left', queued: 'In robot queue' }[s] || s;
}
