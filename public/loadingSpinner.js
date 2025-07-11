(function(){
  window.showSpinner = function() {
    let spinner = document.getElementById('loadingSpinner');
    if (!spinner) {
      spinner = document.createElement('div');
      spinner.id = 'loadingSpinner';
      spinner.className = 'position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center';
      spinner.style.background = 'rgba(255, 255, 255, 0.8)';
      spinner.innerHTML = '<div class="spinner-border" role="status"></div>';
      document.body.appendChild(spinner);
    }
    spinner.classList.remove('d-none');
    return function() { window.hideSpinner(); };
  };

  window.hideSpinner = function() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('d-none');
  };
})();
