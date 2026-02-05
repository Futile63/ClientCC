const STORAGE_KEY = "ccc_clients_v1";

const clientForm = document.getElementById("clientForm");
const clientList = document.getElementById("clientList");
const search = document.getElementById("search");

const editDialog = document.getElementById("editDialog");
const editForm = document.getElementById("editForm");

const state = {
  clients: loadClients(),
  query: ""
};

render();

clientForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const client = {
    id: crypto.randomUUID(),
    name: name.value.trim(),
    tier: Number(tier.value),
    contact: contact.value.trim(),
    notes: notes.value.trim(),
    nextAction: "",
    lastTouch: ""
  };

  state.clients.unshift(client);
  saveAndRender();
  clientForm.reset();
});

search.addEventListener("input", e => {
  state.query = e.target.value.toLowerCase();
  render();
});

function render() {
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