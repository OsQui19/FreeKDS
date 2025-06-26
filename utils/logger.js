const path = require('path');

function formatSource(stackLine) {
  const match = stackLine.match(/\((.*):(\d+):(\d+)\)$/);
  if (!match) return '';
  const file = path.basename(match[1]);
  const line = match[2];
  return `${file}:${line}`;
}

['log', 'warn', 'error'].forEach((level) => {
  const orig = console[level];
  console[level] = (...args) => {
    const stack = new Error().stack.split('\n')[2] || '';
    const src = formatSource(stack);
    const ts = new Date().toISOString();
    orig.call(console, `[${ts}]${src ? ` [${src}]` : ''}`, ...args);
  };
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});
