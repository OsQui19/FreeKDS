(function () {
  const keypad = document.getElementById("keypad");
  const input = document.getElementById("pinInput");
  if (!keypad || !input) return;
  // Arrange buttons in a typical numeric keypad order
  const layout = [7, 8, 9, 4, 5, 6, 1, 2, 3, 0];
  layout.forEach((n) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-primary";
    btn.textContent = n;
    btn.addEventListener("click", () => {
      if (input.value.length < 6) input.value += String(n);
    });
    if (n === 0) btn.classList.add("zero-btn");
    keypad.appendChild(btn);
  });
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "btn btn-secondary clear-btn";
  clear.textContent = "Clear";
  clear.addEventListener("click", () => {
    input.value = "";
  });
  keypad.appendChild(clear);
})();
