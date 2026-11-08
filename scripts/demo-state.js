(() => {
  "use strict";

  const key = "themba_demo_state_v1";
  const collections = [
    "approvals",
    "bills",
    "contributions",
    "events",
    "invites",
    "loans",
    "members",
    "notifications",
    "reminders",
    "stokvels"
  ];

  function emptyState() {
    return {
      version: 1,
      collections: Object.fromEntries(collections.map((name) => [name, []]))
    };
  }

  function readState() {
    const raw = localStorage.getItem(key);
    if (!raw) return emptyState();

    const state = JSON.parse(raw);
    if (state.version !== 1 || !state.collections || typeof state.collections !== "object") {
      throw new Error("The saved demo data is invalid. Clear the Themba demo data and reload.");
    }

    for (const name of collections) {
      if (!Array.isArray(state.collections[name])) state.collections[name] = [];
    }
    return state;
  }

  function writeState(state) {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      throw new Error("Could not save this demo action in browser storage.", { cause: error });
    }
  }

  function createId(prefix) {
    const id = typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}-${id}`;
  }

  function list(name) {
    if (!collections.includes(name)) throw new Error(`Unknown demo data collection: ${name}`);
    return readState().collections[name];
  }

  function add(name, value) {
    if (!collections.includes(name)) throw new Error(`Unknown demo data collection: ${name}`);
    const state = readState();
    const record = {
      id: value.id || createId(name),
      createdAt: value.createdAt || new Date().toISOString(),
      ...value
    };
    state.collections[name].push(record);
    state.collections.events.push({
      id: createId("event"),
      type: `created:${name}`,
      recordId: record.id,
      createdAt: record.createdAt,
      summary: value.summary || value.name || value.title || name
    });
    writeState(state);
    window.dispatchEvent(new CustomEvent("themba:demo-state", { detail: { name, record } }));
    return record;
  }

  function update(name, id, changes) {
    if (!collections.includes(name)) throw new Error(`Unknown demo data collection: ${name}`);
    const state = readState();
    const record = state.collections[name].find((item) => item.id === id);
    if (!record) throw new Error(`Demo ${name} record was not found.`);
    Object.assign(record, changes, { updatedAt: new Date().toISOString() });
    state.collections.events.push({
      id: createId("event"),
      type: `updated:${name}`,
      recordId: id,
      createdAt: new Date().toISOString(),
      summary: changes.summary || changes.status || name
    });
    writeState(state);
    window.dispatchEvent(new CustomEvent("themba:demo-state", { detail: { name, record } }));
    return record;
  }

  function getPreference(name, fallback = null) {
    const state = readState();
    const item = state.collections[name];
    return item === undefined ? fallback : item;
  }

  function setPreference(name, value) {
    if (collections.includes(name)) throw new Error("Use a demo data collection for this preference.");
    const state = readState();
    state.collections[name] = value;
    writeState(state);
    window.dispatchEvent(new CustomEvent("themba:demo-state", { detail: { name, value } }));
  }

  window.ThembaDemo = Object.freeze({ add, createId, getPreference, list, setPreference, update });
})();
