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
      renderSchedule();
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

  Promise.all([
    syncEmployeesFromServer(),
    syncScheduleFromServer(),
    syncHierarchyFromServer(),
    syncPermissionsFromServer(),
    syncModulesFromServer(),
    syncTimeFromServer(),
  ])
    .then(() => {
      renderEmployeeList();
      renderOnboardingTable();
      renderSchedule();
      renderHierarchy();
      renderPermissionsTable();
      renderTimeTable();
    })
    .catch(() => {});

  setupOnboardingForm();
  renderEmployeeList();
  renderOnboardingTable();
  renderSchedule();
  setupScheduleViewToggle();
  setupWeekNav();
  setupHourRangeControls();
  setupAddRoleForm();
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
const SCHEDULE_KEY = "schedule";
const HOURS_START_KEY = "scheduleStartHour";
const HOURS_END_KEY = "scheduleEndHour";
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
  try {
    const res = await fetch("/api/modules");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.modules)) {
      ALL_MODULES = data.modules;
    }
  } catch {
    /* ignore */
  }
}

async function syncEmployeesFromServer() {
  try {
    const res = await fetch("/api/employees");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.employees)) {
      storage.set(EMPLOYEE_KEY, JSON.stringify(data.employees));
    }
  } catch {
    /* ignore */
  }
}

async function syncScheduleFromServer() {
  try {
    const res = await fetch("/api/schedule");
    if (!res.ok) return;
    const data = await res.json();
    if (data.schedule) {
      storage.set(SCHEDULE_KEY, JSON.stringify(data.schedule));
    }
  } catch {
    /* ignore */
  }
}

async function syncHierarchyFromServer() {
  try {
    const res = await fetch("/api/hierarchy");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.hierarchy)) {
      storage.set(HIERARCHY_KEY, JSON.stringify(data.hierarchy));
    }
  } catch {
    /* ignore */
  }
}

async function syncPermissionsFromServer() {
  try {
    const res = await fetch("/api/permissions");
    if (!res.ok) return;
    const data = await res.json();
    if (data.permissions && typeof data.permissions === "object") {
      storage.set(PERMISSIONS_KEY, JSON.stringify(data.permissions));
    }
  } catch {
    /* ignore */
  }
}

async function syncTimeFromServer() {
  try {
    const res = await fetch("/api/time-clock");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.records)) {
      storage.set(TIME_KEY, JSON.stringify(data.records));
    }
  } catch {
    /* ignore */
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
    .map((r) => `<tr><td>${r.name}</td><td>${r.clock_in}</td><td>${r.clock_out || ''}</td></tr>`)
    .join("");
}
let hoursStart = parseInt(storage.get(HOURS_START_KEY), 10);
let hoursEnd = parseInt(storage.get(HOURS_END_KEY), 10);
if (isNaN(hoursStart)) hoursStart = 9;
if (isNaN(hoursEnd)) hoursEnd = 18;
function getHours() {
  return Array.from({ length: hoursEnd - hoursStart + 1 }, (_, i) => hoursStart + i);
}

function formatHour(h) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleString([], { hour: "numeric", hour12: true });
}
const SCHEDULE_VIEW_KEY = "scheduleView";
const SCHEDULE_WEEK_OFFSET_KEY = "scheduleWeekOffset";
let scheduleView = storage.get(SCHEDULE_VIEW_KEY) || "week";
let scheduleWeekOffset =
  parseInt(storage.get(SCHEDULE_WEEK_OFFSET_KEY), 10) || 0;

function updateScheduleToggleBtn() {
  const btn = document.getElementById("toggleScheduleView");
  if (btn) {
    btn.textContent = scheduleView === "week" ? "Monthly View" : "Weekly View";
  }
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - ((day + 6) % 7); // monday as start
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(base, offset) {
  const start = new Date(base);
  start.setDate(start.getDate() + offset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const opts = { month: "short", day: "numeric" };
  return (
    start.toLocaleDateString(undefined, opts) +
    " - " +
    end.toLocaleDateString(undefined, opts)
  );
}

function weekKey(date) {
  return date.toISOString().split("T")[0];
}

function currentWeekKey() {
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + scheduleWeekOffset * 7);
  return weekKey(base);
}

function loadAllSchedules() {
  try {
    const raw = JSON.parse(storage.get(SCHEDULE_KEY)) || {};
    // migrate old format (no week key)
    const isOldFormat = Object.keys(raw).some((k) => /^\d$/.test(k));
    if (isOldFormat) {
      const key = currentWeekKey();
      const obj = { [key]: raw };
      storage.set(SCHEDULE_KEY, JSON.stringify(obj));
      return obj;
    }
    return raw;
  } catch {
    return {};
  }
}

function saveAllSchedules(obj) {
  storage.set(SCHEDULE_KEY, JSON.stringify(obj));
  fetch("/api/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schedule: obj }),
  }).catch(() => {});
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
    arr.forEach((e) => {
      if (!e.color) e.color = randomColor();
    });
    return arr;
  } catch {
    return [];
  }
}

function saveEmployees(arr) {
  storage.set(EMPLOYEE_KEY, JSON.stringify(arr));
  fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employees: arr }),
  }).catch(() => {});
}

function loadHierarchy() {
  try {
    return JSON.parse(storage.get(HIERARCHY_KEY)) || ["FOH", "BOH", "management"];
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

function loadScheduleForOffset(offset) {
  try {
    const all = loadAllSchedules();
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + offset * 7);
    const key = weekKey(base);
    const week = all[key] || {};
    Object.keys(week).forEach((day) => {
      if (Array.isArray(week[day])) return;
      const obj = week[day] || {};
      const arr = [];
      let current = null;
      for (let h = 0; h < 24; h++) {
        const eid = obj[h];
        if (eid) {
          if (current && current.id === eid) {
            current.end = h + 1;
          } else {
            current = { id: eid, start: h, end: h + 1 };
            arr.push(current);
          }
        } else {
          current = null;
        }
      }
      week[day] = arr;
    });
    return week;
  } catch {
    return {};
  }
}

function loadSchedule() {
  return loadScheduleForOffset(scheduleWeekOffset);
}

function saveSchedule(obj, offset = scheduleWeekOffset) {
  const all = loadAllSchedules();
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + offset * 7);
  const key = weekKey(base);
  all[key] = obj;
  saveAllSchedules(all);
}

function findRange(day, hour, offset = scheduleWeekOffset) {
  const schedule = loadScheduleForOffset(offset);
  const ranges = schedule[day] || [];
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (hour >= r.start && hour < r.end) {
      return { range: r, index: i };
    }
  }
  return null;
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
    const name = (data.get("name") || "").trim();
    if (!name) return;
    const index = idxField.value ? parseInt(idxField.value, 10) : -1;
    const employees = loadEmployees();
    const base =
      index >= 0 && index < employees.length ? employees[index] : null;
    const employee = {
      id: base ? base.id : Date.now().toString(),
      name,
      position: data.get("position") || "",
      start_date: data.get("start_date") || "",
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
    saveEmployees(employees);
    resetForm();
    renderEmployeeList();
    renderOnboardingTable();
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
  list.querySelectorAll(".list-group-item").forEach((item) => {
    item.addEventListener("click", () => showScheduleModal(item.dataset.id));
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
        `<tr data-index="${i}"><td>${e.name}</td><td>${e.position}</td><td>${e.start_date}</td><td>${e.username}</td><td>${e.role}</td><td><button class="btn btn-sm btn-outline-primary edit-emp" data-index="${i}">Edit</button></td></tr>`,
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
  form.elements.name.value = emp.name || "";
  form.elements.position.value = emp.position || "";
  form.elements.start_date.value = emp.start_date || "";
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

function buildWeekTable(label) {
  const table = document.createElement("table");
  table.className = "table table-bordered schedule-table";
  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr>";
  const tbody = document.createElement("tbody");
  getHours().forEach((h) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = formatHour(h);
    tr.appendChild(th);
    for (let d = 0; d < 7; d++) {
      const td = document.createElement("td");
      td.dataset.day = d;
      td.dataset.hour = h;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(thead);
  table.appendChild(tbody);
  if (label) {
    const cap = document.createElement("caption");
    cap.textContent = label;
    cap.className = "fw-bold";
    table.prepend(cap);
  }
  return table;
}

function fillWeekTable(table, schedule, employees) {
  table.querySelectorAll("td").forEach((td) => {
    td.textContent = "";
    td.style.backgroundColor = "";
  });
  Object.keys(schedule).forEach((day) => {
    const ranges = schedule[day];
    if (!Array.isArray(ranges)) return;
    ranges.forEach((r) => {
      const emp = employees.find((e) => e.id === r.id);
      for (let h = r.start; h < r.end; h++) {
        const cell = table.querySelector(
          `td[data-day="${day}"][data-hour="${h}"]`,
        );
        if (!cell) continue;
        if (h === r.start) {
          cell.textContent = emp ? `${emp.name} (${emp.position})` : "";
        }
        if (emp && emp.color) cell.style.backgroundColor = emp.color;
      }
    });
  });
}

function renderSchedule() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
  grid.innerHTML = "";
  grid.classList.toggle("month-view", scheduleView === "month");
  const employees = loadEmployees();
  const base = startOfWeek(new Date());
  if (scheduleView === "week") {
    const schedule = loadSchedule();
    const label = weekLabel(base, scheduleWeekOffset);
    const table = buildWeekTable(label);
    grid.appendChild(table);
    fillWeekTable(table, schedule, employees);
  } else {
    for (let w = 0; w < 4; w++) {
      const label = weekLabel(base, w);
      const table = buildWeekTable(label);
      table.dataset.weekIndex = w;
      table.addEventListener("click", () => {
        scheduleWeekOffset = w;
        storage.set(SCHEDULE_WEEK_OFFSET_KEY, scheduleWeekOffset);
        scheduleView = "week";
        storage.set(SCHEDULE_VIEW_KEY, scheduleView);
        renderSchedule();
        updateScheduleToggleBtn();
      });
      grid.appendChild(table);
      const weekSchedule = loadScheduleForOffset(w);
      fillWeekTable(table, weekSchedule, employees);
    }
  }
  enableScheduleDnD();
  enableScheduleEditing();
}

function enableScheduleDnD() {
  const cells = document.querySelectorAll(".schedule-table td");
  cells.forEach((cell) => {
    cell.addEventListener("dragover", (e) => e.preventDefault());
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const day = parseInt(cell.dataset.day, 10);
      const start = parseInt(cell.dataset.hour, 10);
      showScheduleModal(id, { day, range: { start, end: start + 1 } });
    });
  });
}

function enableScheduleEditing() {
  const cells = document.querySelectorAll(".schedule-table td");
  cells.forEach((cell) => {
    cell.addEventListener("click", () => {
      const day = parseInt(cell.dataset.day, 10);
      const hour = parseInt(cell.dataset.hour, 10);
      const info = findRange(day, hour);
      if (info) {
        showScheduleModal(info.range.id, {
          day,
          index: info.index,
          range: info.range,
        });
      }
    });
  });
}

function setupScheduleViewToggle() {
  const btn = document.getElementById("toggleScheduleView");
  if (!btn) return;
  btn.addEventListener("click", () => {
    scheduleView = scheduleView === "week" ? "month" : "week";
    storage.set(SCHEDULE_VIEW_KEY, scheduleView);
    renderSchedule();
    updateScheduleToggleBtn();
  });
  updateScheduleToggleBtn();
}

function updateWeekLabel() {
  const span = document.getElementById("currentWeekLabel");
  if (!span) return;
  const base = startOfWeek(new Date());
  span.textContent = weekLabel(base, scheduleWeekOffset);
}

function setupWeekNav() {
  const prev = document.getElementById("prevWeek");
  const next = document.getElementById("nextWeek");
  function changeWeek(delta) {
    scheduleWeekOffset += delta;
    storage.set(SCHEDULE_WEEK_OFFSET_KEY, scheduleWeekOffset);
    renderSchedule();
    updateWeekLabel();
  }
  if (prev) prev.addEventListener("click", () => changeWeek(-1));
  if (next) next.addEventListener("click", () => changeWeek(1));
  setupSwipeNav(changeWeek);
  updateWeekLabel();
}

function setupSwipeNav(changeWeek) {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
  let startX = null;
  grid.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });
  grid.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) {
      changeWeek(diff > 0 ? -1 : 1);
    }
    startX = null;
  });
}

function setupHourRangeControls() {
  const startSel = document.getElementById("scheduleStartHour");
  const endSel = document.getElementById("scheduleEndHour");
  if (!startSel || !endSel) return;
  const opts = Array.from({ length: 24 }, (_, i) =>
    `<option value="${i}">${formatHour(i)}</option>`,
  ).join("");
  startSel.innerHTML = opts;
  endSel.innerHTML = opts;
  startSel.value = hoursStart;
  endSel.value = hoursEnd;
  function apply() {
    const start = parseInt(startSel.value, 10);
    const end = parseInt(endSel.value, 10);
    if (end <= start) return;
    hoursStart = start;
    hoursEnd = end;
    storage.set(HOURS_START_KEY, hoursStart);
    storage.set(HOURS_END_KEY, hoursEnd);
    renderSchedule();
  }
  startSel.addEventListener("change", apply);
  endSel.addEventListener("change", apply);
}

function populateTimeSelect(select) {
  select.innerHTML = getHours()
    .map((h) => `<option value="${h}">${formatHour(h)}</option>`)
    .join("");
}

function showScheduleModal(empId, opts = {}) {
  const modal = document.getElementById("scheduleModal");
  const form = document.getElementById("scheduleForm");
  const closeBtn = document.getElementById("scheduleModalClose");
  if (!modal || !form) return;
  populateTimeSelect(form.elements.start);
  populateTimeSelect(form.elements.end);
  const { day, range, index } = opts;
  const editing = typeof index === "number";
  form.elements.employeeId.value = empId;
  if (editing) {
    form.elements.day.value = day;
    form.elements.start.value = range.start;
    form.elements.end.value = range.end;
  } else {
    form.reset();
    form.elements.employeeId.value = empId;
    if (day != null) form.elements.day.value = day;
    if (range) {
      form.elements.start.value = range.start;
      form.elements.end.value = range.end;
    }
  }
  modal.classList.remove("d-none");
  modal.classList.add("d-block");
  let deleteBtn;
  function close() {
    modal.classList.add("d-none");
    modal.classList.remove("d-block");
    form.removeEventListener("submit", onSubmit);
    closeBtn.removeEventListener("click", close);
    if (deleteBtn) {
      deleteBtn.removeEventListener("click", onDelete);
      deleteBtn.remove();
    }
  }
  function onSubmit(e) {
    e.preventDefault();
    const data = new FormData(form);
    const day = parseInt(data.get("day"), 10);
    const start = parseInt(data.get("start"), 10);
    const end = parseInt(data.get("end"), 10);
    if (end <= start) return;
    const id = data.get("employeeId");
    const schedule = loadSchedule();
    if (!schedule[day]) schedule[day] = [];
    if (editing) {
      schedule[opts.day][opts.index] = { id, start, end };
    } else {
      schedule[day].push({ id, start, end });
    }
    saveSchedule(schedule);
    renderSchedule();
    close();
  }
  function onDelete() {
    const schedule = loadSchedule();
    schedule[opts.day].splice(opts.index, 1);
    saveSchedule(schedule);
    renderSchedule();
    close();
  }
  form.addEventListener("submit", onSubmit);
  closeBtn.addEventListener("click", close);
  if (editing) {
    deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-sm me-2";
    deleteBtn.textContent = "Delete";
    form.prepend(deleteBtn);
    deleteBtn.addEventListener("click", onDelete);
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEmployeesTabs);
} else {
  initEmployeesTabs();
}
