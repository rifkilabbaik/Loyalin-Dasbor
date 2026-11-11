const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const nf = new Intl.NumberFormat('id-ID');
const fmt = (n) => nf.format(Math.round(Number(n) || 0));
const digits = (s) => String(s || '').replace(/\D/g, '');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (name) => `<svg class="ic"><use href="#i-${name}"/></svg>`;
const DAY = 864e5;
const sod = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };

const Store = {
  get(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  json(k, fb) { try { return JSON.parse(this.get(k)) || fb; } catch (e) { return fb; } },
  setJson(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

const Phone = {
  display(n) {
    const d = digits(n);
    if (!d) return '';
    const l = '0' + d.replace(/^62/, '');
    return l.replace(/^(\d{4})(\d{0,4})(\d{0,5})$/, (_, a, b, c) => [a, b, c].filter(Boolean).join('-'));
  },
  normalize(raw) {
    let d = digits(raw);
    if (d.startsWith('62')) d = d.slice(2);
    d = d.replace(/^0+/, '');
    return d ? '62' + d : '';
  },
  valid(n) { return /^628\d{7,11}$/.test(n); },
  local(n) {
    const d = digits(n).replace(/^62/, '');
    return d.replace(/^(\d{3})(\d{0,4})(\d{0,5})$/, (_, a, b, c) => [a, b, c].filter(Boolean).join(' '));
  },
  wa(n) { const d = digits(n); return d ? 'https://wa.me/' + d : ''; },
  tel(n) { const d = digits(n); return d ? 'tel:+' + d : ''; }
};

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DOW = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const F = {
  dec(x) { return new Intl.NumberFormat('id-ID', { maximumFractionDigits: x >= 100 ? 0 : 1 }).format(x); },
  short(n) {
    const a = Math.abs(n);
    if (a >= 1e9) return F.dec(n / 1e9) + ' M';
    if (a >= 1e6) return F.dec(n / 1e6) + ' jt';
    if (a >= 1e4) return F.dec(n / 1e3) + ' rb';
    return fmt(n);
  },
  rp(n) { return 'Rp ' + fmt(n); },
  rps(n) { return 'Rp ' + F.short(n); },
  count(n) { return Math.abs(n) >= 1e5 ? F.short(n) : fmt(n); },
  time(t) { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + '.' + String(d.getMinutes()).padStart(2, '0'); },
  date(t) {
    const d = new Date(t);
    const y = d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '';
    return d.getDate() + ' ' + MON[d.getMonth()] + y;
  },
  day(t) {
    const t0 = sod(Date.now());
    const s = sod(t);
    if (s === t0) return 'Hari ini';
    if (s === t0 - DAY) return 'Kemarin';
    const d = new Date(t);
    return DOW[d.getDay()] + ', ' + F.date(t);
  },
  ago(t) {
    if (!t) return '–';
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'baru saja';
    if (s < 3600) return Math.floor(s / 60) + ' mnt';
    if (s < 86400) return Math.floor(s / 3600) + ' jam';
    const d = Math.floor((sod(Date.now()) - sod(t)) / DAY);
    if (d <= 1) return 'kemarin';
    if (d < 60) return d + ' hari';
    return F.date(t);
  },
  initial(name) {
    const w = String(name || '?').trim().split(/\s+/).filter(Boolean);
    return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
  },
  pct(x) { return F.dec(Math.abs(x) * 100) + '%'; }
};

const Api = {
  async call(action, payload) {
    const body = Object.assign({ action, kode: Store.get('kode') }, payload);
    let res;
    try {
      res = await fetch(CONFIG.APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error(navigator.onLine ? 'Koneksi gagal, coba lagi' : 'Tidak ada internet');
    }
    if (!res.ok) throw new Error('Server error ' + res.status);
    let j;
    try { j = await res.json(); } catch (e) { throw new Error('Apps Script belum siap'); }
    if (j.status !== 'ok') { const err = new Error(j.error || 'Gagal'); err.code = j.code || ''; throw err; }
    return j.data;
  },
  data(kode) { return this.call('dasbor', kode ? { kode } : {}); },
  editMember(m) { return this.call('dasborMember', m); },
  deleteMember(id) { return this.call('dasborHapus', { id }); },
  cancel(t) { return this.call('dasborBatal', { at: t.at, id: t.id, amount: t.amount, row: t.row }); }
};

const Data = {
  members: [], tx: [], byId: new Map(), byKey: new Map(), toko: [], min: 13000, slots: 10, batas: 0, at: 0, first: 0, hours: [8, 21],

  load(raw) {
    this.min = Number(raw.min) || 13000;
    this.slots = Math.min(30, Math.max(2, Number(raw.slots) || 10));
    this.batas = Number(raw.batas) || 0;
    this.at = Number(raw.now) || Date.now();
    this.members = (raw.members || []).map(r => this.toMember(r));
    this.byId = new Map(this.members.map(m => [m.id, m]));
    this.tx = (raw.tx || []).map(r => ({
      at: +r[0] || 0, id: String(r[1]), type: String(r[2] || 'Belanja'),
      amount: +r[3] || 0, stamps: +r[4] || 0, balance: +r[5] || 0, store: String(r[6] || ''),
      name: String(r[7] || ''), row: +r[8] || 0
    })).filter(t => t.at).sort((a, b) => b.at - a.at);
    this.byKey = new Map();
    this.tx.forEach((t, i) => { t.k = t.at + ':' + t.id + ':' + i; this.byKey.set(t.k, t); });
    const set = new Set((raw.toko || []).map(String));
    this.tx.forEach(t => t.store && set.add(t.store));
    this.members.forEach(m => m.store && set.add(m.store));
    this.toko = Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
    this.first = this.tx.length ? this.tx[this.tx.length - 1].at : Date.now();
    const hc = new Array(24).fill(0);
    this.tx.forEach(t => { hc[new Date(t.at).getHours()]++; });
    const on = hc.map((c, h) => c ? h : -1).filter(h => h >= 0);
    this.hours = on.length ? [Math.min(8, on[0]), Math.max(21, on[on.length - 1])] : [8, 21];
  },

  toMember(r) {
    return {
      id: String(r[0]), name: String(r[1] || ''), phone: String(r[2] || ''),
      stamps: +r[3] || 0, spent: +r[4] || 0, count: +r[5] || 0, store: String(r[6] || ''),
      createdAt: +r[7] || 0, lastAt: +r[8] || 0
    };
  },
  putMember(r) {
    const m = this.toMember(r);
    const old = this.byId.get(m.id);
    if (old) Object.assign(old, m); else { this.members.push(m); this.byId.set(m.id, m); }
    return old || m;
  },
  dropMember(id) {
    this.members = this.members.filter(m => m.id !== id);
    this.byId.delete(id);
  },
  member(id) { return this.byId.get(id); },
  nameOf(t) { const m = this.byId.get(t.id); return (m && m.name) || t.name || t.id; },
  isSale(t) { return String(t.type).toLowerCase() === 'belanja'; },
  isVoid(t) { return String(t.type).toLowerCase() === 'batal'; },
  isGift(t) { return this.isSale(t) && t.balance > 0 && t.balance % this.slots === 0; }
};

const Stamp = {
  ROT: [-12, 9, -6, 14, -9, 5, -14, 11, -4, 12, -8, 6],
  prog(total) {
    const slots = Data.slots;
    total = Math.max(0, Math.floor(Number(total) || 0));
    if (!total) return { filled: 0, full: 0, slots };
    const r = total % slots;
    return r ? { filled: r, full: Math.floor(total / slots), slots } : { filled: slots, full: total / slots, slots };
  },
  label(total) { const p = this.prog(total); return p.filled + '/' + p.slots; },
  cols(n) { return n <= 6 ? n : n <= 12 ? Math.ceil(n / 2) : 6; },
  card(total) {
    const p = this.prog(total);
    let cells = '';
    for (let i = 0; i < p.slots; i++) {
      const gift = i === p.slots - 1;
      cells += `<span class="slot${i < p.filled ? ' on' : ''}${gift ? ' gift' : ''}" style="--r:${this.ROT[i % 12]}deg;--i:${i}"><span class="ink">${ic(gift ? 'gift' : 'star')}</span>${gift ? ic('gift') : `<i>${i + 1}</i>`}</span>`;
    }
    return `<div class="scard stagger"><div class="scard-head"><span class="scard-count">${ic('stamp')}<b>${p.filled}</b><small>/${p.slots}</small></span><span class="scard-gift"${p.full ? '' : ' hidden'}>${ic('gift')}<b>×${p.full}</b></span></div><div class="scard-grid" style="--cols:${this.cols(p.slots)}">${cells}</div></div>`;
  },
  chips(total) {
    const p = this.prog(total);
    const done = p.filled === p.slots;
    return `<span class="chips"><span class="pt${done ? '' : ' soft'}">${ic(done ? 'gift' : 'star')}${p.filled}/${p.slots}</span>${p.full && !done ? `<span class="pt">${ic('gift')}×${p.full}</span>` : ''}</span>`;
  }
};

const PERIODS = [['today', 'Hari ini'], ['7', '7 hari'], ['30', '30 hari'], ['month', 'Bulan ini'], ['90', '90 hari'], ['all', 'Semua']];

function rangeOf(p) {
  const now = Date.now();
  const t0 = sod(now);
  const d = new Date(now);
  let from, pFrom, pTo;
  if (p === 'today') { from = t0; pFrom = t0 - DAY; pTo = now - DAY; }
  else if (p === 'month') {
    from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    pFrom = new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime();
    const lastPrev = new Date(d.getFullYear(), d.getMonth(), 0).getDate();
    pTo = new Date(d.getFullYear(), d.getMonth() - 1, Math.min(d.getDate(), lastPrev), d.getHours(), d.getMinutes()).getTime();
  } else if (p === 'all') { from = sod(Math.min(Data.first, now)); pFrom = pTo = 0; }
  else { const n = Number(p) || 7; from = t0 - (n - 1) * DAY; pFrom = from - n * DAY; pTo = now - n * DAY; }
  return { from, to: now, pFrom, pTo, days: Math.max(1, Math.round((t0 - from) / DAY) + 1) };
}

function sum(list) {
  const o = { omzet: 0, n: 0, gifts: 0, ids: new Set() };
  list.forEach(t => {
    if (!Data.isSale(t)) return;
    o.omzet += t.amount; o.n++; o.ids.add(t.id);
    if (Data.isGift(t)) o.gifts++;
  });
  return o;
}

function delta(cur, prev) {
  if (!prev) return null;
  return (cur - prev) / prev;
}

function niceMax(v) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return s * p;
}

const Chart = {
  cols(el, items, opt = {}) {
    if (!items.length || !items.some(i => i.v > 0)) {
      el.innerHTML = `<div class="empty-state"><span>${ic('pulse')}</span></div>`;
      return;
    }
    const max = niceMax(Math.max(...items.map(i => i.v)));
    const peak = opt.peak ? items.reduce((a, b) => (b.v > a.v ? b : a), items[0]) : null;
    const grid = [0, .5, 1].map(f => `<i style="bottom:${f * 100}%"><b>${f ? F.short(max * f) : '0'}</b></i>`).join('');
    const bars = items.map((it, i) => {
      const h = it.v ? Math.max(2, (it.v / max) * 100) : 0;
      const cls = peak && it !== peak ? ' dim' : '';
      return `<div class="col${cls}" tabindex="0" data-v="${esc(it.tv)}" data-l="${esc(it.tl)}" style="--i:${i}"><span style="height:${h}%"></span></div>`;
    }).join('');
    const xs = items.map(it => `<b>${esc(it.x || '')}</b>`).join('');
    el.innerHTML = `<div class="cols-plot"><div class="cols-grid">${grid}</div>${bars}</div><div class="cols-x">${xs}</div>`;
  },

  spark(svg, vals) {
    if (vals.length < 2) { svg.innerHTML = ''; return; }
    const max = Math.max(...vals, 1);
    const n = vals.length - 1;
    const pts = vals.map((v, i) => [(i / n) * 100, 30 - (v / max) * 26]);
    const line = Chart.smooth(pts);
    svg.innerHTML = `<path class="area" d="${line} L100 32 L0 32 Z"/><path class="ln" d="${line}"/>`;
  },

  smooth(p) {
    const n = p.length, d = [], m = [];
    for (let i = 0; i < n - 1; i++) d[i] = (p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]);
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (!d[i]) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], q = a * a + b * b;
      if (q > 9) { const t = 3 / Math.sqrt(q); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    const f = (v) => v.toFixed(2);
    let out = 'M' + f(p[0][0]) + ' ' + f(p[0][1]);
    for (let i = 0; i < n - 1; i++) {
      const h = (p[i + 1][0] - p[i][0]) / 3;
      out += ' C' + f(p[i][0] + h) + ' ' + f(p[i][1] + m[i] * h) + ' ' + f(p[i + 1][0] - h) + ' ' + f(p[i + 1][1] - m[i + 1] * h) + ' ' + f(p[i + 1][0]) + ' ' + f(p[i + 1][1]);
    }
    return out;
  },

  bars(el, items) {
    if (!items.length) { el.innerHTML = `<div class="empty-state"><span>${ic('store')}</span></div>`; return; }
    const max = Math.max(...items.map(i => i.v), 1);
    el.innerHTML = items.map((it, i) => `
      <div class="bar-row">
        <span class="bar-rank">${i + 1}</span>
        <span class="bar-name">${esc(it.name)}</span>
        <span class="bar-val">${esc(it.tv)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(it.v / max) * 100}%;animation-delay:${i * 60}ms"></span></span>
      </div>`).join('');
  }
};

class Menu {
  constructor(root, opt) {
    this.root = root; this.opt = opt; this.items = []; this.value = '';
    this.btn = $('.chip-btn', root); this.pop = $('.dd-pop', root); this.list = $('.dd-list', root);
    this.btn.addEventListener('click', (e) => { e.stopPropagation(); this.isOpen ? this.close() : this.open(); });
    this.list.addEventListener('click', (e) => {
      const b = e.target.closest('.dd-opt');
      if (!b) return;
      this.set(b.dataset.v);
      this.close();
      this.opt.onChange(this.value);
    });
    document.addEventListener('click', (e) => { if (this.isOpen && !root.contains(e.target)) this.close(); });
  }
  get isOpen() { return !this.pop.hidden; }
  setItems(items) { this.items = items; this.set(this.value); }
  set(v) {
    this.value = v;
    const it = this.items.find(i => i.v === v) || this.items[0];
    $('.dd-val', this.root).textContent = it ? it.t : '';
    this.root.classList.toggle('set', !!this.opt.markSet && !!v);
  }
  open() {
    Menu.closeAll();
    this.list.innerHTML = this.items.map((it, i) => `
      <button type="button" class="dd-opt${it.v === this.value ? ' sel' : ''}" role="option" data-v="${esc(it.v)}" style="--i:${i}">
        <span class="dd-ic">${ic(it.ic || this.opt.icon)}</span><span class="t">${esc(it.t)}</span><svg class="ic ck"><use href="#i-check"/></svg>
      </button>`).join('');
    this.pop.hidden = false;
    this.root.classList.add('open');
    this.btn.setAttribute('aria-expanded', 'true');
    const r = this.pop.getBoundingClientRect();
    if (r.right > innerWidth - 8) { this.pop.style.left = 'auto'; this.pop.style.right = '0'; }
  }
  close() {
    this.pop.hidden = true;
    this.pop.style.left = ''; this.pop.style.right = '';
    this.root.classList.remove('open');
    this.btn.setAttribute('aria-expanded', 'false');
  }
  static closeAll() { (App.menus || []).forEach(m => m.isOpen && m.close()); }
}

const TITLES = { home: 'Beranda', members: 'Member', member: '', tx: 'Transaksi', stores: 'Toko', settings: 'Pengaturan', login: '' };
const TABS = ['home', 'members', 'tx', 'stores', 'settings'];
const PAGE = 40;

const App = {
  view: '', period: Store.get('period') || '7', toko: Store.get('tokoFilter') || '',
  sort: 'stamps', mq: '', tq: '', memberId: '', installEvt: null, menus: [], syncing: false, timer: 0,

  init() {
    this.mPeriod = new Menu($('#ddPeriod'), { icon: 'calendar', onChange: (v) => { this.period = v; Store.set('period', v); this.render(); } });
    this.mStore = new Menu($('#ddStore'), { icon: 'store', markSet: true, onChange: (v) => { this.toko = v; Store.set('tokoFilter', v); this.render(); } });
    this.menus = [this.mPeriod, this.mStore];
    this.mPeriod.setItems(PERIODS.map(p => ({ v: p[0], t: p[1] })));
    this.mPeriod.set(this.period);

    $('#loginForm').addEventListener('submit', (e) => { e.preventDefault(); this.login(); });
    $('#inKode').addEventListener('input', (e) => e.target.closest('.field').classList.remove('bad'));
    $('#btnEye').addEventListener('click', () => {
      const i = $('#inKode'); const show = i.type === 'password';
      i.type = show ? 'text' : 'password'; $('#btnEye').classList.toggle('on', show);
    });
    $$('[data-go]').forEach(b => b.addEventListener('click', () => this.go(b.dataset.go)));
    $('#btnSettings').addEventListener('click', () => this.go('settings'));
    $('#btnBack').addEventListener('click', () => history.back());
    $('#btnRefresh').addEventListener('click', () => this.sync(true));
    document.addEventListener('click', (e) => { if (e.target.closest('[data-export]')) this.exportCsv(); });
    $$('#mSort button').forEach(b => b.addEventListener('click', () => { this.sort = b.dataset.sort; this.renderMembers(); }));
    $('#mQ').addEventListener('input', (e) => { this.mq = e.target.value; this.renderMembers(); });
    $('#tQ').addEventListener('input', (e) => { this.tq = e.target.value; this.renderTx(); });
    $('#memberList').addEventListener('click', (e) => { const r = e.target.closest('[data-id]'); if (r) this.openMember(r.dataset.id); });
    $('#topList').addEventListener('click', (e) => { const r = e.target.closest('[data-id]'); if (r) this.openMember(r.dataset.id); });
    $('#recentList').addEventListener('click', (e) => { const r = e.target.closest('[data-k]'); if (r) this.openTx(r.dataset.k, true); });
    $('#txList').addEventListener('click', (e) => { const r = e.target.closest('[data-k]'); if (r) this.openTx(r.dataset.k, true); });
    $('#dHist').addEventListener('click', (e) => { const r = e.target.closest('[data-k]'); if (r) this.openTx(r.dataset.k, false); });
    $('#btnEdit').addEventListener('click', () => this.openEdit());
    $('#editForm').addEventListener('submit', (e) => { e.preventDefault(); this.saveEdit(); });
    $('#btnDelete').addEventListener('click', () => this.deleteMember());
    $('#inName').addEventListener('input', (e) => e.target.closest('.field').classList.remove('bad'));
    $('#inPhone').addEventListener('input', (e) => {
      const el = e.target;
      el.value = Phone.local(Phone.normalize(el.value));
      el.closest('.field').classList.remove('bad');
    });
    $$('.sheet [data-close]').forEach(el => el.addEventListener('click', () => this.closeSheet()));
    $('#cYes').addEventListener('click', () => this.answer('yes'));
    $('#cNo').addEventListener('click', () => this.answer('no'));
    $$('#swatches button').forEach(b => b.addEventListener('click', () => { Store.set('palette', b.dataset.palette); this.applyTheme(); }));
    $$('#themeSeg button').forEach(b => b.addEventListener('click', () => { Store.set('theme', b.dataset.theme); this.applyTheme(); }));
    $('#btnLogout').addEventListener('click', () => this.logout());
    $('#btnInstall').addEventListener('click', () => this.install());
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); this.installEvt = e; $('#btnInstall').hidden = false; });
    window.addEventListener('appinstalled', () => { this.installEvt = null; $('#btnInstall').hidden = true; });
    window.addEventListener('popstate', (e) => this.onPop(e));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (this.sheet) this.closeSheet(); else if (this.menus.some(m => m.isOpen)) Menu.closeAll(); else if (this.view === 'member' || this.view === 'settings') history.back(); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && Store.get('kode')) this.sync(); });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => this.applyTheme());
    this.initTip();
    this.applyTheme();

    let ready = Promise.resolve();
    if (Store.get('kode')) {
      const cache = Store.json('cache', null);
      if (cache) { Data.load(cache); this.syncedAt = Store.get('cacheAt') ? +Store.get('cacheAt') : 0; }
      this.enter(cache ? 'home' : null);
      ready = this.sync(!cache);
    } else {
      this.show('login');
    }
    const min = new Promise(r => setTimeout(r, 650));
    const max = new Promise(r => setTimeout(r, 4000));
    Promise.race([Promise.all([ready.catch(() => {}), min]), max]).then(() => this.hideSplash());
    setInterval(() => this.tickLive(), 15000);
  },

  hideSplash() {
    const s = $('#splash');
    if (!s || s.classList.contains('out')) return;
    s.classList.add('out');
    setTimeout(() => s.remove(), 400);
  },

  applyTheme() {
    const root = document.documentElement;
    const palette = Store.get('palette') || 'orange';
    const theme = Store.get('theme') || 'auto';
    const mode = theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-mode', mode);
    $$('#swatches button').forEach(b => b.classList.toggle('on', b.dataset.palette === palette));
    $$('#themeSeg button').forEach(b => b.classList.toggle('on', b.dataset.theme === theme));
    const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
    const meta = $('meta[name="theme-color"]');
    if (meta && bg) meta.setAttribute('content', bg);
  },

  async login() {
    const f = $('#inKode');
    const kode = f.value.trim();
    if (!kode) { f.closest('.field').classList.add('bad'); f.focus(); return; }
    this.loading(true);
    try {
      const raw = await Api.data(kode);
      Store.set('kode', kode);
      this.save(raw);
      Data.load(raw);
      f.value = '';
      this.enter('home');
    } catch (e) {
      if (e.code === 'AUTH') { f.closest('.field').classList.add('bad'); f.select(); }
      this.toast(e.message);
    } finally {
      this.loading(false);
    }
  },

  save(raw) {
    this.syncedAt = Date.now();
    Store.setJson('cache', raw);
    Store.set('cacheAt', String(this.syncedAt));
  },

  enter(view) {
    this.mStore.setItems([{ v: '', t: 'Semua toko', ic: 'store' }].concat(Data.toko.map(t => ({ v: t, t }))));
    if (this.toko && !Data.toko.includes(this.toko) && Data.toko.length) { this.toko = ''; Store.set('tokoFilter', ''); }
    this.mStore.set(this.toko);
    if (view) this.show(view, true);
    clearInterval(this.timer);
    this.timer = setInterval(() => { if (!document.hidden) this.sync(); }, CONFIG.REFRESH_MS);
    this.tickLive();
  },

  async sync(loud) {
    if (this.syncing) return;
    this.syncing = true;
    $('#btnRefresh').classList.add('spin');
    document.body.classList.add('loading-data');
    if (loud && !Data.members.length) this.loading(true);
    try {
      const raw = await Api.data();
      this.save(raw);
      Data.load(raw);
      this.enter(this.view && this.view !== 'login' ? null : 'home');
      this.render();
    } catch (e) {
      if (e.code === 'AUTH') { this.toast(e.message); this.logout(true); }
      else if (loud) this.toast(e.message);
    } finally {
      this.syncing = false;
      $('#btnRefresh').classList.remove('spin');
      document.body.classList.remove('loading-data');
      this.loading(false);
      this.tickLive();
    }
  },

  tickLive() {
    const el = $('#live');
    if (!this.syncedAt) { el.hidden = true; return; }
    el.hidden = false;
    const fresh = Date.now() - this.syncedAt < CONFIG.REFRESH_MS * 2.5;
    el.classList.toggle('stale', !fresh);
    el.parentElement.title = F.time(this.syncedAt);
  },

  go(view) {
    if (view === this.view) { if (view !== 'settings') scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (view === 'settings') { history.pushState({ v: 'settings', from: this.view }, ''); this.show('settings'); return; }
    if (this.view === 'member' || this.view === 'settings') { history.replaceState(null, ''); }
    this.show(view, true);
  },

  openMember(id) {
    if (!Data.member(id)) return;
    this.memberId = id;
    if (this.view === 'member') history.replaceState({ v: 'member', id }, '');
    else history.pushState({ v: 'member', id, from: this.view }, '');
    this.show('member');
  },

  onPop() {
    if (this.view === 'member' || this.view === 'settings') this.show(this.base || 'home', true);
  },

  show(view, top) {
    if (TABS.includes(view) && view !== 'settings') this.base = view;
    this.view = view;
    Menu.closeAll();
    this.hideTip();
    if (this.sheet) this.closeSheet();
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === view));
    const b = document.body;
    b.classList.toggle('is-login', view === 'login');
    b.classList.toggle('no-filter', view === 'member' || view === 'settings');
    b.classList.toggle('no-period', view === 'members');
    const sub = view === 'member' || (view === 'settings' && innerWidth < 1040);
    $('#btnBack').hidden = !sub;
    $('#topLogo').hidden = sub;
    $('#pageTitle').textContent = TITLES[view] || '';
    $('#btnSettings').hidden = view === 'settings';
    const cur = view === 'member' ? this.base : view;
    $$('.tabbar button, .side-nav button').forEach(x => x.classList.toggle('on', x.dataset.go === cur));
    if (top) scrollTo(0, 0);
    this.render();
  },

  render() {
    if (this.view === 'home') this.renderHome();
    else if (this.view === 'members') this.renderMembers();
    else if (this.view === 'member') this.renderMember();
    else if (this.view === 'tx') this.renderTx();
    else if (this.view === 'stores') this.renderStores();
  },

  inStore(t) { return !this.toko || t.store === this.toko; },
  txIn(from, to) { return Data.tx.filter(t => t.at >= from && t.at < to && this.inStore(t)); },

  setDelta(el, d, invert) {
    el.className = el.className.replace(/\s?(up|dn|flat)\b/g, '');
    if (d === null || !isFinite(d)) { el.innerHTML = ''; return; }
    const up = d >= 0;
    el.classList.add(Math.abs(d) < 0.005 ? 'flat' : (up !== !!invert ? 'up' : 'dn'));
    el.innerHTML = (Math.abs(d) < 0.005 ? '' : ic(up ? 'up' : 'dn')) + F.pct(d);
  },

  renderHome() {
    const r = rangeOf(this.period);
    const cur = this.txIn(r.from, r.to);
    const prev = r.pFrom ? this.txIn(r.pFrom, r.pTo) : [];
    const a = sum(cur), p = sum(prev);
    const hasPrev = !!r.pFrom;

    const om = $('#hOmzet');
    om.innerHTML = `<small>Rp</small>${a.omzet >= 1e9 ? F.short(a.omzet) : fmt(a.omzet)}`;
    this.setDelta($('#hOmzetD'), hasPrev ? delta(a.omzet, p.omzet) : null);
    $('#tTx').textContent = F.count(a.n);
    $('#tGift').textContent = F.count(a.gifts);
    this.setDelta($('#tTxD'), hasPrev ? delta(a.n, p.n) : null);
    this.setDelta($('#tGiftD'), hasPrev ? delta(a.gifts, p.gifts) : null);
    const inMs = (m) => !this.toko || m.store === this.toko;
    const nNew = Data.members.filter(m => m.createdAt >= r.from && m.createdAt < r.to && inMs(m)).length;
    const pNew = hasPrev ? Data.members.filter(m => m.createdAt >= r.pFrom && m.createdAt < r.pTo && inMs(m)).length : 0;
    $('#tNew').textContent = F.count(nNew);
    this.setDelta($('#tNewD'), hasPrev ? delta(nNew, pNew) : null);
    $('#tAct').textContent = F.count(a.ids.size);
    this.setDelta($('#tActD'), hasPrev ? delta(a.ids.size, p.ids.size) : null);

    const buckets = this.buckets(r, cur);
    Chart.spark($('#hSpark'), buckets.map(b => b.v));
    Chart.cols($('#trendChart'), buckets);
    $('#trendSub').textContent = { hour: 'per jam', day: 'per hari', week: 'per minggu', month: 'per bulan' }[buckets.unit] || '';

    const showHours = this.period !== 'today';
    $('#hoursCard').hidden = !showHours;
    if (showHours) {
      const [h0, h1] = Data.hours;
      const hc = new Array(24).fill(0);
      cur.forEach(t => { if (Data.isSale(t)) hc[new Date(t.at).getHours()]++; });
      const items = [];
      for (let h = h0; h <= h1; h++) items.push({ v: hc[h], tv: fmt(hc[h]) + ' trx', tl: String(h).padStart(2, '0') + '.00–' + String(h + 1).padStart(2, '0') + '.00', x: h % 3 === 0 ? String(h) : '' });
      Chart.cols($('#hoursChart'), items, { peak: true });
      const top = items.reduce((x, y) => (y.v > x.v ? y : x), items[0]);
      $('#hoursSub').textContent = top && top.v ? top.tl : '';
    }

    $('#storeCard').hidden = !!this.toko || Data.toko.length < 2;
    if (!this.toko) {
      const by = new Map();
      cur.forEach(t => { if (Data.isSale(t)) by.set(t.store, (by.get(t.store) || 0) + t.amount); });
      const items = Array.from(by, ([name, v]) => ({ name: name || '–', v, tv: F.rps(v) })).sort((x, y) => y.v - x.v).slice(0, 5);
      Chart.bars($('#storeBars'), items);
    }

    const per = new Map();
    cur.forEach(t => {
      if (!Data.isSale(t)) return;
      const o = per.get(t.id) || { id: t.id, name: t.name, v: 0, n: 0 };
      o.v += t.amount; o.n++;
      per.set(t.id, o);
    });
    const top = Array.from(per.values()).sort((x, y) => y.v - x.v).slice(0, 5);
    $('#topList').innerHTML = top.length ? top.map((o, i) => {
      const m = Data.member(o.id) || { name: o.name || o.id, stamps: 0 };
      return `<button class="row" data-id="${esc(o.id)}">
        <span class="av medal" data-rank="${i + 1}">${esc(F.initial(m.name))}</span>
        <span class="row-main"><span class="row-t">${esc(m.name)}</span><span class="row-s">${ic('receipt')}<span>${fmt(o.n)}×</span></span></span>
        <span class="row-end"><span class="row-amt">${F.rps(o.v)}</span>${Stamp.chips(m.stamps)}</span>
      </button>`;
    }).join('') : this.emptyRow('users');

    const recent = cur.slice(0, 6);
    $('#recentList').innerHTML = recent.length ? recent.map(t => this.txRow(t, true)).join('') : this.emptyRow('receipt');
  },

  buckets(r, list) {
    const out = [];
    const now = Date.now();
    let unit;
    if (this.period === 'today') {
      unit = 'hour';
      const [h0, h1] = Data.hours;
      const hv = new Array(24).fill(0), hn = new Array(24).fill(0);
      list.forEach(t => { if (Data.isSale(t)) { const h = new Date(t.at).getHours(); hv[h] += t.amount; hn[h]++; } });
      for (let h = h0; h <= h1; h++) out.push({ v: hv[h], tv: F.rp(hv[h]), tl: String(h).padStart(2, '0') + '.00 · ' + fmt(hn[h]) + ' trx', x: h % 3 === 0 ? String(h) : '' });
    } else if (r.days <= 45) {
      unit = 'day';
      const n = r.days;
      const v = new Array(n).fill(0), c = new Array(n).fill(0);
      list.forEach(t => { if (!Data.isSale(t)) return; const i = Math.round((sod(t.at) - r.from) / DAY); if (i >= 0 && i < n) { v[i] += t.amount; c[i]++; } });
      const step = n <= 8 ? 1 : n <= 16 ? 2 : n <= 31 ? 5 : 7;
      for (let i = 0; i < n; i++) {
        const d = new Date(r.from + i * DAY + DAY / 2);
        const lastI = n - 1 - i;
        out.push({ v: v[i], tv: F.rp(v[i]), tl: F.day(d.getTime()) + ' · ' + fmt(c[i]) + ' trx', x: lastI % step === 0 ? (n <= 8 ? DOW[d.getDay()].slice(0, 3) : String(d.getDate())) : '' });
      }
    } else if (r.days <= 180) {
      unit = 'week';
      const n = Math.ceil(r.days / 7);
      const start = sod(now) + DAY - n * 7 * DAY;
      const v = new Array(n).fill(0), c = new Array(n).fill(0);
      list.forEach(t => { if (!Data.isSale(t)) return; const i = Math.floor((t.at - start) / (7 * DAY)); if (i >= 0 && i < n) { v[i] += t.amount; c[i]++; } });
      const step = n <= 8 ? 1 : n <= 14 ? 2 : 4;
      for (let i = 0; i < n; i++) {
        const s = start + i * 7 * DAY;
        out.push({ v: v[i], tv: F.rp(v[i]), tl: F.date(s) + ' – ' + F.date(s + 6 * DAY) + ' · ' + fmt(c[i]) + ' trx', x: (n - 1 - i) % step === 0 ? new Date(s).getDate() + '/' + (new Date(s).getMonth() + 1) : '' });
      }
    } else {
      unit = 'month';
      const a = new Date(r.from), b = new Date(now);
      const n = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth() + 1;
      const v = new Array(n).fill(0), c = new Array(n).fill(0);
      list.forEach(t => { if (!Data.isSale(t)) return; const d = new Date(t.at); const i = (d.getFullYear() - a.getFullYear()) * 12 + d.getMonth() - a.getMonth(); if (i >= 0 && i < n) { v[i] += t.amount; c[i]++; } });
      for (let i = 0; i < n; i++) {
        const d = new Date(a.getFullYear(), a.getMonth() + i, 1);
        out.push({ v: v[i], tv: F.rp(v[i]), tl: MON[d.getMonth()] + ' ' + d.getFullYear() + ' · ' + fmt(c[i]) + ' trx', x: n <= 12 || i % 2 === 0 ? MON[d.getMonth()] : '' });
      }
    }
    out.unit = unit;
    return out;
  },

  get dl() { return `<button class="pill pill-dl" data-export aria-label="Unduh">${ic('download')}</button>`; },

  emptyRow(icon) { return `<div class="empty-state"><span>${ic(icon)}</span></div>`; },

  ptPill(t) {
    if (Data.isVoid(t)) return `<span class="pt void">${ic('ban')}Batal</span>`;
    if (t.stamps < 0) return `<span class="pt soft">${ic('gift')}${fmt(t.stamps)}</span>`;
    if (!Data.isSale(t)) return '';
    if (Data.isGift(t)) return `<span class="pt">${ic('gift')}${Stamp.label(t.balance)}</span>`;
    return `<span class="pt soft">${ic('star')}${Stamp.label(t.balance)}</span>`;
  },

  txRow(t, compact) {
    const name = Data.nameOf(t);
    const v = Data.isVoid(t);
    const big = !v && Data.batas && t.amount >= Data.batas;
    const when = compact ? F.ago(t.at) : F.time(t.at);
    const sub = this.toko ? when : when + ' · ' + t.store;
    const pts = this.ptPill(t);
    return `<button class="row${v ? ' void' : ''}" data-k="${esc(t.k)}">
      <span class="av${big ? ' warn' : v ? ' void' : ''}">${big ? ic('alert') : v ? ic('ban') : esc(F.initial(name))}</span>
      <span class="row-main"><span class="row-t">${esc(name)}</span><span class="row-s">${ic('clock')}<span>${esc(sub)}</span></span></span>
      <span class="row-end"><span class="row-amt${big ? ' flag' : ''}">${F.rp(t.amount)}</span>${pts}</span>
    </button>`;
  },

  memberRows() {
    const q = this.mq.trim().toLowerCase();
    const qd = digits(q).replace(/^0+/, '');
    let list = Data.members.filter(m => !this.toko || m.store === this.toko);
    if (q) list = list.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (qd.length >= 3 && digits(m.phone).includes(qd)));
    const idleAt = Date.now() - CONFIG.PASIF_HARI * DAY;
    const s = this.sort;
    if (s === 'idle') list = list.filter(m => (m.lastAt || m.createdAt) < idleAt).sort((a, b) => (a.lastAt || a.createdAt) - (b.lastAt || b.createdAt));
    else if (s === 'spent') list = list.slice().sort((a, b) => b.spent - a.spent);
    else if (s === 'new') list = list.slice().sort((a, b) => b.createdAt - a.createdAt);
    else list = list.slice().sort((a, b) => b.stamps - a.stamps || b.spent - a.spent);
    return list;
  },

  renderMembers() {
    $$('#mSort button').forEach(b => b.classList.toggle('on', b.dataset.sort === this.sort));
    const list = this.memberRows();
    const gifts = list.reduce((x, m) => x + Stamp.prog(m.stamps).full, 0);
    $('#mSum').innerHTML = `<span class="pill">${ic('users')}${fmt(list.length)}</span><span class="pill sun">${ic('gift')}${F.count(gifts)}</span>${this.dl}`;
    const el = $('#memberList');
    const s = this.sort;
    const row = (m) => {
      let end;
      if (s === 'spent') end = `<span class="row-amt">${F.rps(m.spent)}</span><span class="pt soft">${ic('receipt')}${fmt(m.count)}×</span>`;
      else if (s === 'new') end = `<span class="row-amt">${F.date(m.createdAt)}</span>${Stamp.chips(m.stamps)}`;
      else if (s === 'idle') end = `<span class="row-amt">${esc(F.ago(m.lastAt || m.createdAt))}</span>${Stamp.chips(m.stamps)}`;
      else end = `${Stamp.chips(m.stamps)}<span class="row-amt">${F.rps(m.spent)}</span>`;
      const sub = `${ic('phone')}<span>${esc(Phone.display(m.phone))}</span>`;
      return `<button class="row" data-id="${esc(m.id)}"><span class="av">${esc(F.initial(m.name))}</span><span class="row-main"><span class="row-t">${esc(m.name)}</span><span class="row-s">${sub}</span></span><span class="row-end">${end}</span></button>`;
    };
    this.paged(el, list, row, 'users');
  },

  paged(el, list, row, icon) {
    if (this._io) this._io.disconnect();
    if (!list.length) { el.innerHTML = this.emptyRow(icon); return; }
    let n = 0;
    const more = () => {
      const chunk = list.slice(n, n + PAGE);
      n += chunk.length;
      const s = $('.sentinel', el);
      if (s) s.remove();
      el.insertAdjacentHTML('beforeend', chunk.map(row).join('') + (n < list.length ? '<div class="sentinel"></div>' : ''));
      const ns = $('.sentinel', el);
      if (ns) this._io.observe(ns);
    };
    el.innerHTML = '';
    this._io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) more(); }, { rootMargin: '600px' });
    more();
  },

  renderMember() {
    const m = Data.member(this.memberId);
    if (!m) { history.back(); return; }
    $('#dId').textContent = m.id;
    $('#dInitial').textContent = F.initial(m.name);
    $('#dName').textContent = m.name;
    $('#dPhone').textContent = Phone.display(m.phone);
    $('#dCard').innerHTML = Stamp.card(m.stamps);
    $('#dSpent').textContent = F.rps(m.spent);
    $('#dCount').textContent = fmt(m.count);
    $('#dAvg').textContent = m.count ? F.rps(m.spent / m.count) : '–';
    $('#dLast').textContent = F.ago(m.lastAt);
    $('#dStore').textContent = m.store || '–';
    $('#dSince').textContent = m.createdAt ? F.date(m.createdAt) : '–';
    $('#dWa').href = Phone.wa(m.phone);
    $('#dTel').href = Phone.tel(m.phone);
    const hist = Data.tx.filter(t => t.id === m.id);
    $('#dHistN').textContent = hist.length ? fmt(hist.length) + '×' : '';
    const row = (t) => {
      const v = Data.isVoid(t);
      const big = !v && Data.batas && t.amount >= Data.batas;
      return `<button class="row${v ? ' void' : ''}" data-k="${esc(t.k)}"><span class="av${big ? ' warn' : v ? ' void' : ''}">${ic(big ? 'alert' : v ? 'ban' : 'receipt')}</span>
        <span class="row-main"><span class="row-t amt">${F.rp(t.amount)}</span><span class="row-s"><span>${esc(F.date(t.at) + ' ' + F.time(t.at) + ' · ' + t.store)}</span></span></span>
        <span class="row-end">${this.ptPill(t)}</span></button>`;
    };
    this.paged($('#dHist'), hist, row, 'receipt');
  },

  txRowsFiltered() {
    const r = rangeOf(this.period);
    let list = this.txIn(r.from, r.to);
    const q = this.tq.trim().toLowerCase();
    if (q) {
      const qd = digits(q).replace(/^0+/, '');
      list = list.filter(t => {
        const m = Data.member(t.id);
        return t.id.toLowerCase().includes(q) || Data.nameOf(t).toLowerCase().includes(q) || (m && qd.length >= 3 && digits(m.phone).includes(qd));
      });
    }
    return list;
  },

  renderTx() {
    const list = this.txRowsFiltered();
    const a = sum(list);
    $('#txSum').innerHTML = `<span class="pill">${ic('receipt')}${fmt(a.n)}</span><span class="pill">${F.rp(a.omzet)}</span><span class="pill sun">${ic('gift')}${F.count(a.gifts)}</span>${this.dl}`;
    const el = $('#txList');
    if (this._io) this._io.disconnect();
    if (!list.length) { el.innerHTML = this.emptyRow('receipt'); return; }
    const days = [];
    let cur = null;
    list.forEach(t => {
      const d = sod(t.at);
      if (!cur || cur.d !== d) { cur = { d, items: [], total: 0 }; days.push(cur); }
      cur.items.push(t);
      if (Data.isSale(t)) cur.total += t.amount;
    });
    const group = (g) => `<div class="day"><div class="day-head"><h3>${esc(F.day(g.d))}</h3><span>${F.rp(g.total)}</span></div>${g.items.map(t => this.txRow(t)).join('')}</div>`;
    this.paged(el, days, group, 'receipt');
  },

  renderStores() {
    const r = rangeOf(this.period);
    const cur = this.txIn(r.from, r.to);
    const prev = r.pFrom ? this.txIn(r.pFrom, r.pTo) : [];
    const names = this.toko ? [this.toko] : Data.toko;
    const total = sum(cur).omzet || 1;
    const rows = names.map(name => {
      const c = sum(cur.filter(t => t.store === name));
      const p = sum(prev.filter(t => t.store === name));
      const nNew = Data.members.filter(m => m.store === name && m.createdAt >= r.from && m.createdAt < r.to).length;
      return { name, c, d: r.pFrom ? delta(c.omzet, p.omzet) : null, nNew };
    }).sort((a, b) => b.c.omzet - a.c.omzet);
    const max = Math.max(...rows.map(x => x.c.omzet), 1);
    $('#storeGrid').innerHTML = rows.length ? rows.map((x, i) => {
      const d = x.d;
      const dl = d === null || !isFinite(d) ? '' : `<span class="delta ${Math.abs(d) < 0.005 ? '' : d >= 0 ? 'up' : 'dn'}">${Math.abs(d) < 0.005 ? '' : ic(d >= 0 ? 'up' : 'dn')}${F.pct(d)}</span>`;
      return `<div class="store">
        <div class="store-head"><span class="store-rank">${i + 1}</span><span class="store-name">${esc(x.name)}</span><span class="store-share">${F.pct(x.c.omzet / total)}</span></div>
        <div class="store-omzet">${F.rps(x.c.omzet)}${dl}</div>
        <span class="bar-track"><span class="bar-fill" style="width:${(x.c.omzet / max) * 100}%;animation-delay:${i * 60}ms"></span></span>
        <div class="store-stats">
          <div><span>Transaksi</span><b>${F.count(x.c.n)}</b></div>
          <div><span>Member baru</span><b>${F.count(x.nNew)}</b></div>
          <div><span>Rata-rata</span><b>${x.c.n ? F.rps(x.c.omzet / x.c.n) : '–'}</b></div>
        </div>
      </div>`;
    }).join('') : this.emptyRow('store');
  },

  exportCsv() {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const txt = (v) => '"=""' + String(v == null ? '' : v).replace(/"/g, '') + '"""';
    const dt = (t) => { if (!t) return ''; const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + F.time(t).replace('.', ':'); };
    let rows, name;
    if (this.view === 'members') {
      rows = [['ID', 'Nama', 'No HP', 'Stamp', 'Total Belanja', 'Jumlah Transaksi', 'Toko Daftar', 'Terdaftar', 'Terakhir Belanja'].map(q).join(',')];
      this.memberRows().forEach(m => rows.push([txt(m.id), q(m.name), txt(m.phone), m.stamps, m.spent, m.count, q(m.store), q(dt(m.createdAt)), q(dt(m.lastAt))].join(',')));
      name = 'member';
    } else {
      rows = [['Waktu', 'ID', 'Nama', 'No HP', 'Jenis', 'Belanja', 'Stamp', 'Saldo Stamp', 'Toko'].map(q).join(',')];
      this.txRowsFiltered().forEach(t => { const m = Data.member(t.id) || {}; rows.push([q(dt(t.at)), txt(t.id), q(Data.nameOf(t)), txt(m.phone || ''), q(t.type), t.amount, t.stamps, t.balance, q(t.store)].join(',')); });
      name = 'transaksi';
    }
    const blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = `loyalin-${name}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },

  openSheet(id) {
    if (this.sheet && this.sheet !== id) $('#' + this.sheet).hidden = true;
    this.sheet = id;
    $('#' + id).hidden = false;
    document.body.classList.add('has-sheet');
  },

  closeSheet() {
    if (!this.sheet) return;
    $('#' + this.sheet).hidden = true;
    this.sheet = '';
    document.body.classList.remove('has-sheet');
    this.answer(null);
  },

  answer(v) {
    const r = this._ans;
    this._ans = null;
    if (v !== null && this.sheet === 'confirmSheet') { $('#confirmSheet').hidden = true; this.sheet = ''; document.body.classList.remove('has-sheet'); }
    if (r) r(v);
  },

  confirm(o) {
    this.answer(null);
    const icn = $('#cIcon');
    icn.className = 'confirm-ic' + (o.bad ? ' bad' : '');
    icn.innerHTML = ic(o.icon);
    $('#cTitle').textContent = o.title;
    $('#cVoid').hidden = !o.void;
    $('#cBox').innerHTML = o.rows;
    $('#cWarn').hidden = !o.warn;
    $('#cWarn span').textContent = o.warn || '';
    const set = (b, x, cls) => {
      b.hidden = !x;
      if (!x) return;
      b.className = 'btn ' + (x.cls || cls);
      b.innerHTML = (x.ic ? ic(x.ic) : '') + `<span>${esc(x.t)}</span>`;
    };
    set($('#cNo'), o.no, 'btn-soft');
    set($('#cYes'), o.yes, 'btn-primary');
    $('#cActions').hidden = !o.no && !o.yes;
    $('#cActions').classList.toggle('one', !o.no || !o.yes);
    return new Promise(res => { this._ans = res; this.openSheet('confirmSheet'); });
  },

  txBox(t) {
    const m = Data.member(t.id);
    const v = Data.isVoid(t);
    return `<div class="c-row big${v ? ' void' : ''}"><span class="c-val">${F.rp(t.amount)}</span>${this.ptPill(t)}</div>
      <div class="c-row">${ic('calendar')}<span class="c-val">${esc(F.day(t.at))}</span><span class="c-sub">${F.time(t.at)}</span></div>
      <div class="c-row">${ic('store')}<span class="c-val">${esc(t.store || '–')}</span></div>
      <div class="c-row">${ic('hash')}<span class="c-val">${esc(t.id)}</span><span class="c-sub">${esc(Phone.display(m ? m.phone : ''))}</span></div>`;
  },

  memberBox(m) {
    return `<div class="c-row">${ic('user')}<span class="c-val">${esc(m.name)}</span></div>
      <div class="c-row">${ic('hash')}<span class="c-val">${esc(m.id)}</span><span class="c-sub">${esc(Phone.display(m.phone))}</span></div>
      <div class="c-row">${ic('stamp')}<span class="c-val">${Stamp.chips(m.stamps)}</span><span class="c-sub">${F.rps(m.spent)}</span></div>`;
  },

  async openTx(k, fromList) {
    const t = Data.byKey.get(k);
    if (!t) return;
    const m = Data.member(t.id);
    const name = Data.nameOf(t);
    const box = this.txBox(t);
    const r = await this.confirm({
      icon: Data.isVoid(t) ? 'ban' : 'receipt', title: name, void: Data.isVoid(t), rows: box,
      no: fromList && m ? { t: 'Member', ic: 'user' } : null,
      yes: Data.isSale(t) ? { t: 'Batalkan', ic: 'ban', cls: 'btn-danger' } : null
    });
    if (r === 'no') { this.openMember(t.id); return; }
    if (r !== 'yes') return;
    const ok = await this.confirm({
      icon: 'alert', bad: true, title: 'Batalkan transaksi?', rows: box,
      warn: m && t.stamps ? `Stamp ${Stamp.label(m.stamps)} → ${Stamp.label(m.stamps - t.stamps)}` : '',
      no: { t: 'Tidak' }, yes: { t: 'Ya, batalkan', ic: 'ban', cls: 'btn-bad' }
    });
    if (ok !== 'yes') return;
    this.loading(true);
    try {
      const res = await Api.cancel(t);
      t.type = 'Batal';
      if (res && res.member) Data.putMember(res.member);
      this.render();
      this.toast('Transaksi dibatalkan');
      this.sync();
    } catch (e) {
      if (e.code === 'BATAL') { t.type = 'Batal'; this.render(); }
      this.fail(e);
    } finally {
      this.loading(false);
    }
  },

  openEdit() {
    const m = Data.member(this.memberId);
    if (!m) return;
    $('#eTitle').textContent = m.name;
    $('#inName').value = m.name;
    $('#inPhone').value = Phone.local(m.phone);
    $$('#editForm .field').forEach(f => f.classList.remove('bad'));
    this.openSheet('editSheet');
  },

  async saveEdit() {
    const m = Data.member(this.memberId);
    if (!m) return;
    const name = $('#inName').value.replace(/\s+/g, ' ').trim();
    const phone = Phone.normalize($('#inPhone').value);
    const bad = (sel) => { const f = $(sel).closest('.field'); f.classList.remove('bad'); void f.offsetWidth; f.classList.add('bad'); $(sel).focus(); };
    if (!name) { bad('#inName'); return; }
    if (!Phone.valid(phone)) { bad('#inPhone'); this.toast('No. HP tidak valid'); return; }
    if (name === m.name && phone === m.phone) { this.closeSheet(); return; }
    this.loading(true);
    try {
      const res = await Api.editMember({ id: m.id, name, phone });
      Data.putMember(res.member);
      this.closeSheet();
      this.render();
      this.toast('Tersimpan');
      this.sync();
    } catch (e) {
      if (e.code === 'HP') bad('#inPhone');
      this.fail(e);
    } finally {
      this.loading(false);
    }
  },

  async deleteMember() {
    const m = Data.member(this.memberId);
    if (!m) return;
    this.closeSheet();
    const ok = await this.confirm({
      icon: 'trash', bad: true, title: 'Hapus member?', rows: this.memberBox(m),
      warn: m.stamps ? `${fmt(m.stamps)} stamp ikut terhapus` : '',
      no: { t: 'Tidak' }, yes: { t: 'Ya, hapus', ic: 'trash', cls: 'btn-bad' }
    });
    if (ok !== 'yes') return;
    this.loading(true);
    try {
      await Api.deleteMember(m.id);
      Data.dropMember(m.id);
      history.back();
      this.toast('Member dihapus');
      this.sync();
    } catch (e) {
      this.fail(e);
    } finally {
      this.loading(false);
    }
  },

  fail(e) {
    this.toast(e.message);
    if (e.code === 'AUTH') this.logout(true);
    else if (e.code === 'GONE') this.sync(true);
  },

  initTip() {
    const tip = $('#tip');
    const showFor = (col) => {
      if (!col) return;
      const bar = col.querySelector('span') || col;
      const r = bar.getBoundingClientRect();
      const cr = col.getBoundingClientRect();
      tip.querySelector('b').textContent = col.dataset.v;
      tip.querySelector('span').textContent = col.dataset.l;
      tip.hidden = false;
      const w = tip.offsetWidth;
      const x = Math.min(Math.max(cr.left + cr.width / 2, w / 2 + 8), innerWidth - w / 2 - 8);
      tip.style.left = x + 'px';
      tip.style.top = Math.max(r.top, 60) + 'px';
    };
    document.addEventListener('pointerover', (e) => { const c = e.target.closest('.col'); if (c) showFor(c); });
    document.addEventListener('pointerout', (e) => { const c = e.target.closest('.col'); if (c && !c.contains(e.relatedTarget)) this.hideTip(); });
    document.addEventListener('focusin', (e) => { const c = e.target.closest('.col'); if (c) showFor(c); });
    document.addEventListener('focusout', (e) => { if (e.target.closest('.col')) this.hideTip(); });
    addEventListener('scroll', () => this.hideTip(), { passive: true });
  },
  hideTip() { const t = $('#tip'); if (t) t.hidden = true; },

  logout(silent) {
    Store.del('kode'); Store.del('cache'); Store.del('cacheAt');
    clearInterval(this.timer);
    Data.load({});
    this.syncedAt = 0;
    history.replaceState(null, '');
    this.show('login', true);
    if (!silent) this.toast('Keluar');
  },

  async install() {
    if (!this.installEvt) return;
    this.installEvt.prompt();
    try { await this.installEvt.userChoice; } catch (e) {}
    this.installEvt = null;
    $('#btnInstall').hidden = true;
  },

  loading(on) { $('#loader').hidden = !on; },

  toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this._t);
    this._t = setTimeout(() => { t.hidden = true; }, 2600);
  }
};

App.init();
