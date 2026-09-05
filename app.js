/* ============================================================
   Vape Shop — catálogo, carrinho e checkout no WhatsApp
   ============================================================ */

const CONFIG = {
  // Número que recebe o pedido, formato internacional só com dígitos.
  whatsapp: "5551997818204",
  storeName: "Vape Shop",
};

const STORAGE = { cart: "vapeshop.cart.v2", age: "vapeshop.age18" };

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (n) => BRL.format(n);

const $ = (sel) => document.querySelector(sel);

/* localStorage pode lançar (modo privado, cookies bloqueados) — nunca derruba a página. */
const store = {
  get(k, fallback) {
    try {
      const raw = localStorage.getItem(k);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignora */ }
  },
};

const slug = (s) =>
  (s || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/* ─────────────────────── Paleta ─────────────────────── */

const paletteCache = new Map();

function paletteFor(key) {
  const k = slug(key);
  if (paletteCache.has(k)) return paletteCache.get(k);
  const hit = PALETTE.find((r) => k.includes(r.match)) || PALETTE_FALLBACK;
  paletteCache.set(k, hit);
  return hit;
}

const brandColor = (b) => BRAND_COLORS[b] || "#C084FC";

/* ─────────────────────── Arte do device (SVG) ───────────────────────
   Cada card desenha o aparelho: o formato vem do modelo, a cor do sabor.
   Nada de imagem externa — não quebra, não depende de host de terceiros. */

let uid = 0;

const GEOM = {
  cylinder: { x: 26, w: 48, y: 30, h: 136, rx: 24, mw: 20, mh: 16 },
  ultraslim: { x: 34, w: 32, y: 24, h: 144, rx: 16, mw: 15, mh: 15 },
  box: { x: 22, w: 56, y: 34, h: 130, rx: 14, mw: 24, mh: 17 },
  shisha: { x: 20, w: 60, y: 44, h: 122, rx: 28, mw: 16, mh: 30 },
  dual: { x: 22, w: 56, y: 32, h: 134, rx: 17, mw: 22, mh: 16 },
};

/* "Maçã verde pêssego kiwi" traz três emoji, e três não cabem no selo de 26px do
   aparelho. O selo mostra o primeiro; o chip do sabor logo abaixo mostra todos. */
function firstEmoji(s) {
  const str = s || "💨";
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const first = new Intl.Segmenter().segment(str)[Symbol.iterator]().next();
    if (!first.done) return first.value.segment;
  }
  return [...str][0] || "💨";
}

/* O nome da marca é gravado no corpo do aparelho. "BlackSheep" num ultraslim de
   32px não cabe a 9.5px, então a fonte encolhe pra largura disponível em vez de
   cortar o nome. 0.62em é a largura média de um caractere da Space Grotesk. */
function brandFontSize(brand, bodyW) {
  const fit = (bodyW - 7) / (brand.length * 0.62);
  return Math.max(5.2, Math.min(9.5, fit)).toFixed(1);
}

function deviceSVG(product, flavor) {
  const id = `d${uid++}`;
  const g = GEOM[product.form] || GEOM.box;
  const bc = brandColor(product.brand);
  const isDual = !!(product.dual && flavor.dualA && flavor.dualB);

  const pA = paletteFor(isDual ? flavor.dualA : flavor.key);
  const pB = isDual ? paletteFor(flavor.dualB) : pA;

  const bodyX = g.x, bodyY = g.y, bodyW = g.w, bodyH = g.h, bodyR = g.rx;
  const cx = 50;

  // Janela do líquido: recuada dentro do corpo, ocupando a parte de baixo.
  const winX = bodyX + 5;
  const winW = bodyW - 10;
  const winY = bodyY + bodyH * 0.30;
  const winH = bodyH * 0.70 - 7;

  const liquid = isDual
    ? `<rect x="${winX}" y="${winY}" width="${winW / 2}" height="${winH}" fill="url(#${id}a)"/>
       <rect x="${winX + winW / 2}" y="${winY}" width="${winW / 2}" height="${winH}" fill="url(#${id}b)"/>
       <line x1="${cx}" y1="${winY}" x2="${cx}" y2="${winY + winH}" stroke="rgba(10,7,16,.55)" stroke-width="1.4"/>`
    : `<rect x="${winX}" y="${winY}" width="${winW}" height="${winH}" fill="url(#${id}a)"/>`;

  // Bocal. Na shisha ele vira um tubo alto, que é o que dá a silhueta de narguilé.
  const mouth =
    product.form === "shisha"
      ? `<rect x="${cx - 4}" y="${bodyY - g.mh}" width="8" height="${g.mh + 6}" rx="4" fill="#2A1D3D" stroke="rgba(255,255,255,.16)" stroke-width="1"/>
         <ellipse cx="${cx}" cy="${bodyY - g.mh}" rx="9" ry="3.4" fill="#3A2A52" stroke="rgba(255,255,255,.18)" stroke-width="1"/>`
      : `<rect x="${cx - g.mw / 2}" y="${bodyY - g.mh + 4}" width="${g.mw}" height="${g.mh + 8}" rx="${Math.min(6, g.mw / 2)}" fill="#2A1D3D" stroke="rgba(255,255,255,.16)" stroke-width="1"/>`;

  return `<svg class="device" viewBox="0 0 100 175" role="img" aria-label="${esc(product.brand)} ${esc(product.model)} — ${esc(flavor.name)}">
  <defs>
    <linearGradient id="${id}a" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${pA.from}"/><stop offset="1" stop-color="${pA.to}"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="0.7" y2="1">
      <stop offset="0" stop-color="${pB.from}"/><stop offset="1" stop-color="${pB.to}"/>
    </linearGradient>
    <clipPath id="${id}c">
      <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${bodyR}"/>
    </clipPath>
    <filter id="${id}g" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="11"/>
    </filter>
  </defs>

  <ellipse cx="${cx}" cy="105" rx="34" ry="52" fill="${pA.accent}" opacity=".30" filter="url(#${id}g)"/>
  ${isDual ? `<ellipse cx="66" cy="115" rx="24" ry="40" fill="${pB.accent}" opacity=".26" filter="url(#${id}g)"/>` : ""}

  ${mouth}

  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${bodyR}" fill="#191024"/>

  <g clip-path="url(#${id}c)">
    ${liquid}
    <path d="M${bodyX} ${winY + winH * 0.36} Q${cx} ${winY + winH * 0.20} ${bodyX + bodyW} ${winY + winH * 0.40} L${bodyX + bodyW} ${winY} L${bodyX} ${winY} Z" fill="rgba(255,255,255,.16)"/>
    <rect x="${bodyX + 4}" y="${bodyY}" width="7" height="${bodyH}" fill="rgba(255,255,255,.14)"/>
    <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH * 0.30}" fill="rgba(12,8,20,.72)"/>
    <rect x="${bodyX}" y="${winY - 2.5}" width="${bodyW}" height="2.5" fill="${bc}" opacity=".85"/>
  </g>

  <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="${bodyR}" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="1.3"/>

  <text x="${cx}" y="${bodyY + bodyH * 0.185}" text-anchor="middle"
        font-family="Space Grotesk, sans-serif" font-size="${brandFontSize(product.brand, bodyW)}" font-weight="700"
        letter-spacing="0.3" fill="${bc}">${esc(product.brand.toUpperCase())}</text>

  <circle cx="${bodyX + bodyW - 3}" cy="${bodyY + bodyH - 14}" r="13" fill="#140c1f" stroke="${pA.accent}" stroke-width="1.4"/>
  <text x="${bodyX + bodyW - 3}" y="${bodyY + bodyH - 9}" text-anchor="middle" font-size="13">${esc(firstEmoji(flavor.emoji))}</text>
</svg>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ─────────────────────── Estado ─────────────────────── */

const state = {
  brand: "all",
  query: "",
  sort: "destaque",
  selected: {},                       // pid -> flavor key
  cart: store.get(STORAGE.cart, []),  // [{ pid, fkey, qty }]
};

CATALOG.forEach((p) => { state.selected[p.id] = p.flavors[0].key; });

const findProduct = (pid) => CATALOG.find((p) => p.id === pid);
const findFlavor = (p, fkey) => p.flavors.find((f) => f.key === fkey) || p.flavors[0];

/* Descarta linhas de carrinho que não existem mais no catálogo (catálogo editado
   depois de o cliente já ter salvo o carrinho). */
/* store.get só cobre a chave ausente: um valor gravado como "null", "{}" ou lixo
   volta como não-array e .filter estoura antes da página desenhar. */
state.cart = (Array.isArray(state.cart) ? state.cart : []).filter((it) => {
  const p = it && findProduct(it.pid);
  return p && p.flavors.some((f) => f.key === it.fkey) && Number.isFinite(it.qty) && it.qty > 0;
});

/* ─────────────────────── Portão 18+ ─────────────────────── */

const gate = $("#agegate");

/* Esconder visualmente não basta: sem tornar o resto inerte, o Tab atravessa o
   portão e dá pra montar o carrinho e chegar ao checkout sem declarar a idade. */
const behindGate = () =>
  [".site-header", "main", ".site-footer", "#cart", "#backdrop", "#cart-fab", "#toast"]
    .map((s) => document.querySelector(s))
    .filter(Boolean);

function openGate() {
  gate.hidden = false;
  document.body.classList.add("locked");
  behindGate().forEach((el) => { el.inert = true; });
  $("#agegate-yes").focus();
}
function closeGate() {
  gate.hidden = true;
  document.body.classList.remove("locked");
  behindGate().forEach((el) => { el.inert = false; });
}

if (store.get(STORAGE.age, false) === true) closeGate();
else openGate();

$("#agegate-yes").addEventListener("click", () => {
  store.set(STORAGE.age, true);
  closeGate();
});

/* ─────────────────────── Filtros ─────────────────────── */

const BRANDS = [...new Set(CATALOG.map((p) => p.brand))];

function buildChips() {
  const chips = $("#brand-chips");
  const counts = Object.fromEntries(BRANDS.map((b) => [b, CATALOG.filter((p) => p.brand === b).length]));

  const mk = (value, label, n, color) =>
    `<button class="chip" role="button" data-brand="${esc(value)}" aria-pressed="false" style="--chip-color:${color}">
       ${esc(label)} <span class="chip-n">${n}</span>
     </button>`;

  chips.innerHTML =
    mk("all", "Todas", CATALOG.length, "#C084FC") +
    BRANDS.map((b) => mk(b, b, counts[b], brandColor(b))).join("");

  chips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    state.brand = btn.dataset.brand;
    syncChips();
    render();
  });
  syncChips();
}

function syncChips() {
  document.querySelectorAll("#brand-chips .chip").forEach((c) => {
    c.setAttribute("aria-pressed", String(c.dataset.brand === state.brand));
  });
}

const terms = (q) => slug(q).split("-").filter(Boolean);

/* Os termos que a marca/modelo não explicam precisam caber TODOS num mesmo sabor.
   Buscar num campo só juntando todos os sabores faz "morango kiwi" trazer um
   modelo que tem "Morango ice" e "Kiwi passion" separados — e nenhum dos dois
   juntos, que é o que a pessoa pediu. */
function matches(p, q) {
  const t = terms(q);
  if (!t.length) return true;
  const base = slug(`${p.brand} ${p.model} ${p.puffsLabel}`);
  const rest = t.filter((x) => !base.includes(x));
  if (!rest.length) return true;
  return p.flavors.some((f) => {
    const hay = slug(f.name);
    return rest.every((x) => hay.includes(x));
  });
}

/* Guarda pelos tokens, não pela string crua: buscar "???" tem q truthy mas zero
   termos, e todo sabor casaria. */
function flavorMatches(f, q) {
  const t = terms(q);
  if (!t.length) return false;
  const hay = slug(f.name);
  return t.every((x) => hay.includes(x));
}

/* A busca sugere um sabor uma vez, quando a busca muda. Rodando isso a cada
   render, reordenar ou filtrar a grade desfaz a escolha feita à mão. */
let autoQuery = null;
function autoSelectFromQuery() {
  if (state.query === autoQuery) return;
  autoQuery = state.query;
  if (!state.query) return;
  CATALOG.forEach((p) => {
    const hit = p.flavors.find((f) => flavorMatches(f, state.query));
    if (hit) state.selected[p.id] = hit.key;
  });
}

function visibleProducts() {
  let list = CATALOG.filter((p) => (state.brand === "all" || p.brand === state.brand) && matches(p, state.query));

  const by = {
    menor: (a, b) => a.priceTo - b.priceTo,
    maior: (a, b) => b.priceTo - a.priceTo,
    puffs: (a, b) => b.puffs - a.puffs,
    desconto: (a, b) =>
      (b.priceFrom - b.priceTo) / b.priceFrom - (a.priceFrom - a.priceTo) / a.priceFrom,
  }[state.sort];

  return by ? [...list].sort(by) : list;
}

/* ─────────────────────── Render da grade ─────────────────────── */

const grid = $("#grid");

function cardHTML(p) {
  const f = findFlavor(p, state.selected[p.id]);
  const off = Math.round(((p.priceFrom - p.priceTo) / p.priceFrom) * 100);
  const qty = cartQty(p.id, f.key);

  const tags = [
    p.novo ? `<span class="tag tag-new">Lançamento</span>` : "",
    p.dual ? `<span class="tag tag-dual">2 sabores</span>` : "",
    `<span class="tag tag-off">-${off}%</span>`,
  ].join("");

  const flavors = p.flavors.map((fl) => {
    const pal = paletteFor(p.dual && fl.dualA ? fl.dualA : fl.key);
    const on = fl.key === f.key;
    return `<button class="flavor" data-pid="${esc(p.id)}" data-fkey="${esc(fl.key)}"
      aria-pressed="${on}" style="--fl-from:${pal.from};--fl-to:${pal.to}">
      <span class="flavor-em" aria-hidden="true">${esc(fl.emoji)}</span>${esc(fl.name)}
    </button>`;
  }).join("");

  return `<article class="card" data-pid="${esc(p.id)}">
    <div class="card-top">
      <div class="device-slot">${deviceSVG(p, f)}</div>
      <div class="card-meta">
        <span class="brand-tag" style="background:${brandColor(p.brand)}">${esc(p.brand)}</span>
        <h3 class="card-model">${esc(p.model)}</h3>
        <p class="card-puffs">${esc(p.puffsLabel)}</p>
        <div class="tag-row">${tags}</div>
        <div class="price-row">
          <span class="price-old">${money(p.priceFrom)}</span>
          <span class="price-new">${money(p.priceTo)}</span>
        </div>
      </div>
    </div>

    <p class="flavor-label">
      <span>${p.dual ? "Combinação" : "Sabor"} · ${p.flavors.length}</span>
      <span class="picked">${esc(f.name)}</span>
    </p>
    <div class="flavors">${flavors}</div>

    <div class="card-actions">
      <button class="add-btn" data-add="${esc(p.id)}">Adicionar ao carrinho</button>
      <span class="in-cart-pill${qty ? " on" : ""}" data-pill="${esc(p.id)}">${qty}<span aria-hidden="true">×</span></span>
    </div>
  </article>`;
}

function render() {
  autoSelectFromQuery();
  const list = visibleProducts();
  grid.innerHTML = list.map(cardHTML).join("");
  $("#empty").hidden = list.length > 0;

  const flavorCount = list.reduce((n, p) => n + p.flavors.length, 0);
  $("#result-count").textContent = list.length
    ? `${list.length} ${list.length === 1 ? "modelo" : "modelos"} · ${flavorCount} ${flavorCount === 1 ? "sabor" : "sabores"}`
    : "";
}

/* Um listener na grade inteira em vez de um por chip — são 115 sabores. */
grid.addEventListener("click", (e) => {
  const fl = e.target.closest(".flavor");
  if (fl) {
    state.selected[fl.dataset.pid] = fl.dataset.fkey;
    refreshCard(fl.dataset.pid);
    return;
  }
  const add = e.target.closest("[data-add]");
  if (add) addToCart(add.dataset.add);
});

/* Troca de sabor não re-renderiza a grade toda: só o card mexido. */
function refreshCard(pid) {
  const card = grid.querySelector(`.card[data-pid="${CSS.escape(pid)}"]`);
  if (!card) return;
  const p = findProduct(pid);
  const f = findFlavor(p, state.selected[pid]);

  card.querySelector(".device-slot").innerHTML = deviceSVG(p, f);
  card.querySelector(".flavor-label .picked").textContent = f.name;
  card.querySelectorAll(".flavor").forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.fkey === f.key));
  });

  const qty = cartQty(pid, f.key);
  const pill = card.querySelector("[data-pill]");
  pill.textContent = qty;
  pill.insertAdjacentHTML("beforeend", '<span aria-hidden="true">×</span>');
  pill.classList.toggle("on", qty > 0);
}

/* ─────────────────────── Carrinho ─────────────────────── */

const cartEl = $("#cart");
const backdrop = $("#backdrop");

const cartQty = (pid, fkey) => {
  const it = state.cart.find((i) => i.pid === pid && i.fkey === fkey);
  return it ? it.qty : 0;
};

function saveCart() { store.set(STORAGE.cart, state.cart); }

function addToCart(pid) {
  const p = findProduct(pid);
  const f = findFlavor(p, state.selected[pid]);
  const existing = state.cart.find((i) => i.pid === pid && i.fkey === f.key);
  if (existing) existing.qty += 1;
  else state.cart.push({ pid, fkey: f.key, qty: 1 });

  saveCart();
  renderCart();
  refreshCard(pid);

  const btn = grid.querySelector(`[data-add="${CSS.escape(pid)}"]`);
  if (btn) {
    btn.classList.add("added");
    btn.textContent = "Adicionado ✓";
    setTimeout(() => {
      btn.classList.remove("added");
      btn.textContent = "Adicionar ao carrinho";
    }, 1100);
  }
  toast(`${f.emoji} ${p.model} · ${f.name}`);
}

function changeQty(pid, fkey, delta) {
  const it = state.cart.find((i) => i.pid === pid && i.fkey === fkey);
  if (!it) return;
  it.qty += delta;
  if (it.qty <= 0) state.cart = state.cart.filter((i) => i !== it);
  saveCart();
  renderCart();
  refreshCard(pid);
}

const cartTotals = () =>
  state.cart.reduce(
    (acc, it) => {
      const p = findProduct(it.pid);
      acc.total += p.priceTo * it.qty;
      acc.full += p.priceFrom * it.qty;
      acc.count += it.qty;
      return acc;
    },
    { total: 0, full: 0, count: 0 }
  );

function renderCart() {
  const box = $("#cart-items");
  const { total, full, count } = cartTotals();
  const scrollY = box.scrollTop; // +/- redesenha a lista toda; sem isso ela pula pro topo

  box.innerHTML = state.cart.map((it) => {
    const p = findProduct(it.pid);
    const f = findFlavor(p, it.fkey);
    return `<div class="ci">
      <div class="ci-art">${deviceSVG(p, f)}</div>
      <div class="ci-body">
        <p class="ci-model">${esc(p.brand)} ${esc(p.model)}</p>
        <p class="ci-flavor">${esc(f.emoji)} ${esc(f.name)}</p>
        <p class="ci-price">${money(p.priceTo * it.qty)}</p>
      </div>
      <div class="qty">
        <button data-q="-1" data-pid="${esc(it.pid)}" data-fkey="${esc(it.fkey)}" aria-label="Diminuir">−</button>
        <span>${it.qty}</span>
        <button data-q="1" data-pid="${esc(it.pid)}" data-fkey="${esc(it.fkey)}" aria-label="Aumentar">+</button>
      </div>
    </div>`;
  }).join("");
  box.scrollTop = scrollY;

  const empty = state.cart.length === 0;
  $("#cart-empty").hidden = !empty;
  box.hidden = empty;

  $("#cart-total").textContent = money(total);
  $("#checkout").disabled = empty;

  const saved = full - total;
  const sv = $("#cart-savings");
  sv.hidden = saved <= 0;
  if (saved > 0) sv.textContent = `Você economiza ${money(saved)} nesse pedido 🎉`;

  $("#cart-count").hidden = count === 0;
  $("#cart-count").textContent = count;
  $("#fab-count").textContent = count;
  $("#fab-total").textContent = money(total);
  $("#cart-fab").hidden = count === 0 || cartEl.classList.contains("open");
}

$("#cart-items").addEventListener("click", (e) => {
  const b = e.target.closest("[data-q]");
  if (b) changeQty(b.dataset.pid, b.dataset.fkey, Number(b.dataset.q));
});

function openCart() {
  cartEl.classList.add("open");
  cartEl.setAttribute("aria-hidden", "false");
  backdrop.hidden = false;
  document.body.classList.add("locked");
  $("#cart-fab").hidden = true;
  $("#cart-close").focus();
}
function closeCart() {
  cartEl.classList.remove("open");
  cartEl.setAttribute("aria-hidden", "true");
  backdrop.hidden = true;
  document.body.classList.remove("locked");
  renderCart();
}

$("#cart-open").addEventListener("click", openCart);
$("#cart-fab").addEventListener("click", openCart);
$("#cart-close").addEventListener("click", closeCart);
backdrop.addEventListener("click", closeCart);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && cartEl.classList.contains("open")) closeCart();
});

/* ─────────────────────── Checkout no WhatsApp ───────────────────────
   api.whatsapp.com/send abre o app com o texto já escrito; quem envia é o
   cliente. Sem backend, sem chave, sem custo. */

function orderText(compact) {
  const { total, count } = cartTotals();
  const lines = [`Olá! Vim pelo site do ${CONFIG.storeName} e quero fazer um pedido 🛒`, ""];

  state.cart.forEach((it, i) => {
    const p = findProduct(it.pid);
    const f = findFlavor(p, it.fkey);
    if (compact) {
      lines.push(`${it.qty}x ${p.brand} ${p.model} — ${f.name} — ${money(p.priceTo * it.qty)}`);
    } else {
      lines.push(`${i + 1}) ${p.brand} ${p.model} — ${p.puffsLabel}`);
      lines.push(`   Sabor: ${f.emoji} ${f.name}`);
      lines.push(`   ${it.qty} × ${money(p.priceTo)} = ${money(p.priceTo * it.qty)}`);
      lines.push("");
    }
  });

  lines.push("————————————————");
  lines.push(`Itens: ${count}`);
  lines.push(`*Total: ${money(total)}*`);
  lines.push("");
  lines.push("Confirma disponibilidade e a forma de entrega, por favor 🙏");
  return lines.join("\n");
}

const LIMITE_URL = 5800;
const tamanho = (t) => encodeURIComponent(t).length;

function textoDoPedido() {
  let text = orderText(false);
  if (tamanho(text) <= LIMITE_URL) return text;

  // Formato enxuto. Precisa ser reconferido: 30 linhas compactas ainda estouram.
  text = orderText(true);
  if (tamanho(text) <= LIMITE_URL) return text;

  // Último recurso: corta a lista mas preserva o total, que é o que não pode mentir.
  const { total, count } = cartTotals();
  const linhas = text.split("\n");
  while (linhas.length > 3 && tamanho(linhas.join("\n")) > LIMITE_URL - 240) linhas.splice(-1);
  return [
    ...linhas,
    "",
    `… e mais itens — a lista completa não coube na mensagem.`,
    "————————————————",
    `Itens: ${count}`,
    `*Total: ${money(total)}*`,
    "",
    "Mando o restante do pedido na sequência 🙏",
  ].join("\n");
}

$("#checkout").addEventListener("click", () => {
  if (state.cart.length === 0) return;

  const url = `https://api.whatsapp.com/send?phone=${CONFIG.whatsapp}&text=${encodeURIComponent(textoDoPedido())}`;

  // Clique sintético num <a target="_blank"> em vez de window.open com string de
  // features: abre como aba normal e sobrevive ao WebView do Instagram/TikTok,
  // que é de onde vem boa parte do tráfego e que descarta popup.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
});

/* ─────────────────────── Busca e ordenação ─────────────────────── */

let searchTimer;
const searchInput = $("#search");

searchInput.addEventListener("input", () => {
  $("#search-clear").hidden = searchInput.value === "";
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = searchInput.value.trim();
    render();
  }, 130);
});

$("#search-clear").addEventListener("click", () => {
  searchInput.value = "";
  state.query = "";
  $("#search-clear").hidden = true;
  render();
  searchInput.focus();
});

$("#sort").addEventListener("change", (e) => {
  state.sort = e.target.value;
  render();
});

$("#reset-filters").addEventListener("click", () => {
  state.brand = "all";
  state.query = "";
  searchInput.value = "";
  $("#search-clear").hidden = true;
  syncChips();
  render();
});

/* ─────────────────────── Toast ─────────────────────── */

let toastTimer, toastHideTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = `Adicionado: ${msg}`;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add("show"));
  // Os dois timers precisam ser cancelados: o de dentro, sozinho, esconde o
  // toast novo 220ms depois de uma segunda adição rápida.
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    toastHideTimer = setTimeout(() => { t.hidden = true; }, 220);
  }, 1900);
}

/* ─────────────────────── Boot ─────────────────────── */

$("#stat-models").textContent = CATALOG.length;
$("#stat-flavors").textContent = CATALOG.reduce((n, p) => n + p.flavors.length, 0);

buildChips();
render();
renderCart();
