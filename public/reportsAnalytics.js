function loadReports() {
  const salesEl = document.getElementById('salesChart');
  const usageEl = document.getElementById('usageChart');
  const catEl = document.getElementById('categoryChart');
  const topBody = document.getElementById('topItemsBody');
  const lowBody = document.getElementById('lowStockBody');
  const marginEl = document.getElementById('profitMarginVal');
  const roiEl = document.getElementById('roiVal');
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
      const profit = data.sales.map((r) => r.profit);
      const margin = data.sales.map((r) => r.margin);
      const roi = data.sales.map((r) => r.roi);

      new Chart(salesEl, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Revenue', data: revenue, borderColor: 'blue', fill: false },
            { label: 'Cost', data: cost, borderColor: 'red', fill: false },
            { label: 'Profit', data: profit, borderColor: 'green', fill: false },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });

      if (marginEl) {
        marginEl.textContent = margin[margin.length - 1].toFixed(2);
      }
      if (roiEl) {
        roiEl.textContent = roi[roi.length - 1].toFixed(2);
      }

      if (usageEl) {
        const usageLabels = data.usage.map((u) => u.name);
        const usageData = data.usage.map((u) => u.total);
        new Chart(usageEl, {
          type: 'bar',
          data: {
            labels: usageLabels,
            datasets: [
              { label: 'Total Used', data: usageData, backgroundColor: 'green' },
            ],
          },
          options: { scales: { y: { beginAtZero: true } } },
        });
      }

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
