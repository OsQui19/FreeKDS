export function formatCurrency(value, currency = 'USD', locale = undefined) {
  try {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value ?? '');
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
  } catch {
    return String(value ?? '');
  }
}

export function formatNumber(value, digits = 0, locale = undefined) {
  try {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value ?? '');
    return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  } catch {
    return String(value ?? '');
  }
}

export function formatDate(value, locale = undefined) {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value ?? '');
    return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(value ?? '');
  }
}

export function formatDateTime(value, locale = undefined) {
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value ?? '');
    return d.toLocaleString(locale, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return String(value ?? '');
  }
}

