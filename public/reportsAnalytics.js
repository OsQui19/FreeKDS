let salesChart;
let usageChart;
let categoryChart;
const socket = window.io ? io() : null;

function showReportsError(msg) {
  const tab = document.getElementById("reportsTab");
  if (!tab) return;
  const existing = tab.querySelector(".reports-error-alert");
  if (existing) existing.remove();
  const div = document.createElement("div");
  div.className =
    "alert alert-danger alert-dismissible fade show m-2 reports-error-alert";
  div.role = "alert";
  div.innerHTML = `${msg} <button type="button" class="btn btn-sm btn-outline-danger ms-2 retry-reports">Retry</button>`;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "btn-close";
  closeBtn.setAttribute("data-bs-dismiss", "alert");
  closeBtn.setAttribute("aria-label", "Close");
  div.appendChild(closeBtn);
  tab.prepend(div);
  const retry = div.querySelector(".retry-reports");
  if (retry) {
    retry.addEventListener("click", () => {
      div.remove();
      loadReports();
    });
  }
}

let reportsIntervalId = null;
let reportsSocketListener = null;
let reportsAbortController = null;

function fmt(d) {
  return d.toISOString().slice(0, 10);
}

async function loadReports() {
  if (reportsAbortController) {
    reportsAbortController.abort();
  }
  const controller = new AbortController();
  reportsAbortController = controller;
  const hide = window.showSpinner ? window.showSpinner() : () => {};
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

  try {
    const res = await fetch(
      `/admin/reports/data?start=${fmt(start)}&end=${fmt(end)}`,
      { signal: controller.signal },
    );
    const data = await res.json();
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
          const nameTd = document.createElement("td");
          nameTd.textContent = it.name;
          const qtyTd = document.createElement("td");
          qtyTd.textContent = it.qty;
          const revenueTd = document.createElement("td");
          revenueTd.textContent = `$${parseFloat(it.revenue).toFixed(2)}`;
          tr.appendChild(nameTd);
          tr.appendChild(qtyTd);
          tr.appendChild(revenueTd);
          topBody.appendChild(tr);
        });
      }
      if (lowBody) {
        lowBody.innerHTML = "";
        data.lowStock.forEach((it) => {
          const tr = document.createElement("tr");
          const nameTd = document.createElement("td");
          nameTd.textContent = it.name;
          const qtyTd = document.createElement("td");
          qtyTd.textContent = it.quantity;
          const unitTd = document.createElement("td");
          unitTd.textContent = it.unit || "";
          tr.appendChild(nameTd);
          tr.appendChild(qtyTd);
          tr.appendChild(unitTd);
          lowBody.appendChild(tr);
        });
      }
      if (avgBody) {
        avgBody.innerHTML = "";
        data.avgTimes.forEach((row) => {
          const tr = document.createElement("tr");
          const nameTd = document.createElement("td");
          nameTd.textContent = row.name;
          const minsTd = document.createElement("td");
          const mins = row.avg_seconds / 60;
          minsTd.textContent = mins.toFixed(1);
          tr.appendChild(nameTd);
          tr.appendChild(minsTd);
          avgBody.appendChild(tr);
        });
      }
  } catch (err) {
    if (err.name === "AbortError") {
      return;
    }
    console.error("Reports fetch error", err);
    showReportsError("Failed to load reports");
  } finally {
    if (reportsAbortController === controller) {
      reportsAbortController = null;
    }
    if (typeof hide === "function") hide();
  }
}

let reportsInitialized = false;
async function initReports() {
  const rangeForm = document.getElementById("reportsRangeForm");
  const startInput = document.getElementById("reportStart");
  const endInput = document.getElementById("reportEnd");
  if (startInput && endInput) {
    const end = new Date();
    const start = new Date(end.getTime() - 29 * 86400000);
    startInput.value = fmt(start);
    endInput.value = fmt(end);
    document.querySelectorAll(".report-preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        const days = parseInt(btn.dataset.days, 10);
        if (!days) return;
        const now = new Date();
        const startDate = new Date(now.getTime() - (days - 1) * 86400000);
        startInput.value = fmt(startDate);
        endInput.value = fmt(now);
        loadReports();
      });
    });
  }
  if (rangeForm) {
    rangeForm.addEventListener("submit", (e) => {
      e.preventDefault();
      loadReports();
    });
  }
  await loadReports();
  // Interval and socket listener are initialized when the tab becomes active
}

async function startReports() {
  if (!reportsInitialized) {
    try {
      await initReports();
      reportsInitialized = true;
    } catch (err) {
      console.error("Reports initialization failed", err);
      reportsInitialized = false;
    }
  } else {
    try {
      await loadReports();
    } catch (err) {
      console.error("Reports reload failed", err);
    }
  }
  if (!reportsIntervalId) {
    reportsIntervalId = setInterval(loadReports, 60000);
  }
  if (socket && !reportsSocketListener) {
    reportsSocketListener = () => loadReports();
    socket.on("reportsUpdated", reportsSocketListener);
  }
}

window.initReportsTab = startReports;

document.addEventListener("adminTabShown", (e) => {
  if (e.detail === "reports") startReports();
});

document.addEventListener("adminTabHidden", (e) => {
  if (e.detail === "reports") {
    if (reportsIntervalId) {
      clearInterval(reportsIntervalId);
      reportsIntervalId = null;
    }
    if (socket && reportsSocketListener) {
      socket.off("reportsUpdated", reportsSocketListener);
      reportsSocketListener = null;
    }
    if (reportsAbortController) {
      reportsAbortController.abort();
      reportsAbortController = null;
    }
  }
});

// Reinitialize when returning via bfcache
window.addEventListener("pageshow", () => {
  if (document.visibilityState === "visible") {
    startReports();
  }
});
