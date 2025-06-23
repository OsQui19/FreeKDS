function initEmployeesTabs() {
  const links = document.querySelectorAll('#employeesTabs .nav-link');
  const panes = document.querySelectorAll('.employees-pane');
  const STORAGE_KEY = 'activeEmployeesPane';

  function activate(id) {
    links.forEach((l) => {
      l.classList.toggle('active', l.dataset.pane === id);
    });
    panes.forEach((p) => {
      p.classList.toggle('active', p.id === id);
    });
    if (id) localStorage.setItem(STORAGE_KEY, id);
  }

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
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

const EMPLOYEE_KEY = 'employees';
const SCHEDULE_KEY = 'schedule';
const HOURS = Array.from({ length: 10 }, (_, i) => 9 + i); // 9am-18pm

function loadEmployees() {
  try {
    return JSON.parse(localStorage.getItem(EMPLOYEE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEmployees(arr) {
  localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(arr));
}

function loadSchedule() {
  try {
    return JSON.parse(localStorage.getItem(SCHEDULE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveSchedule(obj) {
  localStorage.setItem(SCHEDULE_KEY, JSON.stringify(obj));
}

function setupOnboardingForm() {
  const form = document.getElementById('employeeOnboardingForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').trim();
    if (!name) return;
    const employee = {
      id: Date.now().toString(),
      name,
      position: data.get('position') || '',
      start_date: data.get('start_date') || '',
    };
    const employees = loadEmployees();
    employees.push(employee);
    saveEmployees(employees);
    form.reset();
    renderEmployeeList();
  });
}

function renderEmployeeList() {
  const list = document.getElementById('employeeList');
  if (!list) return;
  const employees = loadEmployees();
  list.innerHTML = employees
    .map(
      (e) =>
        `<li class="list-group-item" draggable="true" data-id="${e.id}">${e.name}</li>`,
    )
    .join('');
  list.querySelectorAll('[draggable]').forEach((item) => {
    item.addEventListener('dragstart', (ev) => {
      ev.dataTransfer.setData('text/plain', item.dataset.id);
    });
  });
}

function renderSchedule() {
  const table = document.getElementById('scheduleTable');
  if (!table) return;
  const schedule = loadSchedule();
  table.querySelectorAll('td').forEach((td) => {
    const day = td.dataset.day;
    const hour = td.dataset.hour;
    const id = schedule[day]?.[hour];
    const emp = loadEmployees().find((e) => e.id === id);
    td.textContent = emp ? emp.name : '';
  });
}

function enableScheduleDnD() {
  const cells = document.querySelectorAll('#scheduleTable td');
  cells.forEach((cell) => {
    cell.addEventListener('dragover', (e) => e.preventDefault());
    cell.addEventListener('drop', (e) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      if (!id) return;
      const schedule = loadSchedule();
      const day = cell.dataset.day;
      const hour = cell.dataset.hour;
      if (!schedule[day]) schedule[day] = {};
      schedule[day][hour] = id;
      saveSchedule(schedule);
      renderSchedule();
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initEmployeesTabs);
} else {
  initEmployeesTabs();
}
