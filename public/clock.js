(function(){
  const keypad = document.getElementById('keypad');
  const input = document.getElementById('pinInput');
  if(!keypad || !input) return;
  const nums = [1,2,3,4,5,6,7,8,9,0];
  nums.forEach(n => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-primary';
    btn.textContent = n;
    btn.addEventListener('click', () => {
      if(input.value.length < 6) input.value += String(n);
    });
    keypad.appendChild(btn);
  });
  const clear = document.createElement('button');
  clear.type = 'button';
  clear.className = 'btn btn-secondary';
  clear.textContent = 'Clear';
  clear.addEventListener('click', () => { input.value = ''; });
  keypad.appendChild(clear);
})();
