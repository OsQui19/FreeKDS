import React from 'react';
import { useNode } from '@craftjs/core';
import { getToken } from '@/utils/tokens.js';
import { TicketGrid } from '@/../packages/renderers/index.js';

// ---- Utility: safe fetcher for bindings ----
async function safeGet(url, signal) {
  if (typeof url !== 'string' || !url.startsWith('/api/')) {
    throw new Error('URL must start with /api/');
  }
  const res = await fetch(url, { method: 'GET', signal });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

function Block({ children, style }) {
  const {
    connectors: { connect, drag },
    hovered,
    selected,
    displayName,
  } = useNode((node) => ({
    hovered: node.events.hovered,
    selected: node.events.selected,
    displayName: node.data.displayName || node.data.name,
  }));
  return (
    <div
      ref={(ref) => connect(drag(ref))}
      className={`builder-block ${selected ? 'is-selected' : hovered ? 'is-hovered' : ''}`}
      style={{ ...style }}
    >
      <div className="block-hint">
        <span className="handle" title="Drag">⋮⋮</span>
        <span className="label">{displayName || 'Block'}</span>
      </div>
      <div className="block-inner">{children}</div>
    </div>
  );
}

export const Grid = ({ children, gap = 8 }) => <Block style={{ display: 'grid', gap }}>{children}</Block>;
Grid.craft = { props: { gap: 8 }, displayName: 'Grid' };

export const Stack = ({ children, gap = 8 }) => <Block style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</Block>;
Stack.craft = { props: { gap: 8 }, displayName: 'Stack' };

export const Tabs = ({ children }) => <Block>{children}</Block>;
Tabs.craft = { displayName: 'Tabs' };

export const TicketList = ({ children }) => <Block>{children}</Block>;
TicketList.craft = { displayName: 'TicketList' };

export const Filters = ({ children }) => <Block>{children}</Block>;
Filters.craft = { displayName: 'Filters' };

function TokenText({ text }) {
  const [value, setValue] = React.useState(text);
  React.useEffect(() => {
    const match = typeof text === 'string' && text.match(/{{(.*?)}}/);
    if (match) {
      getToken(match[1]).then((v) => setValue(text.replace(match[0], v || '')));
    } else {
      setValue(text);
    }
  }, [text]);
  return <>{value}</>;
}

export const Header = ({ text = 'Header', children }) => (
  <Block>
    <TokenText text={text} />
    {children}
  </Block>
);
Header.craft = { props: { text: 'Header' }, displayName: 'Header' };

export const Footer = ({ text = 'Footer', children }) => (
  <Block>
    <TokenText text={text} />
    {children}
  </Block>
);
Footer.craft = { props: { text: 'Footer' }, displayName: 'Footer' };

export const AllDayAggregate = ({ children }) => <Block>{children}</Block>;
AllDayAggregate.craft = { displayName: 'AllDayAggregate' };

export const AllDayFilter = ({ children }) => <Block>{children}</Block>;
AllDayFilter.craft = { displayName: 'AllDayFilter' };

// ----- KDS specific blocks for the Design Studio builder -----
function getTestTickets() {
  try { return Array.isArray(window.__DS_TEST_TICKETS__) ? window.__DS_TEST_TICKETS__ : []; } catch { return []; }
}

export const KdsHeader = ({ text = 'Kitchen Screen', showClock = true, align = 'space-between' }) => (
  <Block>
    <div className="d-flex" style={{ justifyContent: align, alignItems: 'center' }}>
      <div className="fw-bold">{text}</div>
      {showClock && <div className="text-muted small">{new Date().toLocaleTimeString()}</div>}
    </div>
  </Block>
);
KdsHeader.craft = { props: { text: 'Kitchen', showClock: true, align: 'space-between' }, displayName: 'KdsHeader' };

export const KdsTicketGrid = ({
  layout = 'grid',
  density = 'comfortable',
  cardMin = 280,
  stationType = 'prep',
  tickets,
  mode = 'tickets', // 'tickets' | 'items-list'
  showElapsed = true,
  showSpecial = true,
  showAllergy = true,
}) => {
  const data = Array.isArray(tickets) ? tickets : getTestTickets();
  if (mode === 'items-list') {
    const rows = [];
    (data || []).forEach((t) => {
      (t.items || []).forEach((it) => {
        rows.push({
          orderNumber: t.orderNumber || t.orderId,
          createdTs: t.createdTs,
          name: it.name,
          qty: it.quantity || 1,
          mods: (it.modifiers || []).join(', '),
          allergy: !!(it.allergy || t.allergy),
          special: it.specialInstructions || t.specialInstructions || '',
        });
      });
    });
    return (
      <Block>
        <div className="card-surface p-2">
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead><tr><th>Item</th><th className="text-end">Qty</th><th>Order</th><th>Mods</th>{showSpecial && <th>Notes</th>}{showElapsed && <th>Age</th>}{showAllergy && <th>Allergy</th>}</tr></thead>
              <tbody>
                {rows.map((r, i)=>{
                  const age = r.createdTs ? Math.max(0, Math.floor((Date.now()/1000 - r.createdTs))) : 0;
                  const mm = String(Math.floor(age/60)).padStart(2,'0');
                  const ss = String(age%60).padStart(2,'0');
                  return (
                    <tr key={i} className={r.allergy ? 'table-danger' : ''}>
                      <td>{r.name}</td>
                      <td className="text-end fw-bold">{r.qty}</td>
                      <td className="text-muted">{r.orderNumber}</td>
                      <td className="text-muted small">{r.mods || '-'}</td>
                      {showSpecial && <td className="text-muted small">{r.special || '-'}</td>}
                      {showElapsed && <td className="text-muted small">{mm}:{ss}</td>}
                      {showAllergy && <td>{r.allergy ? 'YES' : '-'}</td>}
                    </tr>
                  );
                })}
                {!rows.length && <tr><td colSpan={6} className="text-muted">No items</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </Block>
    );
  }
  return (
    <Block>
      <div className="kds-screen" style={{ ['--kds-card-min']: `${cardMin}px` }}>
        <TicketGrid tickets={data} stationType={stationType} density={density} layout={layout} onBump={() => {}} />
      </div>
    </Block>
  );
};
KdsTicketGrid.craft = { props: { layout: 'grid', density: 'comfortable', cardMin: 280, stationType: 'prep', mode: 'tickets', showElapsed: true, showSpecial: true, showAllergy: true }, displayName: 'KdsTicketGrid' };

// Ticket Template: fully customizable lightweight card renderer
export const KdsTicketTemplate = ({
  tickets,
  columns = 2,
  style = 'minimal', // 'minimal' | 'detailed'
  showHeader = true,
  showOrderMeta = true,
  showItems = true,
  showModifiers = true,
  showElapsed = true,
  warnS = 420,
  critS = 720,
  stationTheme = 'auto', // 'auto'|'expo'|'prep'
  headerLeftTpl = '{{orderType}}',
  headerRightTpl = '#{{orderNumber}}',
  showActions = false,
  actions = [], // [{label:'Hold', method:'POST', urlTpl:'/api/hold/{{orderId}}'}]
  warnColorToken = '--token-state-warn',
  critColorToken = '--token-state-critical',
  accentToken = '--token-color-accent',
}) => {
  const data = Array.isArray(tickets) ? tickets : getTestTickets();
  const colStyle = { gridTemplateColumns: `repeat(${Math.max(1, parseInt(columns||1,10))}, 1fr)` };
  const format = (tpl, ctx) => String(tpl||'').replace(/{{(\w+)}}/g, (_,k)=> (ctx[k]??''));
  const runAction = async (a, ticket) => {
    try {
      if (!a || !a.urlTpl) return;
      const url = format(a.urlTpl, { orderId: ticket.orderId, orderNumber: ticket.orderNumber, orderType: ticket.orderType });
      if (!url.startsWith('/api/')) throw new Error('URL must start with /api/');
      const res = await fetch(url, { method: a.method||'POST' });
      alert(res.ok ? (a.success||'Action sent') : (a.error||'Action failed'));
    } catch (e) { alert(e.message||'Action failed'); }
  };
  return (
    <Block>
      <div className={`kds-template ${style}`} style={{ ...(style==='grid'?colStyle:{}), '--tpl-warn': `var(${warnColorToken}, #ffc107)`, '--tpl-crit': `var(${critColorToken}, #dc3545)`, '--tpl-accent': `var(${accentToken}, #0d6efd)` }}>
        {(data||[]).map((t,i)=>{
          const age = t.createdTs ? Math.max(0, Math.floor((Date.now()/1000 - t.createdTs))) : 0;
          const mm = String(Math.floor(age/60)).padStart(2,'0');
          const ss = String(age%60).padStart(2,'0');
          let stateClass = '';
          if (age >= critS) stateClass = 'critical'; else if (age >= warnS) stateClass = 'warn';
          const stClass = stationTheme==='auto' ? ((t.orderType||'').toLowerCase().includes('expo')?'station-expo':'') : (stationTheme==='expo'?'station-expo':'');
          return (
            <div className={`tpl-card ${stateClass} ${stClass} ${t.allergy?'is-allergy':''}`} key={i}>
              {showHeader && (
                <div className="tpl-header">
                  <div className="left">{format(headerLeftTpl, { orderType: t.orderType||'', orderNumber: t.orderNumber||t.orderId, orderId: t.orderId })}</div>
                  {showOrderMeta && <div className="meta">{format(headerRightTpl, { orderNumber: t.orderNumber||t.orderId, orderId: t.orderId })}</div>}
                  {showElapsed && <div className="age">{mm}:{ss}</div>}
                </div>
              )}
              {showItems && (
                <ul className="tpl-items">
                  {(t.items||[]).map((it,idx)=> (
                    <li key={idx}>
                      <span className="qty">{it.quantity||1}×</span>
                      <span className="name">{it.name}</span>
                      {showModifiers && (it.modifiers && it.modifiers.length>0) && (
                        <span className="mods">{it.modifiers.join(', ')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {t.specialInstructions && <div className="tpl-notes">{t.specialInstructions}</div>}
              {showActions && Array.isArray(actions) && actions.length>0 && (
                <div className="d-flex gap-2 mt-2">
                  {actions.map((a,idx)=>(<button key={idx} className={`btn btn-sm ${a.variant||'btn-outline-secondary'}`} onClick={()=>runAction(a,t)}>{a.label||'Action'}</button>))}
                </div>
              )}
            </div>
          );
        })}
        {(!data || !data.length) && <div className="text-muted small">No tickets</div>}
      </div>
    </Block>
  );
};
KdsTicketTemplate.craft = { props: { columns: 2, style: 'minimal', showHeader: true, showOrderMeta: true, showItems: true, showModifiers: true, showElapsed: true, warnS: 420, critS: 720, stationTheme: 'auto', headerLeftTpl: '{{orderType}}', headerRightTpl: '#{{orderNumber}}', showActions: false, actions: [{ label:'Hold', method:'POST', urlTpl:'/api/admin/actions/hold/{{orderId}}' }, { label:'Bump', method:'POST', urlTpl:'/api/admin/actions/bump/{{orderId}}' }] }, displayName: 'KdsTicketTemplate' };

export const KdsAllDay = ({ showMods = true, maxRows = 8, tickets }) => {
  tickets = Array.isArray(tickets) ? tickets : getTestTickets();
  const map = new Map();
  tickets.forEach((o) => (o.items || []).forEach((it) => {
    const key = it.name + '|' + (it.modifiers || []).join(',');
    map.set(key, (map.get(key) || 0) + (it.quantity || 0));
  }));
  let rows = Array.from(map.entries()).map(([k, v]) => ({ name: k.split('|')[0], mods: k.split('|')[1], qty: v })).sort((a, b) => b.qty - a.qty);
  if (!showMods) rows = rows.map((r) => ({ ...r, mods: '' }));
  rows = rows.slice(0, Math.max(1, maxRows|0));
  return (
    <Block>
      <div className="admin-section">
        <h6 className="mb-2">All Day</h6>
        <div className="table-responsive">
          <table className="table table-sm align-middle">
            <thead><tr><th>Item</th><th>Mods</th><th className="text-end">Qty</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}><td>{r.name}</td><td className="text-muted small">{r.mods}</td><td className="text-end fw-bold">{r.qty}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Block>
  );
};
KdsAllDay.craft = { props: { showMods: true, maxRows: 8 }, displayName: 'KdsAllDay' };

// ---- Admin/FOH generic blocks ----

export const DataTable = ({ url = '/api/admin', columns = [], refreshMs = 0 }) => {
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState(null);
  const [filters, setFilters] = React.useState({});
  React.useEffect(() => {
    const handler = (e) => { setFilters(e.detail || {}); };
    window.addEventListener('ds:filters', handler);
    return () => window.removeEventListener('ds:filters', handler);
  }, []);
  React.useEffect(() => {
    let active = true;
    const ctrl = new AbortController();
    (async () => {
      try {
        const qs = new URLSearchParams(filters).toString();
        const full = qs ? `${url}${url.includes('?')?'&':'?'}${qs}` : url;
        const json = await safeGet(full, ctrl.signal);
        // Heuristic: if columns omitted, pick first array in payload
        let list = [];
        const val = Object.values(json || {}).find((v) => Array.isArray(v));
        list = Array.isArray(val) ? val : [];
        if (active) setRows(list);
      } catch (e) { if (active) setErr(e.message || 'Load failed'); }
    })();
    let t;
    if (refreshMs > 0) t = setInterval(() => {
      const qs = new URLSearchParams(filters).toString();
      const full = qs ? `${url}${url.includes('?')?'&':'?'}${qs}` : url;
      safeGet(full).then((j)=>{
        const val = Object.values(j || {}).find((v)=>Array.isArray(v));
        setRows(Array.isArray(val) ? val : []);
      }).catch(()=>{});
    }, refreshMs);
    return () => { active = false; ctrl.abort(); if (t) clearInterval(t); };
  }, [url, refreshMs, filters]);
  const cols = Array.isArray(columns) && columns.length ? columns : (rows[0] ? Object.keys(rows[0]).slice(0,5).map((k)=>({ key:k, label:k })) : []);
  return (
    <Block>
      <div className="table-responsive">
        <table className="table table-sm align-middle table-hover">
          <thead><tr>{cols.map((c)=>(<th key={c.key}>{c.label}</th>))}</tr></thead>
          <tbody>
            {rows.map((r,i)=>(<tr key={i}>{cols.map((c)=>(<td key={c.key}>{String(r[c.key] ?? '')}</td>))}</tr>))}
            {!rows.length && (
              <tr><td colSpan={Math.max(1, cols.length)} className="text-muted">{err || 'No data'}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Block>
  );
};
DataTable.craft = { props: { url: '/api/admin', columns: [] }, displayName: 'DataTable' };

export const SimpleForm = ({ url = '/api/menu-items/1', method = 'PUT', fields = [], submitLabel = 'Submit' }) => {
  const [status, setStatus] = React.useState(null);
  const onSubmit = async (e) => {
    e.preventDefault(); setStatus(null);
    try {
      if (typeof url !== 'string' || !url.startsWith('/api/')) throw new Error('URL must start with /api/');
      const form = new FormData(e.currentTarget);
      const body = {};
      (fields||[]).forEach((f)=>{ body[f.name] = form.get(f.name) || ''; });
      const res = await fetch(url, { method: method || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      setStatus(res.ok ? 'Saved' : 'Failed');
    } catch (er) { setStatus(er.message || 'Failed'); }
  };
  return (
    <Block>
      <form onSubmit={onSubmit} className="row g-2">
        {(fields||[]).map((f)=> (
          <div key={f.name} className="col-md-4">
            <label className="form-label small">{f.label || f.name}</label>
            <input name={f.name} required={!!f.required} className="form-control form-control-sm" type={f.type || 'text'} />
          </div>
        ))}
        <div className="col-12">
          <button className="btn btn-sm btn-primary">{submitLabel}</button>
          {status && <span className="ms-2 small text-muted">{status}</span>}
        </div>
      </form>
    </Block>
  );
};
SimpleForm.craft = { props: { url: '/api/menu-items/1', method: 'PUT', fields: [{ name: 'is_available', label: 'Available', type: 'text' }] }, displayName: 'SimpleForm' };

// ButtonBar: safe actions to API endpoints
export const ButtonBar = ({ buttons = [] }) => {
  const run = async (b) => {
    try {
      if (!b?.url || !String(b.url).startsWith('/api/')) throw new Error('URL must start with /api/');
      if (b.confirm && !window.confirm(b.confirm)) return;
      const res = await fetch(b.url, { method: b.method || 'POST', headers: { 'Content-Type': 'application/json' }, body: b.body ? JSON.stringify(b.body) : undefined });
      alert(res.ok ? (b.success || 'Success') : (b.error || 'Request failed'));
    } catch (e) { alert(e.message || 'Request failed'); }
  };
  return (
    <Block>
      <div className="d-flex flex-wrap gap-2">
        {(buttons||[]).map((b,i)=> (
          <button key={i} className={`btn btn-sm ${b.variant||'btn-outline-primary'}`} onClick={()=>run(b)}>{b.label||'Action'}</button>
        ))}
      </div>
    </Block>
  );
};
ButtonBar.craft = { props: { buttons: [{ label: 'Refresh', method:'GET', url:'/api/admin', success:'Refreshed' }] }, displayName: 'ButtonBar' };

// Filters: publish query params used by DataTable
export const QueryFilters = ({ fields = [{ name:'q', label:'Search' }] }) => {
  const onSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    window.dispatchEvent(new CustomEvent('ds:filters', { detail: data }));
  };
  return (
    <Block>
      <form className="row g-2" onSubmit={onSubmit}>
        {(fields||[]).map((f,i)=> (
          <div key={i} className="col-md-3">
            <label className="form-label small">{f.label||f.name}</label>
            <input className="form-control form-control-sm" name={f.name} />
          </div>
        ))}
        <div className="col-12"><button className="btn btn-sm btn-primary">Apply</button></div>
      </form>
    </Block>
  );
};
QueryFilters.craft = { props: { fields: [{ name:'q', label:'Search' }] }, displayName: 'QueryFilters' };
