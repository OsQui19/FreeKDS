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
  if (!window.FullCalendar) {
    const scripts = [
      "/vendor/fullcalendar/core.min.js",
      "/vendor/fullcalendar/daygrid.min.js",
      "/vendor/fullcalendar/timegrid.min.js",
      "/vendor/fullcalendar/interaction.min.js",
    ];
    for (const src of scripts) {
      await new Promise((resolve) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = resolve;
        document.head.appendChild(s);
      });
    }
    if (!window.FullCalendar) {
      console.error("FullCalendar failed to load");
    }
  }
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
      tryRenderSchedule();
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
    retrySync(syncScheduleFromServer, 5),
    retrySync(syncHierarchyFromServer, 5),
    retrySync(syncPermissionsFromServer, 5),
    retrySync(syncModulesFromServer, 5),
    retrySync(syncTimeFromServer, 5),
  ]);

  setupOnboardingForm();
  setupScheduleViewToggle();
  setupWeekNav();
  setupHourRangeControls();
  setupUndoButton();
  setupAddRoleForm();

  renderEmployeeList();
  renderOnboardingTable();
  tryRenderSchedule();
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
    const merged = data.employees.map((e) => ({
      ...e,
      color: colorMap[e.id] || e.color || randomColor(),
    }));
    storage.set(EMPLOYEE_KEY, JSON.stringify(merged));
  } else {
    throw new Error("employees");
  }
}

async function syncScheduleFromServer() {
  const res = await fetch("/api/schedule");
  if (!res.ok) throw new Error("schedule");
  const data = await res.json();
  if (data.schedule) {
    storage.set(SCHEDULE_KEY, JSON.stringify(data.schedule));
  } else {
    throw new Error("schedule");
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
let hoursStart = parseInt(storage.get(HOURS_START_KEY), 10);
let hoursEnd = parseInt(storage.get(HOURS_END_KEY), 10);
if (isNaN(hoursStart)) hoursStart = 9;
if (isNaN(hoursEnd)) hoursEnd = 18;
function getHours() {
  return Array.from(
    { length: hoursEnd - hoursStart + 1 },
    (_, i) => hoursStart + i,
  );
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
let calendar;
let copiedEvent = null;
let selectedEvent = null;
let pasteNext = false;
let undoScheduleData = null;

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
  fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employees: arr }),
  }).catch(() => {});
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

function dayIndex(date) {
  return (date.getDay() + 6) % 7; // monday = 0
}

function buildCalendarEvents() {
  const schedule = loadSchedule();
  const employees = loadEmployees();
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + scheduleWeekOffset * 7);
  const events = [];
  Object.keys(schedule).forEach((day) => {
    const ranges = schedule[day] || [];
    ranges.forEach((r) => {
      const start = new Date(base);
      start.setDate(start.getDate() + parseInt(day, 10));
      start.setHours(r.start, 0, 0, 0);
      const end = new Date(base);
      end.setDate(end.getDate() + parseInt(day, 10));
      end.setHours(r.end, 0, 0, 0);
      const emp = employees.find((e) => e.id === r.id) || {};
      const timeLabel = `${formatHour(r.start)}-${formatHour(r.end)}`;
      events.push({
        title: emp.name
          ? `${timeLabel} ${emp.name} (${emp.position})`
          : timeLabel,
        start,
        end,
        backgroundColor: emp.color,
        extendedProps: { employeeId: r.id, color: emp.color },
      });
    });
  });
  return events;
}

function scheduleFromCalendar() {
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + scheduleWeekOffset * 7);
  const out = {};
  calendar.getEvents().forEach((ev) => {
    const d = dayIndex(ev.start);
    if (!out[d]) out[d] = [];
    out[d].push({
      id: ev.extendedProps.employeeId,
      start: ev.start.getHours(),
      end: ev.end.getHours(),
    });
  });
  return out;
}

function detectConflicts() {
  if (!calendar) return;
  const events = calendar.getEvents();
  const grouped = {};
  events.forEach((e) => {
    const id = e.extendedProps.employeeId;
    if (!grouped[id]) grouped[id] = [];
    grouped[id].push(e);
  });
  const conflicts = new Set();
  Object.values(grouped).forEach((arr) => {
    arr.sort((a, b) => a.start - b.start);
    for (let i = 1; i < arr.length; i++) {
      if (arr[i].start < arr[i - 1].end) {
        conflicts.add(arr[i]);
        conflicts.add(arr[i - 1]);
      }
    }
  });
  events.forEach((e) => {
    if (conflicts.has(e)) e.setProp("classNames", ["conflict"]);
    else e.setProp("classNames", []);
    e.setProp("backgroundColor", e.extendedProps.color || "");
  });
}

function onEventChange() {
  undoScheduleData = loadSchedule();
  const sched = scheduleFromCalendar();
  saveSchedule(sched);
  detectConflicts();
  const btn = document.getElementById("undoSchedule");
  if (btn) btn.disabled = false;
}

function initCalendar() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
  if (!window.FullCalendar) {
    grid.innerHTML =
      '<div class="alert alert-danger">Calendar library not loaded</div>';
    return;
  }
  const base = startOfWeek(new Date());
  base.setDate(base.getDate() + scheduleWeekOffset * 7);
  calendar = new FullCalendar.Calendar(grid, {
    headerToolbar: false,
    firstDay: 1,
    initialView: scheduleView === "week" ? "timeGridWeek" : "dayGridMonth",
    initialDate: base,
    allDaySlot: false,
    slotDuration: "01:00:00",
    snapDuration: "01:00:00",
    editable: true,
    selectable: true,
    droppable: true,
    displayEventTime: true,
    eventTimeFormat: { hour: "numeric", minute: "2-digit", meridiem: true },
    slotMinTime: `${hoursStart}:00:00`,
    slotMaxTime: `${hoursEnd}:00:00`,
    events: buildCalendarEvents(),
    eventAdd: onEventChange,
    eventChange: onEventChange,
    eventRemove: onEventChange,
    eventReceive: onEventChange,
    dateClick(info) {
      if (pasteNext && copiedEvent) {
        const start = info.date;
        const end = new Date(start.getTime() + copiedEvent.duration);
        calendar.addEvent({
          title: copiedEvent.title,
          start,
          end,
          backgroundColor: copiedEvent.color,
          extendedProps: {
            employeeId: copiedEvent.employeeId,
            color: copiedEvent.color,
          },
        });
        pasteNext = false;
        onEventChange();
      } else if (info.jsEvent.detail >= 2) {
        showScheduleModal(null, {
          day: dayIndex(info.date),
          range: {
            start: info.date.getHours(),
            end: info.date.getHours() + 1,
          },
          x: info.jsEvent.clientX,
          y: info.jsEvent.clientY,
        });
      }
    },
    eventClick(info) {
      selectedEvent = info.event;
      if (info.jsEvent.ctrlKey || info.jsEvent.metaKey) {
        copiedEvent = {
          employeeId: info.event.extendedProps.employeeId,
          duration: info.event.end - info.event.start,
          title: info.event.title,
          color: info.event.extendedProps.color,
        };
      } else if (info.jsEvent.detail >= 2) {
        const d = dayIndex(info.event.start);
        const found = findRange(d, info.event.start.getHours());
        showScheduleModal(info.event.extendedProps.employeeId, {
          day: d,
          range: {
            start: info.event.start.getHours(),
            end: info.event.end.getHours(),
          },
          index: found ? found.index : undefined,
          x: info.jsEvent.clientX,
          y: info.jsEvent.clientY,
        });
      }
    },
  });

  const list = document.getElementById("employeeList");
  if (list && FullCalendar.Draggable) {
    new FullCalendar.Draggable(list, {
      itemSelector: ".list-group-item",
      eventData(el) {
        const id = el.dataset.id;
        const employees = loadEmployees();
        const emp = employees.find((e) => e.id === id) || {};
        return {
          title: `${emp.name} (${emp.position})`,
          duration: { hours: 1 },
          backgroundColor: emp.color,
          extendedProps: { employeeId: id, color: emp.color },
        };
      },
    });
  }

  calendar.render();
  detectConflicts();
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
    item.addEventListener("click", (e) =>
      showScheduleModal(item.dataset.id, { x: e.clientX, y: e.clientY })
    );
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

// Weekly schedule is now rendered using FullCalendar instead of manual tables

function renderSchedule() {
  const grid = document.getElementById("scheduleGrid");
  if (!grid) return;
  if (calendar) {
    calendar.destroy();
  }
  grid.innerHTML = "";
  initCalendar();
  if (calendar) {
    calendar.updateSize();
  }
}

function tryRenderSchedule() {
  try {
    renderSchedule();
  } catch (err) {
    console.error("Schedule render failed", err);
  }
}

function setupScheduleViewToggle() {
  const btn = document.getElementById("toggleScheduleView");
  if (!btn) return;
  btn.addEventListener("click", () => {
    scheduleView = scheduleView === "week" ? "month" : "week";
    storage.set(SCHEDULE_VIEW_KEY, scheduleView);
    tryRenderSchedule();
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
    tryRenderSchedule();
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
  const opts = Array.from(
    { length: 24 },
    (_, i) => `<option value="${i}">${formatHour(i)}</option>`,
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
    tryRenderSchedule();
  }
  startSel.addEventListener("change", apply);
  endSel.addEventListener("change", apply);
}

function setupUndoButton() {
  const btn = document.getElementById("undoSchedule");
  if (!btn) return;
  btn.addEventListener("click", () => {
    if (undoScheduleData) {
      saveSchedule(undoScheduleData);
      undoScheduleData = null;
      tryRenderSchedule();
      btn.disabled = true;
    }
  });
  btn.disabled = true;
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
  const { day, range, index, x, y } = opts;
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
  const content = modal.querySelector(".modal-content");
  if (content && x != null && y != null) {
    modal.style.alignItems = "flex-start";
    modal.style.justifyContent = "flex-start";
    content.style.position = "absolute";
    content.style.left = `${x}px`;
    content.style.top = `${y}px`;
  }
  modal.classList.remove("d-none");
  modal.classList.add("d-block");
  let deleteBtn;
  function close() {
    modal.classList.add("d-none");
    modal.classList.remove("d-block");
    if (content) {
      content.style.left = "";
      content.style.top = "";
      content.style.position = "";
    }
    modal.style.alignItems = "";
    modal.style.justifyContent = "";
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
    undoScheduleData = JSON.parse(JSON.stringify(schedule));
    if (!schedule[day]) schedule[day] = [];
    if (editing) {
      schedule[opts.day][opts.index] = { id, start, end };
    } else {
      schedule[day].push({ id, start, end });
    }
    saveSchedule(schedule);
    tryRenderSchedule();
    const btn = document.getElementById("undoSchedule");
    if (btn) btn.disabled = false;
    close();
  }
  function onDelete() {
    const schedule = loadSchedule();
    undoScheduleData = JSON.parse(JSON.stringify(schedule));
    schedule[opts.day].splice(opts.index, 1);
    saveSchedule(schedule);
    tryRenderSchedule();
    const btn = document.getElementById("undoSchedule");
    if (btn) btn.disabled = false;
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

document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
    if (selectedEvent) {
      copiedEvent = {
        employeeId: selectedEvent.extendedProps.employeeId,
        duration: selectedEvent.end - selectedEvent.start,
        title: selectedEvent.title,
        color: selectedEvent.extendedProps.color,
      };
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
    if (copiedEvent) pasteNext = true;
  }
});

window.addEventListener("resize", () => {
  if (calendar) {
    calendar.updateSize();
  }
});
