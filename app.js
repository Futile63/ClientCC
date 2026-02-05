const STORAGE_KEY = "ccc_clients_v1";

// Tier cadence (days)
const CADENCE_DAYS = { 3: 30, 2: 60, 1: 90 };

// DOM
const clientForm = document.getElementById("clientForm");
const clientList = document.getElementById("clientList");
const search = document.getElementById("search");
const todayList = document.getElementById("todayList");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");

// State
const state = {
  clients: loadClients(),
  query: ""
};

// Initial render
render();

// Events
clientForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const nameEl = document.getElementById("name");
  const tierEl = document.getElementById("tier");
  const contactEl = document.getElementById("contact");
  const notesEl = document.getElementById("notes");

  const client = {
    id: crypto.randomUUID(),
    name: nameEl.value.trim(),
    tier: Number(tierEl.value),
    contact: contactEl.value.trim(),
    notes: notesEl.value.trim(),
    nextAction: "",
    lastTouch: "" // YYYY-MM-DD
  };

  if (!client.name) return;

  state.clients.unshift(client);
  saveAndRender();
  clientForm.reset();
});

search.addEventListener("input", (e) => {
  state.query = e.target.value.trim().toLowerCase();
  render();
});

editForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = byId("editId").value;
  const c = state.clients.find(x => x.id === id);
  if (!c) return;

  c.name = byId("editName").value.trim();
  c.tier = Number(byId("editTier").value);
  c.contact = byId("editContact").value.trim();
  c.notes = byId("editNotes").value.trim();
  c.nextAction = byId("editNextAction").value.trim();

  saveAndRender();
  editDialog.close();
});

// Render
function render() {
  const rows = filteredClients(state.clients, state.query);
  renderToday(rows);
  renderTable(rows);
}

function renderTable(rows) {
  clientList.innerHTML = "";

  for (const c of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${escapeHtml(c.name)}</td>
      <td>Tier ${c.tier}</td>
      <td>${c.lastTouch ? prettyDate(c.lastTouch) : "—"}</td>
      <td>${c.nextAction ? escapeHtml(c.nextAction) : "—"}</td>
      <td>
        <button class="touchBtn">Touched</button>
        <button class="editBtn">Edit</button>
        <button class="danger delBtn">Delete</button>
      </td>
    `;

    tr.querySelector(".touchBtn").addEventListener("click", () => {
      touch(c.id);
    });

    tr.querySelector(".editBtn").addEventListener("click", () => {
      openEdit(c);
    });

    tr.querySelector(".delBtn").addEventListener("click", () => {
      removeClient(c.id);
    });

    clientList.appendChild(tr);
  }
}

function renderToday(rows) {
  if (!todayList) return;

  const ranked = [...rows]
    .map(c => ({ c, info: attentionInfo(c) }))
    .sort((a, b) => {
      if (b.info.score !== a.info.score) return b.info.score - a.info.score;
      if (b.info.overdueDays !== a.info.overdueDays) return b.info.overdueDays - a.info.overdueDays;
      return a.c.name.localeCompare(b.c.name);
    });

  const top = ranked.slice(0, 10);
  todayList.innerHTML = "";

  for (const { c, info } of top) {
    const li = document.createElement("li");
    li.className = "todayItem";

const duePillClass =
  !c.lastTouch ? "pill warn" :
  info.overdueDays > 0 ? "pill danger" :
  info.daysUntilDue === 0 ? "pill warn" :
  "pill";


const dueText =
  !c.lastTouch ? "Needs first touch" :
  info.overdueDays > 0 ? `Overdue ${info.overdueDays}d` :
  info.daysUntilDue === 0 ? "Due today" :
  `Due in ${info.daysUntilDue}d`;


    li.innerHTML = `
      <div class="todayTopRow">
        <div class="todayName">${escapeHtml(c.name)}</div>
        <div class="pills">
          <span class="${duePillClass}">${dueText}</span>
          <span class="pill">Tier ${c.tier} • ${info.cadence}d</span>
          ${c.nextAction ? `<span class="pill warn">Next action</span>` : ""}
        </div>
      </div>
      <div class="todayMeta">
        <span>Last touch: ${c.lastTouch ? prettyDate(c.lastTouch) : "Never"}</span>
        ${c.nextAction ? `<span>Next: ${escapeHtml(c.nextAction)}</span>` : ""}
      </div>
      <div class="actions">
        <button class="touchBtn">Touched Today</button>
        <button class="editBtn">Edit</button>
        <button class="danger delBtn">Delete</button>
      </div>
    `;

    li.querySelector(".touchBtn").addEventListener("click", () => touch(c.id));
    li.querySelector(".editBtn").addEventListener("click", () => openEdit(c));
    li.querySelector(".delBtn").addEventListener("click", () => removeClient(c.id));

    todayList.appendChild(li);
  }
}

// Actions
function touch(id) {
  const c = state.clients.find(x => x.id === id);
  if (!c) return;
  c.lastTouch = todayISO();
  saveAndRender();
}

function removeClient(id) {
  const c = state.clients.find(x => x.id === id);
  if (!c) return;

  const ok = confirm(`Delete ${c.name}?`);
  if (!ok) return;

  state.clients = state.clients.filter(x => x.id !== id);
  saveAndRender();
}

function openEdit(c) {
  if (!editDialog || !editForm) return;

  byId("editId").value = c.id;
  byId("editName").value = c.name;
  byId("editTier").value = String(c.tier);
  byId("editContact").value = c.contact || "";
  byId("editNotes").value = c.notes || "";
  byId("editNextAction").value = c.nextAction || "";

  editDialog.showModal();
}

// Ranking
function attentionInfo(c) {
  const cadence = CADENCE_DAYS[c.tier] ?? 60;
  const daysSince = c.lastTouch ? daysBetween(c.lastTouch, todayISO()) : 9999;

  const overdueDays = Math.max(0, daysSince - cadence);
  const daysUntilDue = Math.max(0, cadence - daysSince);

  // Score rules:
  // - overdue dominates
  // - nextAction bumps priority
  // - never touched bumps priority
  let score = 0;

  if (overdueDays > 0) score += 1000 + overdueDays * 10;
  else score += Math.max(0, (30 - daysUntilDue));

  if (c.nextAction && c.nextAction.trim().length > 0) score += 250;
  if (!c.lastTouch) score += 300;

  return { cadence, daysSince, overdueDays, daysUntilDue, score };
}

// Storage
function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  render();
}

function loadClients() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

// Helpers
function filteredClients(clients, q) {
  if (!q) return clients;
  return clients.filter(c => {
    const hay = `${c.name} ${c.contact} ${c.notes} ${c.nextAction} tier ${c.tier}`.toLowerCase();
    return hay.includes(q);
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(isoA, isoB) {
  const [ya, ma, da] = isoA.split("-").map(Number);
  const [yb, mb, db] = isoB.split("-").map(Number);
  const a = new Date(ya, ma - 1, da);
  const b = new Date(yb, mb - 1, db);
  const ms = b.getTime() - a.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function prettyDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function byId(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

