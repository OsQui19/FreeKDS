document.addEventListener('DOMContentLoaded', () => {
  const salesEl = document.getElementById('salesChart');
  const usageEl = document.getElementById('usageChart');
  if (!salesEl || !usageEl) return;

  fetch('/admin/inventory/stats')
    .then(r => r.json())
    .then(data => {
      if (!window.Chart) return;
      const salesLabels = data.sales.map(r => r.date);
      const salesData = data.sales.map(r => parseFloat(r.total));
      new Chart(salesEl.getContext('2d'), {
        type: 'bar',
        data: {
          labels: salesLabels,
          datasets: [{ label: 'Sales', data: salesData, backgroundColor: '#0d6efd' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      const usageLabels = data.usage.map(r => r.name);
      const usageData = data.usage.map(r => parseFloat(r.total));
      new Chart(usageEl.getContext('2d'), {
        type: 'pie',
        data: {
          labels: usageLabels,
          datasets: [{ data: usageData, backgroundColor: usageLabels.map(() => '#6c757d') }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    })
    .catch(err => console.error('Analytics fetch error', err));
});
