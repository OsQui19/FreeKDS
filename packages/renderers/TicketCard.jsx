import React from 'react';
import PropTypes from 'prop-types';
import Ajv from 'ajv';
import schema from './schemas/TicketCard.schema.json';
import ModifierList from './ModifierList.jsx';
import BumpAction from './BumpAction.jsx';

// Tokens are applied globally as CSS variables by TokenCSSVariables.
// TicketCard relies on CSS variable fallbacks defined in base.css to avoid async token fetches during render.

const ENABLE_VALIDATION = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE !== 'production';
let validate;
let compileErr = null;
function validateData(data) {
  if (!ENABLE_VALIDATION) return true;
  if (!validate && !compileErr) {
    try {
      const ajv = new Ajv({ allowUnionTypes: true, strict: false });
      const s = { ...schema };
      delete s.$schema;
      validate = ajv.compile(s);
    } catch (e) {
      compileErr = e; // CSP or other compile issue; skip runtime validation
      return true;
    }
  }
  return validate ? validate(data) : true;
}

/**
 * Display an individual kitchen ticket with items and modifiers.
 *
 * Schema: `TicketCard.schema.json` defines accepted properties.
 * Density: supports `comfortable` and `compact` for spacing.
 * Layout: vertical card.
 * Accessibility: high contrast labels, logical tab order ending on bump button.
 * Performance: aim for <5ms render per ticket with up to 10 items.
 *
 * @param {object} props - See `TicketCard.schema.json`.
 * @param {(id: number|string) => void} [props.onBump] - Callback when bumping.
 */
function TicketCard({
  orderId,
  orderNumber,
  orderType,
  createdTs,
  readyTs,
  allergy,
  specialInstructions,
  items,
  stationType,
  expeditor,
  onBump,
  onItemToggle,
  bumpLabel,
  stationsMap,
  style,
}) {
  if (style !== undefined) {
    throw new Error('style prop is not supported');
  }
  if (
    !validateData({
      orderId,
      orderNumber,
      orderType,
      createdTs,
      readyTs,
      allergy,
      specialInstructions,
      items,
      stationType,
      expeditor,
    })
  ) {
    throw new Error('Invalid TicketCard props');
  }

  // CSS variables handle token resolution; JS does not fetch tokens here.
  const surface = undefined;
  const radius = undefined;
  const padding = undefined;
  const createdDate = new Date(createdTs * 1000);
  const timeStr = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric' });
  const [elapsed, setElapsed] = React.useState('00:00');
  const [ageClass, setAgeClass] = React.useState('');
  const [showChips, setShowChips] = React.useState(true);

  React.useEffect(() => {
    function update() {
      const now = Date.now();
      const endMs = readyTs ? readyTs * 1000 : now;
      const sec = Math.max(0, Math.floor((endMs - createdDate.getTime()) / 1000));
      const mm = String(Math.floor(sec / 60)).padStart(2, '0');
      const ss = String(sec % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
      if (readyTs) {
        setAgeClass('ready');
      } else {
        // Read thresholds from CSS variables if present
        let warnS = 7 * 60;
        let critS = 12 * 60;
        try {
          const root = document.documentElement;
          const cs = getComputedStyle(root);
          const w = parseInt(cs.getPropertyValue('--kds-warn-s'));
          const c = parseInt(cs.getPropertyValue('--kds-crit-s'));
          if (!Number.isNaN(w)) warnS = w;
          if (!Number.isNaN(c)) critS = c;
        } catch {}
        if (sec >= critS) setAgeClass('critical');
        else if (sec >= warnS) setAgeClass('warn');
        else setAgeClass('');
      }
    }
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdTs, readyTs]);
  React.useEffect(() => {
    try {
      const cs = getComputedStyle(document.documentElement);
      const v = cs.getPropertyValue('--token-kds-expo-showChips').trim();
      if (v) setShowChips(v === '1' || v.toLowerCase() === 'true');
    } catch {}
  }, []);
  // For expo: compute per-station progress chips
  const stationChips = React.useMemo(() => {
    if (stationType !== 'expo') return [];
    const byStation = new Map();
    (items||[]).forEach((it)=>{
      const sid = it.stationId; if (!sid) return;
      if (!byStation.has(sid)) byStation.set(sid, []);
      byStation.get(sid).push(it);
    });
    const now = Math.floor(Date.now()/1000);
    return Array.from(byStation.entries()).map(([sid, list])=>{
      const allReady = list.every((it)=> it.state === 'ready');
      const ts = Math.max(...list.map((it)=> it.preparedTs||0));
      const elapsed = ts ? now - ts : (now - (createdTs||now));
      const mm = String(Math.floor(elapsed/60)).padStart(2,'0');
      const ss = String(elapsed%60).padStart(2,'0');
      const label = (stationsMap && (stationsMap[String(sid)] || stationsMap[sid])) || `S${sid}`;
      return { sid, label, status: allReady ? 'Ready' : 'Pending', elapsed: `${mm}:${ss}` };
    }).sort((a,b)=> a.label.localeCompare(b.label));
  }, [items, stationType, stationsMap, createdTs]);
  return (
    <div
      className={`ticket ${orderType ? orderType.replace(/\s+/g, '-').toLowerCase() : ''} ${
        expeditor ? 'expeditor' : ''
      } ${
        ageClass
      }`}
      data-order-id={orderId}
      data-priority={typeof priority !== 'undefined' ? String(priority) : undefined}
      data-created-ts={createdTs}
      style={{
        // Leave CSS variables to defaults/token CSS; no inline overrides needed
      }}
    >
      <div className="ticket-headerbar">
        <div className="time">{timeStr}</div>
        <div className="meta">#{orderNumber || orderId}</div>
      </div>
      <div className="ticket-header">
        {orderType && (
          <span className={`order-type ${orderType.replace(/\s+/g, '-').toLowerCase()}`}>{orderType}</span>
        )}
        <span className="order-num">{orderNumber}</span>
        {allergy && <span className="allergy-label">ALLERGY</span>}
        <span className="order-time">{timeStr}</span>
        {readyTs ? (
          <>
            <span className="badge bg-success ms-2">READY</span>
            <span className="elapsed ms-2">Prep: {elapsed}</span>
          </>
        ) : (
          <span className="elapsed">{elapsed}</span>
        )}
      </div>
      {stationType === 'expo' && showChips && stationChips.length > 0 && (
        <div className="ticket-progress mb-1">
          {stationChips.map((c)=> (
            <span key={c.sid} className={`badge me-1 ${c.status==='Ready'?'bg-success':'bg-secondary'}`} title={c.status}>
              {c.label}: {c.elapsed}
            </span>
          ))}
        </div>
      )}
      {specialInstructions && (
        <div className={`ticket-instructions${allergy ? ' allergy' : ''}`}>{specialInstructions}</div>
      )}
      <ul className={`items${stationType === 'expo' ? ' expo-items' : ''}`}>
        {items.map((item, idx) => {
          const ready = item.state === 'ready';
          return (
            <li
              key={idx}
              className={`item ${item.stationId ? 'station-' + item.stationId : ''} ${
                item.state ? 'state-' + item.state : ''
              }`}
              {...(item.rollupId ? { 'data-rollup-id': item.rollupId } : {})}
            >
              <span className="qty">{item.quantity}×</span>
              {stationType !== 'expo' && typeof onItemToggle === 'function' && (
                <input
                  className="form-check-input me-1"
                  type="checkbox"
                  checked={ready}
                  onChange={(e) => onItemToggle(orderId, item.orderItemId || item.itemId, e.target.checked ? 'ready' : 'in-progress')}
                  aria-label={`Mark ${item.name} ${ready ? 'not ready' : 'ready'}`}
                />
              )}
              <span
                className="item-name"
                data-item-id={item.itemId}
                {...(item.stationId ? { 'data-station-id': item.stationId } : {})}
              >
                {item.name}
              </span>
              <ModifierList modifiers={item.modifiers || []} />
              {item.specialInstructions && (
                <div className={`ticket-instructions${item.allergy ? ' allergy' : ''}`}>
                  {item.specialInstructions}
                </div>
              )}
              {item.allergy && <div className="allergy-label">ALLERGY</div>}
            </li>
          );
        })}
      </ul>
      {onBump && <BumpAction onBump={() => onBump(orderId)} label={bumpLabel || 'Bump'} />}
    </div>
  );
}

TicketCard.propTypes = {
  orderId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  orderNumber: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  orderType: PropTypes.string,
  createdTs: PropTypes.number.isRequired,
  allergy: PropTypes.bool,
  specialInstructions: PropTypes.string,
  stationType: PropTypes.string,
  expeditor: PropTypes.bool,
  items: PropTypes.arrayOf(
    PropTypes.shape({
      itemId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string.isRequired,
      quantity: PropTypes.number.isRequired,
      stationId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      state: PropTypes.oneOf([
        'queued',
        'in-progress',
        'ready',
        'bumped',
        'recalled',
      ]),
      preparedTs: PropTypes.number,
      rollupId: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      modifiers: PropTypes.arrayOf(PropTypes.string),
      specialInstructions: PropTypes.string,
      allergy: PropTypes.bool,
    })
  ).isRequired,
  onBump: PropTypes.func,
  bumpLabel: PropTypes.string,
  stationsMap: PropTypes.object,
  style: (props, propName, componentName) => {
    if (props[propName] !== undefined) {
      return new Error(`Invalid prop \`${propName}\` supplied to \`${componentName}\`. Use tokens or className instead.`);
    }
    return null;
  },
};

export default TicketCard;
