let salesChart;
let usageChart;
let categoryChart;
const socket = window.io ? io() : null;

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

function loadReports() {
  const salesEl = document.getElementById("salesChart");
  const usageEl = document.getElementById("usageChart");
  const catEl = document.getElementById("categoryChart");
  const topBody = document.getElementById("topItemsBody");
  const lowBody = document.getElementById("lowStockBody");
  const avgBody = document.getElementById("avgTimesBody");
  const marginEl = document.getElementById("profitMarginVal");
  const roiEl = document.getElementById("roiVal");
  if (!salesEl || !catEl) return;

  const startInput = document.getElementById("reportStart");
  const endInput = document.getElementById("reportEnd");
  const end =
    endInput && endInput.value ? new Date(endInput.value) : new Date();
  const start =
    startInput && startInput.value
      ? new Date(startInput.value)
      : new Date(end.getTime() - 29 * 86400000);

  fetch(`/admin/reports/data?start=${fmt(start)}&end=${fmt(end)}`)
    .then((r) => r.json())
    .then((data) => {
      const labels = data.sales.map((r) => r.date);
      const revenue = data.sales.map((r) => r.total);
      const cost = data.sales.map((r) => r.cost);
      const profit = data.sales.map((r) => r.profit);
      const margin = data.sales.map((r) => r.margin);
      const roi = data.sales.map((r) => r.roi);

      if (!labels.length) {
        labels.push(fmt(start));
        revenue.push(0);
        cost.push(0);
        profit.push(0);
      }

      if (salesChart) salesChart.destroy();
      salesChart = new Chart(salesEl, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Revenue",
              data: revenue,
              borderColor: "blue",
              fill: false,
            },
            { label: "Cost", data: cost, borderColor: "red", fill: false },
            {
              label: "Profit",
              data: profit,
              borderColor: "green",
              fill: false,
            },
          ],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });

      if (marginEl) {
        const lastMargin = margin.length ? margin[margin.length - 1] : 0;
        marginEl.textContent = lastMargin.toFixed(2);
      }
      if (roiEl) {
        const lastRoi = roi.length ? roi[roi.length - 1] : 0;
        roiEl.textContent = lastRoi.toFixed(2);
      }

      if (usageEl) {
        if (usageChart) usageChart.destroy();
        const usageLabels = data.usage.map((u) => u.name);
        const usageData = data.usage.map((u) => u.total);
        if (!usageLabels.length) {
          usageLabels.push("No Data");
          usageData.push(0);
        }
        usageChart = new Chart(usageEl, {
          type: "bar",
          data: {
            labels: usageLabels,
            datasets: [
              {
                label: "Total Used",
                data: usageData,
                backgroundColor: "green",
              },
            ],
          },
          options: { scales: { y: { beginAtZero: true } } },
        });
      }

      const catLabels = data.categorySales.map((c) => c.name);
      const catTotals = data.categorySales.map((c) => c.total);
      if (!catLabels.length) {
        catLabels.push("No Data");
        catTotals.push(0);
      }
      if (categoryChart) categoryChart.destroy();
      categoryChart = new Chart(catEl, {
        type: "bar",
        data: {
          labels: catLabels,
          datasets: [{ label: "Sales", data: catTotals }],
        },
        options: { scales: { y: { beginAtZero: true } } },
      });

      if (topBody) {
        topBody.innerHTML = "";
        data.topItems.forEach((it) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${it.name}</td><td>${it.qty}</td><td>$${parseFloat(it.revenue).toFixed(2)}</td>`;
          topBody.appendChild(tr);
        });
      }
      if (lowBody) {
        lowBody.innerHTML = "";
        data.lowStock.forEach((it) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${it.name}</td><td>${it.quantity}</td><td>${it.unit || ""}</td>`;
          lowBody.appendChild(tr);
        });
      }
      if (avgBody) {
        avgBody.innerHTML = "";
        data.avgTimes.forEach((row) => {
          const tr = document.createElement("tr");
          const mins = row.avg_seconds / 60;
          tr.innerHTML = `<td>${row.name}</td><td>${mins.toFixed(1)}</td>`;
          avgBody.appendChild(tr);
        });
      }
    })
    .catch((err) => console.error("Reports fetch error", err));
}

function initReports() {
  const rangeForm = document.getElementById("reportsRangeForm");
  const startInput = document.getElementById("reportStart");
  const endInput = document.getElementById("reportEnd");
  if (startInput && endInput) {
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 86400000);
    startInput.value = fmt(start);
    endInput.value = fmt(end);
  }
  if (rangeForm) {
    rangeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loadReports();
    });
  }
  loadReports();
  setInterval(loadReports, 60000);
  if (socket) {
    socket.on("reportsUpdated", loadReports);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initReports);
} else {
  initReports();
}
