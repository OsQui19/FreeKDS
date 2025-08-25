const API_URL = import.meta.env.VITE_API_URL || '';

const originalFetch = window.fetch.bind(window);

window.fetch = (input, init) => {
  if (typeof input === 'string' && input.startsWith('/') && API_URL) {
    return originalFetch(API_URL + input, init);
  }
  return originalFetch(input, init);
};

export { API_URL };
