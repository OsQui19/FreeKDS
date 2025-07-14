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
let scheduleLoaded = false;

function onReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

function loadScheduleScript(attempts = 3, delay = 1000) {
  if (scheduleLoaded) return Promise.resolve();
  if (!schedulePromise) {
    schedulePromise = new Promise((resolve, reject) => {
      const attemptLoad = (n) => {
        const script = document.createElement("script");
        script.src = "/dist/schedule.js";
        script.type = "module";
        script.defer = true;
        script.onload = () => {
          scheduleLoaded = true;
          resolve();
        };
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
    if (id === "schedulePane" && !scheduleLoaded) {
      onReady(() => loadScheduleScript().catch(() => {}));
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

  const hide = window.showSpinner ? window.showSpinner() : () => {};

  await Promise.allSettled([
    retrySync(syncEmployeesFromServer, 5),
    retrySync(syncHierarchyFromServer, 5),
    retrySync(syncPermissionsFromServer, 5),
    retrySync(syncModulesFromServer, 5),
    retrySync(syncTimeFromServer, 5),
  ]);

  if (typeof hide === "function") hide();

  setupOnboardingForm();
  setupTimeEditModal();

  renderEmployeeList();
  const searchInput = document.getElementById("onboardingSearch");
  renderOnboardingTable(searchInput ? searchInput.value : "");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      renderOnboardingTable(searchInput.value);
    });
  }
  renderTimeTable();
  renderPayrollTable();
  const exportBtn = document.getElementById("exportPayroll");
  if (exportBtn) exportBtn.addEventListener("click", exportPayrollCSV);


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
      renderPayrollTable();
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
        `<tr data-id="${r.id}"><td>${r.name}</td><td>${r.clock_in}</td><td>${
          r.clock_out || ""
        }</td><td><button class="btn btn-sm btn-outline-primary edit-time" data-id="${
          r.id
        }">Edit</button></td></tr>`,
    )
    .join("");
  tbody.querySelectorAll(".edit-time").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      const rec = loadTime().find((r) => String(r.id) === String(id));
      if (rec) openTimeEdit(rec);
    });
  });
}

function openTimeEdit(rec) {
  const modal = document.getElementById("timeEditModal");
  const form = document.getElementById("timeEditForm");
  if (!modal || !form) return;
  form.elements.id.value = rec.id;
  form.elements.clock_in.value = (rec.clock_in || "").replace(" ", "T").slice(0, 16);
  form.elements.clock_out.value = rec.clock_out
    ? rec.clock_out.replace(" ", "T").slice(0, 16)
    : "";
  modal.classList.remove("d-none");
  modal.classList.add("d-flex");
}

function setupTimeEditModal() {
  const modal = document.getElementById("timeEditModal");
  const cancelBtn = document.getElementById("timeEditCancel");
  const form = document.getElementById("timeEditForm");
  if (!modal || !cancelBtn || !form) return;

  const close = () => {
    modal.classList.add("d-none");
    modal.classList.remove("d-flex");
  };

  cancelBtn.addEventListener("click", close);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const id = data.get("id");
    const clockIn = data.get("clock_in");
    const clockOut = data.get("clock_out");
    if (clockOut && clockOut <= clockIn) {
      alert("Clock out must be after clock in");
      return;
    }
    try {
      const res = await fetch(`/api/time-clock/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clock_in: clockIn, clock_out: clockOut || null }),
      });
      if (!res.ok) throw new Error("update");
      await syncTimeFromServer();
      renderTimeTable();
      renderPayrollTable();
      close();
    } catch {
      alert("Failed to update record");
    }
  });
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
        renderOnboardingTable(
          document.getElementById("onboardingSearch")?.value || "",
        );
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

function renderOnboardingTable(filter = "") {
  const tbl = document.getElementById("onboardingTable");
  if (!tbl) return;
  const tbody = tbl.querySelector("tbody");
  let employees = loadEmployees();
  if (filter) {
    const f = filter.toLowerCase();
    employees = employees.filter(
      (e) =>
        (e.first_name && e.first_name.toLowerCase().includes(f)) ||
        (e.last_name && e.last_name.toLowerCase().includes(f)) ||
        (e.position && e.position.toLowerCase().includes(f)) ||
        (e.role && e.role.toLowerCase().includes(f)),
    );
  }
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


function summarizeTime(records) {
  const map = {};
  records.forEach((r) => {
    if (!r.clock_in || !r.clock_out) return;
    const start = new Date(r.clock_in);
    const end = new Date(r.clock_out);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return;
    const monday = new Date(start);
    const day = (monday.getDay() + 6) % 7; // 0 = Monday
    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    const key = monday.toISOString().split("T")[0];
    if (!map[r.name]) map[r.name] = {};
    if (!map[r.name][key]) map[r.name][key] = 0;
    map[r.name][key] += (end - start) / 3600000;
  });
  const out = [];
  Object.keys(map).forEach((name) => {
    Object.keys(map[name]).forEach((period) => {
      out.push({ name, period, hours: map[name][period] });
    });
  });
  out.sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.period.localeCompare(b.period);
  });
  return out;
}

async function renderPayrollTable() {
  const tbl = document.getElementById("payrollTable");
  if (!tbl) return;
  const tbody = tbl.querySelector("tbody");
  let summary = null;
  const hide = window.showSpinner ? window.showSpinner() : () => {};
  try {
    const res = await fetch("/api/payroll");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.payroll)) {
        summary = data.payroll.map((r) => ({
          name: r.name,
          period: r.period_start,
          hours: parseFloat(r.hours),
        }));
      }
    }
  } catch {
    /* ignore */
  } finally {
    if (typeof hide === "function") hide();
  }
  if (!summary) summary = summarizeTime(loadTime());
  tbody.innerHTML = summary
    .map(
      (s) =>
        `<tr><td>${s.name}</td><td>${s.period}</td><td>${s.hours.toFixed(2)}</td></tr>`,
    )
    .join("");
}

function exportPayrollCSV() {
  const summary = summarizeTime(loadTime());
  let csv = "Employee,Period Start,Hours\n";
  csv += summary
    .map((s) => `${s.name},${s.period},${s.hours.toFixed(2)}`)
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "payroll.csv";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function initEmployeesModule() {
  return initEmployeesTabs();
}

let employeesInitialized = false;
async function startEmployeesTab() {
  if (!employeesInitialized) {
    try {
      await initEmployeesModule();
      employeesInitialized = true;
    } catch (err) {
      console.error("Employees initialization failed", err);
      employeesInitialized = false;
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startEmployeesTab);
} else {
  startEmployeesTab();
}

document.addEventListener("adminTabShown", (e) => {
  if (e.detail === "employees") startEmployeesTab();
});

// Reinitialize when returning via bfcache
window.addEventListener("pageshow", () => {
  if (document.visibilityState === "visible") {
    startEmployeesTab();
  }
});


