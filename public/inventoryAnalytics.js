// Fetch inventory statistics and render charts using Chart.js
function initInventoryAnalytics() {
  const salesEl = document.getElementById("salesChart");
  const usageEl = document.getElementById("usageChart");
  if (!salesEl || !usageEl) return;

  function formatDate(d) {
    return d.toISOString().slice(0, 10);
  }
  const end = formatDate(new Date());
  const start = formatDate(new Date(Date.now() - 29 * 86400000));

  fetch(`/admin/inventory/stats?start=${start}&end=${end}`)
    .then((res) => res.json())
    .then((data) => {
      const labels = data.sales.map((r) => r.date);
      const salesData = data.sales.map((r) => r.total);
      const costData = data.sales.map((r) => r.cost);
      new Chart(salesEl, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Sales Revenue",
              data: salesData,
              borderColor: "blue",
              fill: false,
            },
            {
              label: "Ingredient Cost",
              data: costData,
              borderColor: "red",
              fill: false,
            },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });

      const usageLabels = data.usage.map((u) => u.name);
      const usageData = data.usage.map((u) => u.total);
      new Chart(usageEl, {
        type: "bar",
        data: {
          labels: usageLabels,
          datasets: [
            { label: "Total Used", data: usageData, backgroundColor: "green" },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });
    })
    .catch((err) => console.error("Analytics fetch error", err));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInventoryAnalytics);
} else {
  initInventoryAnalytics();
}
