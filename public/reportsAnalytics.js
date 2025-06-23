function loadReports() {
  const salesEl = document.getElementById('salesChart');
  const catEl = document.getElementById('categoryChart');
  const topBody = document.getElementById('topItemsBody');
  const lowBody = document.getElementById('lowStockBody');
  if (!salesEl || !catEl) return;

  function fmt(d) {
    return d.toISOString().slice(0, 10);
  }
  const end = new Date();
  const start = new Date(end.getTime() - 29 * 86400000);

  fetch(`/admin/reports/data?start=${fmt(start)}&end=${fmt(end)}`)
    .then((r) => r.json())
    .then((data) => {
      const labels = data.sales.map((r) => r.date);
      const revenue = data.sales.map((r) => r.total);
      const cost = data.sales.map((r) => r.cost);
      new Chart(salesEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Revenue', data: revenue, borderColor: 'blue', fill: false },
            { label: 'Cost', data: cost, borderColor: 'red', fill: false },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });

      const catLabels = data.categorySales.map((c) => c.name);
      const catTotals = data.categorySales.map((c) => c.total);
      new Chart(catEl, {
        type: 'bar',
        data: { labels: catLabels, datasets: [{ label: 'Sales', data: catTotals }] },
        options: { scales: { y: { beginAtZero: true } } },
      });

      if (topBody) {
        data.topItems.forEach((it) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${it.name}</td><td>${it.qty}</td><td>$${parseFloat(it.revenue).toFixed(2)}</td>`;
          topBody.appendChild(tr);
        });
      }
      if (lowBody) {
        data.lowStock.forEach((it) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${it.name}</td><td>${it.quantity}</td><td>${it.unit || ''}</td>`;
          lowBody.appendChild(tr);
        });
      }
    })
    .catch((err) => console.error('Reports fetch error', err));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadReports);
} else {
  loadReports();
}
