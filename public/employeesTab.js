function initEmployeesTabs() {
  const tabs = document.getElementById("employeesTabs");
  const panes = document.querySelectorAll(".employees-pane");
  const STORAGE_KEY = "activeEmployeesPane";

  function activate(id) {
    tabs.querySelectorAll(".nav-link").forEach((l) => {
      l.classList.toggle("active", l.dataset.pane === id);
    });
    panes.forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
    if (id) localStorage.setItem(STORAGE_KEY, id);
  }

  if (tabs) {
    tabs.addEventListener("click", (e) => {
      const link = e.target.closest(".nav-link");
      if (!link) return;
      e.preventDefault();
      activate(link.dataset.pane);
    });
  }

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && document.getElementById(saved)) {
    activate(saved);
  }

  setupOnboardingForm();
  renderEmployeeList();
  renderSchedule();
  setupScheduleViewToggle();
  setupWeekNav();
}

const EMPLOYEE_KEY = "employees";
const SCHEDULE_KEY = "schedule";
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 9am-18pm

function formatHour(h) {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return d.toLocaleString([], { hour: "numeric", hour12: true });
}
const SCHEDULE_VIEW_KEY = "scheduleView";
const SCHEDULE_WEEK_OFFSET_KEY = "scheduleWeekOffset";
let scheduleView = localStorage.getItem(SCHEDULE_VIEW_KEY) || "week";
let scheduleWeekOffset =
  parseInt(localStorage.getItem(SCHEDULE_WEEK_OFFSET_KEY), 10) || 0;

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
    const raw = JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || {};
    // migrate old format (no week key)
    const isOldFormat = Object.keys(raw).some((k) => /^\d$/.test(k));
    if (isOldFormat) {
      const key = currentWeekKey();
      const obj = { [key]: raw };
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(obj));
      return obj;
    }
    return raw;
  } catch {
    return {};
  }
}

function saveAllSchedules(obj) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(obj));
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
    const arr = JSON.parse(localStorage.getItem(EMPLOYEE_KEY)) || [];
    arr.forEach((e) => {
      if (!e.color) e.color = randomColor();
    });
    return arr;
  } catch {
    return [];
  }
}

function saveEmployees(arr) {
  localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(arr));
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
      HOURS.forEach((h) => {
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
      });
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
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get("name") || "").trim();
    if (!name) return;
    const employee = {
      id: Date.now().toString(),
      name,
      position: data.get("position") || "",
      start_date: data.get("start_date") || "",
      color: randomColor(),
    };
    const employees = loadEmployees();
    employees.push(employee);
    saveEmployees(employees);
    form.reset();
    renderEmployeeList();
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

function buildWeekTable(label) {
  const table = document.createElement("table");
  table.className = "table table-bordered schedule-table";
  const thead = document.createElement("thead");
  thead.innerHTML =
    "<tr><th>Time</th><th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th></tr>";
  const tbody = document.createElement("tbody");
  HOURS.forEach((h) => {
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
        localStorage.setItem(SCHEDULE_WEEK_OFFSET_KEY, scheduleWeekOffset);
        scheduleView = "week";
        localStorage.setItem(SCHEDULE_VIEW_KEY, scheduleView);
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
    localStorage.setItem(SCHEDULE_VIEW_KEY, scheduleView);
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
    localStorage.setItem(SCHEDULE_WEEK_OFFSET_KEY, scheduleWeekOffset);
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

function populateTimeSelect(select) {
  select.innerHTML = HOURS.map(
    (h) => `<option value="${h}">${formatHour(h)}</option>`,
  ).join("");
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEmployeesTabs);
} else {
  initEmployeesTabs();
}
