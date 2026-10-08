/* ---------- Installations ----------
   fx = position from the left (0 to 100), fy = position from the top (0 to 100) */
const INSTALLATIONS = [
  { id: 1, name: "Installation 1", color: "#5b2cff", fx: 50, fy: 32, text: "description" },
  { id: 2, name: "Installation 2", color: "#ff2bd6", fx: 33, fy: 50, text: "description" },
  { id: 3, name: "Installation 3", color: "#e8ff1a", fx: 52, fy: 52, text: "description" },
  { id: 4, name: "Installation 4", color: "#19e6e6", fx: 67, fy: 48, text: "description" },
  { id: 5, name: "Installation 5", color: "#4dff1a", fx: 58, fy: 66, text: "description" },
];

/* ---------- Elements ---------- */
const $ = (sel) => document.querySelector(sel);
const mapEl = $("#map");
const layerEl = $("#markerLayer");
const input = $("#searchInput");
const resultsEl = $("#searchResults");

/* ---------- Map image ---------- */
mapEl.innerHTML = '<img src="eindhoven-map.png" alt="Map of Eindhoven">';

/* ---------- Markers ---------- */
INSTALLATIONS.forEach((inst) => {
  const el = document.createElement("button");
  el.className = "marker";
  el.type = "button";
  el.textContent = inst.id;
  el.style.setProperty("--c", inst.color);
  el.style.left = inst.fx + "%";
  el.style.top = inst.fy + "%";
  el.setAttribute("aria-label", inst.name);
  el.addEventListener("click", () => select(inst.id));
  layerEl.appendChild(el);
});

/* ---------- Installation pages ----------
   Add a line here for each page you make, e.g. 2: "installation-2.html" */
const PAGES = {
  1: "installation-1.html",
};

function select(id) {
  if (PAGES[id]) window.location.href = PAGES[id];
}

/* ---------- Search ---------- */
let matches = [];
let active = -1;

function findMatches(raw) {
  const text = raw.trim().toLowerCase();
  if (!text) return [];
  const q = text.replace(/installation|#/g, "").trim();
  if (!q) return INSTALLATIONS;
  return INSTALLATIONS.filter((i) => String(i.id).includes(q) || i.name.toLowerCase().includes(text));
}

function renderResults() {
  resultsEl.innerHTML = "";
  if (!input.value.trim()) {
    resultsEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    return;
  }
  if (!matches.length) {
    resultsEl.innerHTML = `<li class="empty">No installation found. Try a number from 1 to 5.</li>`;
  } else {
    matches.forEach((inst, idx) => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", idx === active);
      li.innerHTML = `<span style="width:28px;height:28px;border:3px solid ${inst.color};border-radius:50%;display:grid;place-items:center;font-size:.8rem;font-weight:700">${inst.id}</span>${inst.name}`;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); choose(inst); });
      resultsEl.appendChild(li);
    });
  }
  resultsEl.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function choose(inst) {
  input.value = inst.name;
  resultsEl.hidden = true;
  input.setAttribute("aria-expanded", "false");
  input.blur();
  select(inst.id);
}

input.addEventListener("input", () => {
  matches = findMatches(input.value);
  active = matches.length ? 0 : -1;
  renderResults();
});

input.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown" && matches.length) {
    e.preventDefault(); active = (active + 1) % matches.length; renderResults();
  } else if (e.key === "ArrowUp" && matches.length) {
    e.preventDefault(); active = (active - 1 + matches.length) % matches.length; renderResults();
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (matches[active]) choose(matches[active]);
  } else if (e.key === "Escape") {
    resultsEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
  }
});

input.addEventListener("blur", () => { resultsEl.hidden = true; });
input.addEventListener("focus", () => { if (input.value.trim()) renderResults(); });

/* ---------- Bottom bar: switching screens ---------- */
function showView(name) {
  document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
  document.querySelectorAll(".dock-btn").forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle("is-active", on);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
}

document.querySelectorAll(".dock-btn").forEach((b) =>
  b.addEventListener("click", () => showView(b.dataset.view))
);