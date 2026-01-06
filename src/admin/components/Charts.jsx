import React from 'react';

function normalizeSeries(data, xKey, yKey) {
  const xs = data.map((d, i) => ({ i, x: d[xKey] ?? i, y: Number(d[yKey] ?? 0) }));
  const minY = Math.min(0, ...xs.map((p) => p.y));
  const maxY = Math.max(1, ...xs.map((p) => p.y));
  return { points: xs, minY, maxY };
}

export function SimpleLineChart({ data = [], xKey = 'x', yKey = 'y', width = '100%', height = 160, color = '#0d6efd' }) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(400);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onResize() { setW(el.clientWidth || 400); }
    onResize();
    const r = new ResizeObserver(onResize); r.observe(el);
    return () => r.disconnect();
  }, []);
  const { points, minY, maxY } = normalizeSeries(data, xKey, yKey);
  const h = height;
  const pad = 6;
  const dx = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const scaleY = (val) => {
    const t = (val - minY) / (maxY - minY || 1);
    return h - pad - t * (h - pad * 2);
  };
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * dx} ${scaleY(p.y)}`)
    .join(' ');
  return (
    <div ref={ref} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
      <svg role="img" aria-label="Line chart" width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        <path d={d} fill="none" stroke={color} strokeWidth="2" />
      </svg>
    </div>
  );
}

export function SimpleBarChart({ data = [], xKey = 'x', yKey = 'y', width = '100%', height = 160, color = '#0d6efd' }) {
  const ref = React.useRef(null);
  const [w, setW] = React.useState(400);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onResize() { setW(el.clientWidth || 400); }
    onResize();
    const r = new ResizeObserver(onResize); r.observe(el);
    return () => r.disconnect();
  }, []);
  const { points, minY, maxY } = normalizeSeries(data, xKey, yKey);
  const h = height;
  const pad = 6;
  const bw = points.length ? Math.max(4, Math.floor((w - pad * 2) / (points.length * 1.5))) : 8;
  const gap = Math.floor(bw / 2);
  const scaleY = (val) => {
    const t = (val - Math.min(0, minY)) / (maxY - Math.min(0, minY) || 1);
    return h - pad - t * (h - pad * 2);
  };
  return (
    <div ref={ref} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
      <svg role="img" aria-label="Bar chart" width="100%" height={h} viewBox={`0 0 ${w} ${h}`}>
        {points.map((p, i) => {
          const x = pad + i * (bw + gap);
          const y = scaleY(Math.max(0, p.y));
          const y0 = scaleY(0);
          const hgt = Math.max(0, y0 - y);
          return <rect key={i} x={x} y={y} width={bw} height={hgt} fill={color} rx="2" />;
        })}
      </svg>
    </div>
  );
}

