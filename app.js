const STORAGE_KEY = "ccc_clients_v1";

// Tier cadence (days)
const CADENCE_DAYS = { 3: 30, 2: 60, 1: 90 };

const clientForm = document.getElementById("clientForm");
const clientList = document.getElementById("clientList");
const search = document.getElementById("search");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");
const todayList = document.getElementById("todayList");


const state = {
  clients: loadClients(),
  query: ""
};

render();

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
    lastTouch: ""
  };

  state.clients.unshift(client);
  saveAndRender();
  clientForm.reset();
});


  state.clients.unshift(client);
  saveAndRender();
  clientForm.reset();
});

search.addEventListener("input", e => {
  state.query = e.target.value.toLowerCase();
  render();
});

function render() {
  renderToday(state.clients);
  clientList.innerHTML = "";
  const rows = state.clients.filter(c =>
    `${c.name} ${c.contact}`.toLowerCase().includes(state.query)
  );

  rows.forEach(c => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.name}</td>
      <td>Tier ${c.tier}</td>
      <td>${c.lastTouch || "—"}</td>
      <td>${c.nextAction || "—"}</td>
      <td>
        <button onclick="touch('${c.id}')">Touched</button>
        <button onclick="removeClient('${c.id}')" class="danger">Delete</button>
      </td>
    `;
    clientList.appendChild(tr);
  });
}

function touch(id) {
  const c = state.clients.find(x => x.id === id);
  c.lastTouch = new Date().toISOString().slice(0,10);
  saveAndRender();
}

function removeClient(id) {
  state.clients = state.clients.filter(x => x.id !== id);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
  render();
}

function loadClients() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

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

function attentionInfo(c) {
  const cadence = CADENCE_DAYS[c.tier] ?? 60;
  const daysSince = c.lastTouch ? daysBetween(c.lastTouch, todayISO()) : 9999;

  const overdueDays = Math.max(0, daysSince - cadence);
  const daysUntilDue = Math.max(0, cadence - daysSince);

  let score = 0;
  if (overdueDays > 0) score += 1000 + overdueDays * 10;
  else score += Math.max(0, (30 - daysUntilDue));

  if (c.nextAction && c.nextAction.trim().length > 0) score += 250;
  if (!c.lastTouch) score += 300;

  return { cadence, daysSince, overdueDays, daysUntilDue, score };
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderToday(clients) {
  if (!todayList) return;

  const ranked = [...clients]
    .map(c => ({ c, info: attentionInfo(c) }))
    .sort((a, b) => b.info.score - a.info.score);

  const top = ranked.slice(0, 10);
  todayList.innerHTML = "";

  for (const { c, info } of top) {
    const li = document.createElement("li");
    li.className = "todayItem";

    const duePillClass =
      info.overdueDays > 0 ? "pill danger" :
      info.daysUntilDue === 0 ? "pill warn" :
      "pill";

    const dueText =
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
        <span>Last touch: ${c.lastTouch || "Never"}</span>
        ${c.nextAction ? `<span>Next: ${escapeHtml(c.nextAction)}</span>` : ""}
      </div>
      <div class="actions">
        <button class="touchBtn">Touched Today</button>
        <button class="editBtn">Edit</button>
      </div>
    `;

    li.querySelector(".touchBtn").addEventListener("click", () => {
      c.lastTouch = todayISO();
      saveAndRender(); // uses your existing save flow
    });

    li.querySelector(".editBtn").addEventListener("click", () => {
      // If you already have an edit modal, this will do nothing unless openEdit exists.
      // We’ll wire edit next step if needed.
      if (typeof openEdit === "function") openEdit(c);
      else alert("Edit wiring comes next step.");
    });

    todayList.appendChild(li);
  }
}

