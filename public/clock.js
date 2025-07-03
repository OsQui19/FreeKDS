(function () {
  const keypad = document.getElementById("keypad");
  const input = document.getElementById("pinInput");
  if (!keypad || !input) return;

  // Layout numbers in a 4x3 grid with a backspace button
  const layout = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "\u232b"];

  layout.forEach((n) => {
    if (n === null) {
      const placeholder = document.createElement("div");
      placeholder.className = "placeholder";
      keypad.appendChild(placeholder);
      return;
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-primary";

    if (n === "\u232b") {
      btn.classList.add("backspace-btn");
      btn.textContent = "\u232b";
      btn.addEventListener("click", () => {
        input.value = input.value.slice(0, -1);
      });
    } else {
      btn.textContent = n;
      btn.addEventListener("click", () => {
        if (input.value.length < 6) input.value += String(n);
      });
    }

    keypad.appendChild(btn);
  });
})();
