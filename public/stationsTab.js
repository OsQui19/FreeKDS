let stationsTabInitialized = false;

function initStationsTab() {
  if (stationsTabInitialized) return;
  stationsTabInitialized = true;

  document.querySelectorAll('[id^="station-"]').forEach((sec) => {
    const btn = document.querySelector(`button[data-bs-target="#${sec.id}"]`);
    if (!btn) return;
    const updateText = () => {
      btn.textContent = sec.classList.contains('show') ? 'Hide Settings' : 'Show Settings';
    };
    updateText();
    sec.addEventListener('shown.bs.collapse', updateText);
    sec.addEventListener('hidden.bs.collapse', updateText);
  });

  const formSection = document.getElementById('newStationForm');
  const formToggle = document.querySelector('button[data-bs-target="#newStationForm"]');
  if (formSection && formToggle) {
    const updateFormText = () => {
      formToggle.textContent = formSection.classList.contains('show') ? 'Hide Form' : 'Show Form';
    };
    updateFormText();
    formSection.addEventListener('shown.bs.collapse', updateFormText);
    formSection.addEventListener('hidden.bs.collapse', updateFormText);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStationsTab);
} else {
  initStationsTab();
}

document.addEventListener('adminTabShown', (e) => {
  if (e.detail === 'stations') initStationsTab();
});
