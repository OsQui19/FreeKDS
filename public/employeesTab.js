const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

let schedulePromise;
function loadScheduleScript(attempts = 3, delay = 1000) {
  if (!schedulePromise) {
    schedulePromise = new Promise((resolve, reject) => {
      const attemptLoad = (n) => {
        const script = document.createElement("script");
        script.src = "/dist/schedule.js";
        script.defer = true;
        script.onload = resolve;
        script.onerror = () => {
          script.remove();
          if (n > 1) {
            setTimeout(() => attemptLoad(n - 1), delay);
          } else {
            schedulePromise = null;
            console.error("Failed to load schedule.js");
            reject();
          }
        };
        document.head.appendChild(script);
      };
      attemptLoad(attempts);
    });
  }
  return schedulePromise;
}

function retrySync(fn, attempts = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = async (n) => {
      try {
        await fn();
        resolve();
      } catch (err) {
        if (n <= 1) {
          return reject(err);
        }
        setTimeout(() => attempt(n - 1), delay);
      }
    };
    attempt(attempts);
  });
}

async function initEmployeesTabs() {
  const tabList = document.getElementById("employeesTabs");
  const links = tabList ? tabList.querySelectorAll(".nav-link") : [];
  const panes = document.querySelectorAll(".employees-pane");
  const STORAGE_KEY = "activeEmployeesPane";

  function activate(id, skipHash) {
    if (tabList) {
      tabList.querySelectorAll(".nav-link").forEach((l) => {
        l.classList.toggle("active", l.dataset.pane === id);
      });
    }
    panes.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
    if (id) {
      storage.set(STORAGE_KEY, id);
      if (!skipHash) location.hash = id;
    }
    if (id === "schedulePane") {
      loadScheduleScript().catch(() => {});
    }
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activate(link.dataset.pane);
    });
  });

  const initial = location.hash.slice(1) || storage.get(STORAGE_KEY);
  if (initial && document.getElementById(initial)) {
    activate(initial, true);
  } else if (panes.length) {
    activate(panes[0].id, true);
  }

  await Promise.allSettled([
    retrySync(syncEmployeesFromServer, 5),
    retrySync(syncHierarchyFromServer, 5),
    retrySync(syncPermissionsFromServer, 5),
    retrySync(syncModulesFromServer, 5),
    retrySync(syncTimeFromServer, 5),
  ]);

  setupOnboardingForm();
  setupAddRoleForm();

  renderEmployeeList();
  renderOnboardingTable();
  renderHierarchy();
  renderPermissionsTable();
  renderTimeTable();


  if (window.io) {
    const socket = io();
    socket.on("timeUpdated", (rec) => {
      if (!rec || !rec.id) return;
      const data = loadTime();
      const idx = data.findIndex((r) => r.id === rec.id);
      if (idx >= 0) data[idx] = rec;
      else data.unshift(rec);
      storage.set(TIME_KEY, JSON.stringify(data.slice(0, 100)));
      renderTimeTable();
    });
  }
}

const EMPLOYEE_KEY = "employees";
const HIERARCHY_KEY = "roleHierarchy";
const PERMISSIONS_KEY = "rolePermissions";
const TIME_KEY = "timeClock";
let ALL_MODULES = [
  "stations",
  "order",
  "menu",
  "theme",
  "inventory",
  "suppliers",
  "purchase-orders",
  "reports",
  "employees",
  "locations",
];

async function syncModulesFromServer() {
  const res = await fetch("/api/modules");
  if (!res.ok) throw new Error("modules");
  const data = await res.json();
  if (Array.isArray(data.modules)) {
    ALL_MODULES = data.modules;
  } else {
    throw new Error("modules");
  }
}

async function syncEmployeesFromServer() {
  const res = await fetch("/api/employees");
  if (!res.ok) throw new Error("employees");
  const data = await res.json();
  if (Array.isArray(data.employees)) {
    let existing = [];
    try {
      existing = JSON.parse(storage.get(EMPLOYEE_KEY)) || [];
    } catch {
      existing = [];
    }
    const colorMap = {};
    existing.forEach((e) => {
      if (e.id) colorMap[e.id] = e.color;
    });
    const seen = new Set();
    const merged = data.employees
      .map((e) => ({
        ...e,
        color: colorMap[e.id] || e.color || randomColor(),
      }))
      .filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      })
      .sort((a, b) =>
        (a.last_name || a.name).localeCompare(b.last_name || b.name),
      );
    storage.set(EMPLOYEE_KEY, JSON.stringify(merged));
  } else {
    throw new Error("employees");
  }
}


async function syncHierarchyFromServer() {
  const res = await fetch("/api/hierarchy");
  if (!res.ok) throw new Error("hierarchy");
  const data = await res.json();
  if (Array.isArray(data.hierarchy)) {
    storage.set(HIERARCHY_KEY, JSON.stringify(data.hierarchy));
  } else {
    throw new Error("hierarchy");
  }
}

async function syncPermissionsFromServer() {
  const res = await fetch("/api/permissions");
  if (!res.ok) throw new Error("permissions");
  const data = await res.json();
  if (data.permissions && typeof data.permissions === "object") {
    storage.set(PERMISSIONS_KEY, JSON.stringify(data.permissions));
  } else {
    throw new Error("permissions");
  }
}

async function syncTimeFromServer() {
  const res = await fetch("/api/time-clock");
  if (!res.ok) throw new Error("time");
  const data = await res.json();
  if (Array.isArray(data.records)) {
    storage.set(TIME_KEY, JSON.stringify(data.records));
  } else {
    throw new Error("time");
  }
}

function loadTime() {
  try {
    return JSON.parse(storage.get(TIME_KEY)) || [];
  } catch {
    return [];
  }
}

function renderTimeTable() {
  const tbl = document.getElementById("timeTable");
  if (!tbl) return;
  const tbody = tbl.querySelector("tbody");
  const recs = loadTime();
  tbody.innerHTML = recs
    .map(
      (r) =>
        `<tr><td>${r.name}</td><td>${r.clock_in}</td><td>${r.clock_out || ""}</td></tr>`,
    )
    .join("");
}

function randomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
  );
}

function loadEmployees() {
  try {
    const arr = JSON.parse(storage.get(EMPLOYEE_KEY)) || [];
    let changed = false;
    arr.forEach((e) => {
      if (!e.color) {
        e.color = randomColor();
        changed = true;
      }
      if (!e.name) {
        e.name = `${e.first_name || ""} ${e.last_name || ""}`.trim();
        changed = true;
      }
    });
    if (changed) storage.set(EMPLOYEE_KEY, JSON.stringify(arr));
    return arr;
  } catch {
    return [];
  }
}

function saveEmployees(arr) {
  storage.set(EMPLOYEE_KEY, JSON.stringify(arr));
  return fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employees: arr }),
  });
}

function loadHierarchy() {
  try {
    return (
      JSON.parse(storage.get(HIERARCHY_KEY)) || ["FOH", "BOH", "management"]
    );
  } catch {
    return ["FOH", "BOH", "management"];
  }
}

function saveHierarchy(arr) {
  storage.set(HIERARCHY_KEY, JSON.stringify(arr));
  fetch("/api/hierarchy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hierarchy: arr }),
  }).catch(() => {});
}

function loadPermissions() {
  try {
    return JSON.parse(storage.get(PERMISSIONS_KEY)) || {};
  } catch {
    return {};
  }
}

function savePermissions(obj) {
  storage.set(PERMISSIONS_KEY, JSON.stringify(obj));
  fetch("/api/permissions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permissions: obj }),
  }).catch(() => {});
}

function setupOnboardingForm() {
  const form = document.getElementById("employeeOnboardingForm");
  if (!form) return;
  const idxField = document.getElementById("employeeIndex");
  const cancelBtn = document.getElementById("onboardingCancel");
  const saveBtn = document.getElementById("onboardingSave");

  function resetForm() {
    form.reset();
    idxField.value = "";
    if (cancelBtn) cancelBtn.classList.add("d-none");
    if (saveBtn) saveBtn.textContent = "Save";
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", resetForm);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const firstName = (data.get("first_name") || "").trim();
    const lastName = (data.get("last_name") || "").trim();
    const name = `${firstName} ${lastName}`.trim();
    if (!name) return;
    const index = idxField.value ? parseInt(idxField.value, 10) : -1;
    const employees = loadEmployees();
    const base =
      index >= 0 && index < employees.length ? employees[index] : null;
    const employee = {
      id: base ? base.id : Date.now().toString(),
      name,
      first_name: firstName,
      last_name: lastName,
      position: data.get("position") || "",
      start_date: data.get("start_date") || "",
      email: (data.get("email") || "").trim(),
      phone: (data.get("phone") || "").trim(),
      wage_rate: (data.get("wage_rate") || "").trim(),
      username: (data.get("username") || "").trim(),
      password: (data.get("password") || "").trim(),
      pin: (data.get("pin") || "").trim(),
      role: data.get("role") || "FOH",
      color: base && base.color ? base.color : randomColor(),
    };
    if (index >= 0 && index < employees.length) {
      employees[index] = employee;
    } else {
      employees.push(employee);
    }
    saveEmployees(employees)
      .then(() => syncEmployeesFromServer().catch(() => {}))
      .finally(() => {
        resetForm();
        renderEmployeeList();
        renderOnboardingTable();
      });
  });
}

function renderEmployeeList() {
  const list = document.getElementById("employeeList");
  if (!list) return;
  const employees = loadEmployees();
  list.innerHTML = employees
    .map(
      (e) =>
        `<li class="list-group-item" draggable="true" data-id="${e.id}" style="border-left: 10px solid ${e.color}">${e.name}<div class="text-muted small">${e.position}</div></li>`,
    )
    .join("");
  list.querySelectorAll("[draggable]").forEach((item) => {
    item.addEventListener("dragstart", (ev) => {
      ev.dataTransfer.setData("text/plain", item.dataset.id);
    });
  });
}

function renderOnboardingTable() {
  const tbl = document.getElementById("onboardingTable");
  if (!tbl) return;
  const tbody = tbl.querySelector("tbody");
  const employees = loadEmployees();
  tbody.innerHTML = employees
    .map(
      (e, i) =>
        `<tr data-index="${i}"><td>${e.first_name || ""}</td><td>${e.last_name || ""}</td><td>${e.position}</td><td>${e.start_date}</td><td>${e.email || ""}</td><td>${e.phone || ""}</td><td>${e.wage_rate || ""}</td><td>${e.username}</td><td>${e.role}</td><td><button class="btn btn-sm btn-outline-primary edit-emp" data-index="${i}">Edit</button></td></tr>`,
    )
    .join("");
  tbody.querySelectorAll(".edit-emp").forEach((btn) => {
    btn.addEventListener("click", () => {
      startEditEmployee(parseInt(btn.dataset.index, 10));
    });
  });
}

function startEditEmployee(idx) {
  const employees = loadEmployees();
  const emp = employees[idx];
  if (!emp) return;
  const form = document.getElementById("employeeOnboardingForm");
  if (!form) return;
  if (form.elements.first_name)
    form.elements.first_name.value =
      emp.first_name || emp.name.split(" ")[0] || "";
  if (form.elements.last_name)
    form.elements.last_name.value =
      emp.last_name || emp.name.split(" ").slice(1).join(" ") || "";
  if (form.elements.name) form.elements.name.value = emp.name || "";
  form.elements.position.value = emp.position || "";
  form.elements.start_date.value = emp.start_date || "";
  if (form.elements.email) form.elements.email.value = emp.email || "";
  if (form.elements.phone) form.elements.phone.value = emp.phone || "";
  if (form.elements.wage_rate)
    form.elements.wage_rate.value = emp.wage_rate || "";
  form.elements.username.value = emp.username || "";
  if (form.elements.password) form.elements.password.value = "";
  form.elements.role.value = emp.role || "";
  document.getElementById("employeeIndex").value = idx;
  const cancelBtn = document.getElementById("onboardingCancel");
  if (cancelBtn) cancelBtn.classList.remove("d-none");
  const saveBtn = document.getElementById("onboardingSave");
  if (saveBtn) saveBtn.textContent = "Update";
  if (location.hash.slice(1) !== "onboardingPane") {
    location.hash = "onboardingPane";
  }
}

function renderHierarchy() {
  const ul = document.getElementById("hierarchyTree");
  if (!ul) return;
  const employees = loadEmployees();
  const managers = employees.filter((e) => e.position === "Manager");
  ul.innerHTML = managers
    .map((m) => {
      const subs = employees
        .filter((e) => e.manager_id === m.id)
        .map((s) => `<li>${s.name}</li>`) // simplistic
        .join("");
      return `<li>${m.name}<ul>${subs}</ul></li>`;
    })
    .join("");

  renderRoleList();
  populateRoleSelect();
}

function renderRoleList() {
  const list = document.getElementById("roleList");
  if (!list) return;
  const roles = loadHierarchy();
  list.innerHTML = roles
    .map((r, i) => {
      const badge =
        i === roles.length - 1
          ? '<span class="badge bg-success ms-2">Highest</span>'
          : "";
      return `\
<li class="list-group-item d-flex justify-content-between align-items-center" data-index="${i}">\
  <span>${r}${badge}</span>\
  <span>\
    <button class="btn btn-sm btn-outline-secondary me-1 move-up">&uarr;</button>\
    <button class="btn btn-sm btn-outline-secondary me-1 move-down">&darr;</button>\
    <button class="btn btn-sm btn-outline-danger delete-role">&times;</button>\
  </span>\
</li>`;
    })
    .join("");
  list.querySelectorAll(".move-up").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li");
      const idx = parseInt(li.dataset.index, 10);
      if (idx > 0) {
        const roles = loadHierarchy();
        [roles[idx - 1], roles[idx]] = [roles[idx], roles[idx - 1]];
        saveHierarchy(roles);
        renderRoleList();
        populateRoleSelect();
        renderPermissionsTable();
      }
    });
  });
  list.querySelectorAll(".move-down").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li");
      const idx = parseInt(li.dataset.index, 10);
      const roles = loadHierarchy();
      if (idx < roles.length - 1) {
        [roles[idx + 1], roles[idx]] = [roles[idx], roles[idx + 1]];
        saveHierarchy(roles);
        renderRoleList();
        populateRoleSelect();
        renderPermissionsTable();
      }
    });
  });
  list.querySelectorAll(".delete-role").forEach((btn) => {
    btn.addEventListener("click", () => {
      const li = btn.closest("li");
      const idx = parseInt(li.dataset.index, 10);
      const roles = loadHierarchy();
      const removed = roles.splice(idx, 1)[0];
      saveHierarchy(roles);
      const perms = loadPermissions();
      delete perms[removed];
      savePermissions(perms);
      renderRoleList();
      populateRoleSelect();
      renderPermissionsTable();
    });
  });
}

function populateRoleSelect() {
  const sel = document.getElementById("roleSelect");
  if (!sel) return;
  const roles = loadHierarchy();
  sel.innerHTML = roles
    .map((r) => `<option value="${r}">${r}</option>`)
    .join("");
}

function setupAddRoleForm() {
  const form = document.getElementById("addRoleForm");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.elements.role.value.trim();
    if (!name) return;
    const roles = loadHierarchy();
    if (!roles.includes(name)) {
      roles.push(name);
      saveHierarchy(roles);
      const perms = loadPermissions();
      perms[name] = [];
      savePermissions(perms);
      renderRoleList();
      populateRoleSelect();
      renderPermissionsTable();
    }
    form.reset();
  });
}

function renderPermissionsTable() {
  const tbl = document.getElementById("permissionsTable");
  if (!tbl) return;
  const roles = loadHierarchy();
  const perms = loadPermissions();
  const rows = roles
    .map((r) => {
      const allowed = new Set(perms[r] || []);
      const cells = ALL_MODULES.map(
        (m) =>
          `<td><input type="checkbox" data-role="${r}" data-mod="${m}" ${
            allowed.has(m) ? "checked" : ""
          }></td>`,
      ).join("");
      return `<tr><th>${r}</th>${cells}</tr>`;
    })
    .join("");
  tbl.querySelector("tbody").innerHTML = rows;
  tbl.querySelectorAll("input[type=checkbox]").forEach((cb) => {
    cb.addEventListener("change", () => {
      const role = cb.dataset.role;
      const mod = cb.dataset.mod;
      const perms = loadPermissions();
      const arr = perms[role] || [];
      if (cb.checked) {
        if (!arr.includes(mod)) arr.push(mod);
      } else {
        const i = arr.indexOf(mod);
        if (i >= 0) arr.splice(i, 1);
      }
      perms[role] = arr;
      savePermissions(perms);
    });
  });
}

function initWithPrefetch() {
  // Preload the schedule bundle so it's cached before the tab is opened
  loadScheduleScript().catch(() => {});
  initEmployeesTabs();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initWithPrefetch);
} else {
  initWithPrefetch();
}


