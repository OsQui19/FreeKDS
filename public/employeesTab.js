function initEmployeesTabs() {
  const links = document.querySelectorAll("#employeesTabs .nav-link");
  function getPanes() {
    return document.querySelectorAll(".employees-pane");
  }
  const STORAGE_KEY = "activeEmployeesPane";

  function activate(id) {
    links.forEach((l) => {
      l.classList.toggle("active", l.dataset.pane === id);
    });
    getPanes().forEach((p) => {
      p.classList.toggle("active", p.id === id);
    });
    if (id) localStorage.setItem(STORAGE_KEY, id);
  }

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activate(link.dataset.pane);
    });
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && document.getElementById(saved)) {
    activate(saved);
  }

  setupOnboardingForm();
  renderEmployeeList();
  renderSchedule();
  enableScheduleDnD();
}

const EMPLOYEE_KEY = "employees";
const SCHEDULE_KEY = "schedule";
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 9am-18pm

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

function loadSchedule() {
  try {
    const raw = JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || {};
    // migrate old format (object of hours) to array of ranges
    Object.keys(raw).forEach((day) => {
      if (Array.isArray(raw[day])) return;
      const obj = raw[day] || {};
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
      raw[day] = arr;
    });
    return raw;
  } catch {
    return {};
  }
}

function saveSchedule(obj) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(obj));
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
        `<li class="list-group-item" draggable="true" data-id="${e.id}" style="border-left: 10px solid ${e.color}">${e.name}</li>`,
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

function renderSchedule() {
  const table = document.getElementById("scheduleTable");
  if (!table) return;
  const schedule = loadSchedule();
  const employees = loadEmployees();
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
        if (h === r.start) cell.textContent = emp ? emp.name : "";
        if (emp && emp.color) cell.style.backgroundColor = emp.color;
      }
    });
  });
}

function enableScheduleDnD() {
  const cells = document.querySelectorAll("#scheduleTable td");
  cells.forEach((cell) => {
    cell.addEventListener("dragover", (e) => e.preventDefault());
    cell.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (!id) return;
      const day = parseInt(cell.dataset.day, 10);
      const start = parseInt(cell.dataset.hour, 10);
      const end = parseInt(prompt("End hour", start + 1), 10);
      if (!end || end <= start) return;
      const schedule = loadSchedule();
      if (!schedule[day]) schedule[day] = [];
      schedule[day].push({ id, start, end });
      saveSchedule(schedule);
      renderSchedule();
    });
  });
}

function populateTimeSelect(select) {
  select.innerHTML = HOURS.map(
    (h) => `<option value="${h}">${h}:00</option>`,
  ).join("");
}

function showScheduleModal(empId) {
  const modal = document.getElementById("scheduleModal");
  const form = document.getElementById("scheduleForm");
  const closeBtn = document.getElementById("scheduleModalClose");
  if (!modal || !form) return;
  populateTimeSelect(form.elements.start);
  populateTimeSelect(form.elements.end);
  form.elements.employeeId.value = empId;
  modal.classList.remove("d-none");
  modal.classList.add("d-block");
  function close() {
    modal.classList.add("d-none");
    modal.classList.remove("d-block");
    form.removeEventListener("submit", onSubmit);
    closeBtn.removeEventListener("click", close);
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
    schedule[day].push({ id, start, end });
    saveSchedule(schedule);
    renderSchedule();
    close();
  }
  form.addEventListener("submit", onSubmit);
  closeBtn.addEventListener("click", close);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initEmployeesTabs);
} else {
  initEmployeesTabs();
}
