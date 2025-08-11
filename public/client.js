const script = document.currentScript;
let stationId = null;
let stationType = null;
let bumpedHistory = [];
if (script) {
  stationId = script.dataset.stationId || null;
  stationType = script.dataset.stationType || null;
  try {
    bumpedHistory = JSON.parse(script.dataset.bumpedHistory || '[]');
  } catch (e) {
    console.warn('Failed to parse bumped history', e);
  }
}
const socket = io({ query: { stationId } });
socket.emit("register", stationId);
let lastBumpedOrderId = null;
const bumpedOrders = [];
const MAX_HISTORY = 20;
let selectedTicket = null;

function animateRemove(elem) {
  elem.classList.add("fade-scale-out");
  elem.addEventListener(
    "animationend",
    () => {
      elem.remove();
    },
    { once: true },
  );
}
function loadBumpedOrders() {
  return fetch(
    `/api/bumped_orders?station_id=${stationId}&limit=${MAX_HISTORY}`,
  )
    .then((res) => res.json())
    .then((data) => {
      bumpedOrders.length = 0;
      (data.orders || []).forEach((o) => {
        const ticket = createTicketElement({
          orderId: o.order_id,
          orderNumber: o.order_number,
          orderType: o.order_type,
          createdTs: o.ts,
          specialInstructions: o.special_instructions,
          allergy: o.allergy,
          items: o.items,
        });
        bumpedOrders.push({
          orderId: o.order_id,
          orderNumber: o.order_number,
          ticket,
        });
      });
    })
    .catch((err) => console.error("Failed to fetch bumped orders", err));
}
function createTicketElement({
  orderId,
  orderNumber,
  orderType,
  createdTs,
  specialInstructions,
  allergy,
  items,
}) {
  const ticketDiv = document.createElement("div");
  ticketDiv.className = `ticket ${orderType ? orderType.replace(" ", "-").toLowerCase() : ""}`;
  ticketDiv.setAttribute("data-order-id", orderId);
  ticketDiv.setAttribute("data-created-ts", createdTs);
  let headerHTML = '<div class="ticket-header">';
  if (orderType) {
    headerHTML += `<span class="order-type ${orderType.replace(" ", "-").toLowerCase()}">${orderType}</span>`;
  }
  headerHTML += `<span class="order-num">${orderNumber}</span>`;
  if (allergy) {
    headerHTML += '<span class="allergy-label">ALLERGY</span>';
  }
  const d = new Date(createdTs * 1000);
  const timeStr = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
  });
  headerHTML += `<span class="order-time">${timeStr}</span>`;
  headerHTML += `<span class="elapsed">00:00</span></div>`;
  if (specialInstructions) {
    const allergyClass = allergy ? " allergy" : "";
    headerHTML += `<div class="ticket-instructions${allergyClass}">${specialInstructions}</div>`;
  }
  let itemsHTML = `<ul class="items${stationType === "expo" ? " expo-items" : ""}">`;
  for (let item of items) {
    const stationClass = item.stationId ? "station-" + item.stationId : "";
    itemsHTML += `<li class="item ${stationClass}">`;
    itemsHTML += `<span class="qty">${item.quantity}×</span>`;
    itemsHTML += `<span class="item-name" ${item.stationId ? `data-station-id="${item.stationId}"` : ""} data-item-id="${item.itemId}">${item.name}</span>`;
    if (item.modifiers && item.modifiers.length) {
      itemsHTML += '<ul class="item-modifiers">';
      for (let m of item.modifiers) {
        itemsHTML += `<li>${m}</li>`;
      }
      itemsHTML += "</ul>";
    }
    if (item.specialInstructions) {
      const allergyClass = item.allergy ? " allergy" : "";
      itemsHTML += `<div class="ticket-instructions${allergyClass}">${item.specialInstructions}</div>`;
    }
    if (item.allergy) {
      itemsHTML += '<div class="allergy-label">ALLERGY</div>';
    }
    itemsHTML += `</li>`;
  }
  itemsHTML += `</ul>`;
  ticketDiv.innerHTML = headerHTML + itemsHTML;
  return ticketDiv;
}

if (Array.isArray(bumpedHistory)) {
  bumpedHistory.forEach((o) => {
    const ticket = createTicketElement({
      orderId: o.order_id,
      orderNumber: o.order_number,
      orderType: o.order_type,
      createdTs: o.ts,
      specialInstructions: o.special_instructions,
      allergy: o.allergy,
      items: o.items,
    });
    bumpedOrders.push({
      orderId: o.order_id,
      orderNumber: o.order_number,
      ticket,
    });
  });
  if (bumpedOrders.length > MAX_HISTORY) bumpedOrders.splice(MAX_HISTORY);
}
// Timer update: update all tickets' elapsed time every second
function updateTimers() {
  const now = Date.now();
  document.querySelectorAll(".ticket").forEach((ticket) => {
    const createdTs = ticket.getAttribute("data-created-ts");
    if (!createdTs) return;
    const elapsedMs = now - createdTs * 1000;
    const mins = Math.floor(elapsedMs / 60000);
    const secs = Math.floor((elapsedMs % 60000) / 1000);
    const mm = String(mins).padStart(2, "0");
    const ss = String(secs).padStart(2, "0");
    const elapsedElem = ticket.querySelector(".elapsed");
    if (elapsedElem) {
      elapsedElem.textContent = `${mm}:${ss}`;
      if (mins >= 10) {
        elapsedElem.style.color = "var(--color-danger)";
        ticket.classList.add("urgent");
        ticket.classList.remove("warning");
      } else if (mins >= 5) {
        elapsedElem.style.color = "var(--color-warning)";
        ticket.classList.add("warning");
        ticket.classList.remove("urgent");
      } else {
        elapsedElem.style.color = "";
        ticket.classList.remove("warning");
        ticket.classList.remove("urgent");
      }
    }
  });
}
setInterval(updateTimers, 1000);
updateTimers();
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatRecipeList(recipe) {
  if (!recipe) return "";
  return (
    "<ol>" +
    recipe
      .replace(/\r/g, "")
      .split("\n")
      .filter((s) => s.trim())
      .map((step) => `<li>${escapeHtml(step)}</li>`)
      .join("") +
    "</ol>"
  );
}
// Socket.io event handlers for real-time updates:
socket.on("orderAdded", (data) => {
  const { orderId } = data;
  if (document.querySelector(`.ticket[data-order-id="${orderId}"]`)) return;
  const ticketDiv = createTicketElement({
    orderId: data.orderId,
    orderNumber: data.orderNumber,
    orderType: data.orderType,
    specialInstructions: data.specialInstructions,
    allergy: data.allergy,
    createdTs: data.createdTs,
    items: data.items,
  });
  ticketDiv.classList.add("fade-scale-in");
  ticketDiv.addEventListener("animationend", () => {
    ticketDiv.classList.remove("fade-scale-in");
  }, { once: true });
  document.querySelector(".tickets-container").appendChild(ticketDiv);
});
socket.on("orderCompleted", (data) => {
  const { orderId } = data;
  const ticket = document.querySelector(`.ticket[data-order-id="${orderId}"]`);
  if (ticket) {
    animateRemove(ticket);
  }
});

socket.on("stationDone", (data) => {
  // Expo only: mark items from a station as done (strike-through)
  if (stationType !== "expo") return;
  const { orderId, stationId } = data;
  const ticket = document.querySelector(`.ticket[data-order-id="${orderId}"]`);
  if (ticket) {
    // Mark each item from that station
    ticket.querySelectorAll(`.item.station-${stationId}`).forEach((elem) => {
      elem.classList.add("done");
    });
    // If all items are done, highlight the ticket (e.g., border green)
    const allItems = ticket.querySelectorAll(".item");
    const doneItems = ticket.querySelectorAll(".item.done");
    if (allItems.length === doneItems.length && allItems.length !== 0) {
      ticket.classList.add("all-done");
    }
  }
});

socket.on("stationUndo", (data) => {
  // Expo only: un-mark items from a station (if a prep recall happened)
  if (stationType !== "expo") return;
  const { orderId, stationId } = data;
  const ticket = document.querySelector(`.ticket[data-order-id="${orderId}"]`);
  if (ticket) {
    ticket.querySelectorAll(`.item.station-${stationId}`).forEach((elem) => {
      elem.classList.remove("done");
    });
    ticket.classList.remove("all-done");
  }
});
// Highlight an order as urgent and move it to the top
socket.on("orderUrgent", (data) => {
  const { orderId } = data;
  const ticket = document.querySelector(`.ticket[data-order-id="${orderId}"]`);
  if (ticket) {
    ticket.classList.add("urgent");
    const container = document.querySelector(".tickets-container");
    if (container.firstChild) {
      container.insertBefore(ticket, container.firstChild);
    } else {
      container.appendChild(ticket);
    }
  }
});
// Button event handlers:
const actionBtn = document.getElementById("actionBtn");
const recallBtn = document.getElementById("recallBtn");
const urgentBtn = document.getElementById("urgentBtn");
const recallModal = document.getElementById("recallModal");
const recallList = document.getElementById("recallList");
const recallCloseBtn = document.getElementById("recallClose");
const layoutToggleBtn = document.getElementById("layoutToggle");
const ticketsMain = document.getElementById("ticketsMain");
const stationSelect = document.getElementById("stationSelect");
document.addEventListener("click", (e) => {
  const ticketDiv = e.target.closest(".ticket");
  if (ticketDiv && !ticketDiv.closest("#recallList")) {
    document
      .querySelectorAll(".ticket.selected")
      .forEach((t) => t.classList.remove("selected"));
    ticketDiv.classList.add("selected");
    selectedTicket = ticketDiv;
  }
});
actionBtn.addEventListener("click", () => {
  // Bump (Ready or Serve)
  // Determine the order to bump: selected ticket or the oldest ticket
  const ticket = selectedTicket || document.querySelector(".ticket");
  if (ticket) {
    const orderId = Number(ticket.getAttribute("data-order-id"));
    const orderNumber = ticket.querySelector(".order-num").textContent;
    lastBumpedOrderId = orderId;
    bumpedOrders.unshift({ orderId, orderNumber, ticket });
    if (bumpedOrders.length > MAX_HISTORY) bumpedOrders.pop();
    socket.emit("bumpOrder", { orderId });
    if (stationType !== "expo") {
      animateRemove(ticket);
    }
    if (ticket === selectedTicket) {
      selectedTicket = null;
    }
  }
});

urgentBtn.addEventListener("click", () => {
  if (!selectedTicket) return;
  selectedTicket.classList.add("urgent");
  const container = document.querySelector(".tickets-container");
  if (container.firstChild) {
    container.insertBefore(selectedTicket, container.firstChild);
  } else {
    container.appendChild(selectedTicket);
  }
});
recallBtn.addEventListener("click", () => {
  const showModal = () => {
    recallList.innerHTML = "";
    bumpedOrders.forEach((o, idx) => {
      const li = document.createElement("li");
      li.dataset.index = idx;
      const clone = o.ticket.cloneNode(true);
      clone.classList.add("recall-ticket");
      li.appendChild(clone);
      recallList.appendChild(li);
    });
    if (bumpedOrders.length > 0) {
      recallModal.classList.remove("d-none");
      recallModal.classList.add("d-flex");
    }
  };
  if (bumpedOrders.length === 0) {
    loadBumpedOrders().then(showModal);
  } else {
    showModal();
  }
});

document.addEventListener("click", (e) => {
  const li = e.target.closest("#recallList li");
  if (li) {
    const idx = parseInt(li.dataset.index, 10);
    const info = bumpedOrders[idx];
    recallModal.classList.add("d-none");
    socket.emit("recallOrder", { orderId: info.orderId });
    const container = document.querySelector(".tickets-container");
    if (container.firstChild) {
      info.ticket.classList.add("fade-scale-in");
      info.ticket.addEventListener(
        "animationend",
        () => info.ticket.classList.remove("fade-scale-in"),
        { once: true },
      );
      container.insertBefore(info.ticket, container.firstChild);
    } else {
      info.ticket.classList.add("fade-scale-in");
      info.ticket.addEventListener(
        "animationend",
        () => info.ticket.classList.remove("fade-scale-in"),
        { once: true },
      );
      container.appendChild(info.ticket);
    }
    bumpedOrders.splice(idx, 1);
  }
});

recallCloseBtn.addEventListener("click", () => {
  recallModal.classList.add("d-none");
});
if (layoutToggleBtn && ticketsMain) {
  layoutToggleBtn.addEventListener("click", () => {
    ticketsMain.classList.toggle("tickets-grid");
  });
}
if (stationSelect) {
  stationSelect.addEventListener("change", () => {
    const id = stationSelect.value;
    window.location.href = `/station/${id}`;
  });
}
// Recipe modal logic:
const modal = document.getElementById("recipeModal");
const recipeTextDiv = document.getElementById("recipeText");
const modalCloseBtn = document.getElementById("modalClose");
// Click on item name to fetch recipe
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("item-name")) {
    const itemId = e.target.getAttribute("data-item-id");
    const itemName = e.target.textContent;
    let url = "";
    if (itemId) {
      url = `/api/recipe?id=${encodeURIComponent(itemId)}`;
    } else {
      url = `/api/recipe?name=${encodeURIComponent(itemName)}`;
    }
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        recipeTextDiv.innerHTML = data.recipe
          ? formatRecipeList(data.recipe)
          : "<p>No recipe available.</p>";
        modal.classList.remove("d-none");
        modal.classList.add("d-block");
      })
      .catch((err) => {
        console.error("Failed to fetch recipe", err);
      });
  }
});
modalCloseBtn.addEventListener("click", () => {
  modal.classList.add("d-none");
  modal.classList.remove("d-block");
});
