import React from 'react';
import { Editor, Frame, Element, useEditor } from '@craftjs/core';
import * as Blocks from './components';
import { useLayout } from '@/contexts/LayoutContext.jsx';
import { useConfirm } from '@/contexts/ConfirmContext.jsx';

function SaveButton() {
  const { query } = useEditor();
  const { saveLayout } = useLayout();
  return <button className="btn btn-sm btn-primary" onClick={() => saveLayout(query.serialize())}>Save Layout</button>;
}

function Palette({ target = 'kds' }) {
  const { connectors, actions, query } = useEditor();
  const [filter, setFilter] = React.useState('');
  const [favs, setFavs] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('ds_favorites') || '[]'); } catch { return []; }
  });
  const addQuick = (node) => {
    try {
      const tree = query.parseReactElement(node).toNodeTree();
      actions.addNodeTree(tree, 'ROOT');
    } catch {}
  };
  const toggleFav = (title) => {
    setFavs((prev) => {
      const next = prev.includes(title) ? prev.filter((x) => x !== title) : [...prev, title];
      try { localStorage.setItem('ds_favorites', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const ICONS = {
    'Header':'🧾', 'Ticket Grid':'🧩', 'All Day':'🧮', 'Ticket Template':'🎫',
    'Stack':'📦', 'Grid':'#', 'Data Table':'📋', 'Form':'✍️', 'Button Bar':'🛠️', 'Filters':'🔎',
    'Image':'🖼️', 'Video':'🎬', 'Map':'🗺️', 'Menu Section':'🍽️', 'Gallery':'🖼️', 'Testimonials':'💬', 'Contact Form':'📮'
  };
  const Item = ({ title, node }) => (
    <div className="d-flex align-items-center gap-2">
      <div
        ref={(ref) => ref && connectors.create(ref, node)}
        className="palette-item"
        title={`Add ${title}`}
        style={{ cursor: 'grab' }}
        onDoubleClick={() => addQuick(node)}
      >
        <span className="me-1">{ICONS[title]||'+'}</span> {title}
      </div>
      <button className={`btn btn-sm ${favs.includes(title) ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => toggleFav(title)} title={favs.includes(title) ? 'Unfavorite' : 'Favorite'}>★</button>
    </div>
  );
  const byTitle = (title) => title.toLowerCase().includes(filter.toLowerCase());
  return (
    <div>
      <input className="form-control form-control-sm mb-2" placeholder="Search components…" value={filter} onChange={(e)=>setFilter(e.target.value)} />
      <div className="d-flex flex-wrap gap-2 mb-3">
        {favs.length>0 && <div className="w-100 small text-muted">Favorites</div>}
        {favs.includes('Header') && byTitle('Header') && <Item title="Header" node={<Blocks.KdsHeader />} />}
        {target==='kds' && favs.includes('Ticket Grid') && byTitle('Ticket Grid') && <Item title="Ticket Grid" node={<Element is={Blocks.KdsTicketGrid} canvas={false} />} />}
        {target==='kds' && favs.includes('All Day') && byTitle('All Day') && <Item title="All Day" node={<Blocks.KdsAllDay />} />}
        {target==='kds' && favs.includes('Ticket Template') && byTitle('Ticket Template') && <Item title="Ticket Template" node={<Blocks.KdsTicketTemplate />} />}
        {favs.includes('Stack') && byTitle('Stack') && <Item title="Stack" node={<Element is={Blocks.Stack} canvas />} />}
        {favs.includes('Grid') && byTitle('Grid') && <Item title="Grid" node={<Element is={Blocks.Grid} canvas />} />}
        {(target==='admin' || target==='order') && favs.includes('Data Table') && byTitle('Data Table') && <Item title="Data Table" node={<Blocks.DataTable />} />}
        {(target==='admin' || target==='order') && favs.includes('Form') && byTitle('Form') && <Item title="Form" node={<Blocks.SimpleForm />} />}
        {(target==='admin' || target==='order') && favs.includes('Button Bar') && byTitle('Button Bar') && <Item title="Button Bar" node={<Blocks.ButtonBar />} />}
        {(target==='admin' || target==='order') && favs.includes('Filters') && byTitle('Filters') && <Item title="Filters" node={<Blocks.QueryFilters />} />}
      </div>
      <div className="d-flex flex-wrap gap-2 mb-2">
      {target !== 'admin' && <Item title="Header" node={<Blocks.KdsHeader />} />}
      {target === 'kds' && <Item title="Ticket Grid" node={<Element is={Blocks.KdsTicketGrid} canvas={false} />} />}
      {target === 'kds' && <Item title="All Day" node={<Blocks.KdsAllDay />} />}
      {target === 'kds' && <Item title="Ticket Template" node={<Blocks.KdsTicketTemplate />} />}
      <Item title="Stack" node={<Element is={Blocks.Stack} canvas />} />
      <Item title="Grid" node={<Element is={Blocks.Grid} canvas />} />
      <Item title="Image" node={<Blocks.ImageBlock />} />
      <Item title="Video" node={<Blocks.VideoEmbed />} />
      <Item title="Map" node={<Blocks.MapEmbed />} />
      <Item title="Menu Section" node={<Blocks.MenuSection />} />
      <Item title="Gallery" node={<Blocks.GalleryBlock />} />
      <Item title="Testimonials" node={<Blocks.TestimonialsSlider />} />
      <Item title="Contact Form" node={<Blocks.ContactForm />} />
      {(target === 'admin' || target === 'order') && (
        <>
          <Item title="Data Table" node={<Blocks.DataTable />} />
          <Item title="Form" node={<Blocks.SimpleForm />} />
          <Item title="Button Bar" node={<Blocks.ButtonBar />} />
          <Item title="Filters" node={<Blocks.QueryFilters />} />
        </>
      )}
      </div>
    </div>
  );
}

function Controls({ renderControls }) {
  const { query, actions } = useEditor();
  const { saveLayout, saveDraft, publishDraft } = useLayout();
  const { confirm } = useConfirm();
  const history = React.useRef([]);
  const snapshot = () => { try { history.current.push(query.serialize()); } catch {} };
  const undo = () => { if (!history.current.length) return; const prev = history.current.pop(); try { saveLayout(prev); } catch {} };
  React.useEffect(() => {
    const handler = (e) => {
      const isSave = (e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S');
      const isUndo = (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z');
      if (isSave) { e.preventDefault(); try { saveLayout(query.serialize()); } catch {} }
      if (isUndo) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [query, saveLayout]);
  if (typeof renderControls === 'function') {
    const clearScreen = async () => {
      try {
        const root = query.node('ROOT').get();
        const children = root?.data?.nodes || [];
        children.forEach((id) => actions.delete(id));
      } catch {}
    };
    const applyTemplate = async (...nodes) => {
      await clearScreen();
      nodes.forEach((node) => {
        try { const tree = query.parseReactElement(node).toNodeTree(); actions.addNodeTree(tree, 'ROOT'); } catch {}
      });
    };
    return renderControls({
      serialize: query.serialize,
      saveDraft: () => saveDraft(query.serialize()),
      publishDraft,
      applyTemplate,
    });
  }
  const clearScreen = async () => {
    const ok = await confirm('Clear everything from the screen?', { title: 'Clear screen', confirmText: 'Clear', variant: 'danger' });
    if (!ok) return;
    try {
      const root = query.node('ROOT').get();
      const children = root?.data?.nodes || [];
      children.forEach((id) => actions.delete(id));
    } catch {}
  };
  return (
    <div className="d-flex align-items-center justify-content-between mb-2">
      <Palette />
      <div className="d-flex gap-2">
        <button className="btn btn-sm btn-outline-secondary" onClick={snapshot} title="Snapshot for undo">Snapshot</button>
        <button className="btn btn-sm btn-outline-secondary" onClick={undo} title="Undo" disabled={!history.current.length}>Undo</button>
        <button className="btn btn-sm btn-outline-danger" onClick={clearScreen}>Clear screen</button>
        <SaveButton />
      </div>
    </div>
  );
}

export default function Builder({ renderControls, target = 'kds' }) {
  const { layout } = useLayout();
  const [zoom, setZoom] = React.useState(1);
  const defaultChildren = (
    target === 'kds' ? (
      <Element is={Blocks.Stack} canvas>
        <Blocks.KdsHeader />
        <Blocks.KdsTicketGrid />
        <Blocks.KdsAllDay />
      </Element>
    ) : (
      <Element is={Blocks.Stack} canvas>
        <Blocks.Grid />
      </Element>
    )
  );
  return (
    <Editor resolver={Blocks} key={`ed-${target}`}>
      <div className="builder-wrap">
        <Controls renderControls={renderControls} />
        <div className="builder-split">
          <aside className="builder-panel palette card-surface p-2">
            <div className="fw-bold mb-2">Add to screen</div>
            <div className="text-muted small mb-2">Drag a part into the screen area</div>
            <div className="palette-scroll">
              <Palette target={target} />
            </div>
          </aside>
          <section className="builder-canvas card-surface p-2">
            <div className="d-flex align-items-center justify-content-end gap-2 mb-2">
              <label className="small">Zoom</label>
              <input type="range" min="0.5" max="1.5" step="0.05" value={zoom} onChange={(e)=>setZoom(parseFloat(e.target.value))} style={{ width: 140 }} />
              <div className="small text-muted">{Math.round(zoom*100)}%</div>
            </div>
            <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0' }}>
              <Frame data={layout} key={`frame-${target}`}>
                {defaultChildren}
              </Frame>
            </div>
          </section>
          <aside className="builder-panel props card-surface p-2 property-panel">
            <ThemeControls />
            <PropertyPanel />
          </aside>
        </div>
      </div>
    </Editor>
  );
}

function PropertyPanel() {
  const { actions, selected } = useEditor((state, query) => {
    const [id] = state.events.selected;
    if (!id) return { selected: null };
    const node = state.nodes[id];
    return {
      selected: {
        id,
        name: node.data.displayName || node.data.name,
        props: node.data.props || {},
      },
    };
  });
  const { query, actions: editorActions } = useEditor();
  const [menuCats, setMenuCats] = React.useState([]);
  const [snippets, setSnippets] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('ds_snippets') || '[]'); } catch { return []; }
  });
  React.useEffect(() => { (async ()=>{ try { const r = await fetch('/api/order'); const j = await r.json(); setMenuCats(Array.isArray(j.categories) ? j.categories : []); } catch {} })(); }, []);

  if (!selected) return (
    <div className="card-surface p-2">
      <div className="text-muted">Select a part to change how it looks</div>
    </div>
  );

  const setProp = (updater) => actions.setProp(selected.id, updater);

  const number = (label, key, min, max, step = 1) => (
    <div className="mb-2">
      <label className="form-label small">{label}</label>
      <input type="number" className="form-control form-control-sm" value={selected.props[key] ?? ''} min={min} max={max} step={step}
        onChange={(e)=>setProp((p)=>{ p[key] = e.target.value === '' ? undefined : Number(e.target.value); })} />
    </div>
  );
  const slider = (label, key, min, max, step = 1) => (
    <div className="mb-2">
      <label className="form-label small d-flex justify-content-between"><span>{label}</span><span className="text-muted">{selected.props[key] ?? ''}</span></label>
      <input type="range" className="form-range" min={min} max={max} step={step} value={selected.props[key] ?? min}
        onChange={(e)=>setProp((p)=>{ p[key] = Number(e.target.value); })} />
    </div>
  );
  const text = (label, key) => (
    <div className="mb-2">
      <label className="form-label small">{label}</label>
      <input className="form-control form-control-sm" value={selected.props[key] ?? ''}
        onChange={(e)=>setProp((p)=>{ p[key] = e.target.value; })} />
    </div>
  );
  const select = (label, key, options) => (
    <div className="mb-2">
      <label className="form-label small">{label}</label>
      <select className="form-select form-select-sm" value={selected.props[key] ?? options[0].value}
        onChange={(e)=>setProp((p)=>{ p[key] = e.target.value; })}>
        {options.map((o)=> <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
  const toggle = (label, key) => (
    <div className="form-check form-switch mb-2">
      <input className="form-check-input" type="checkbox" id={`fld-${key}`} checked={!!selected.props[key]}
        onChange={(e)=>setProp((p)=>{ p[key] = e.target.checked; })} />
      <label className="form-check-label small" htmlFor={`fld-${key}`}>{label}</label>
    </div>
  );

  const renderFor = (name) => {
    switch ((name||'').toLowerCase()) {
      case 'kdsheader':
        return (
          <>
            {text('Header text', 'text')}
            {toggle('Show clock', 'showClock')}
            {select('Header position', 'align', [
              { value: 'flex-start', label: 'Left' },
              { value: 'center', label: 'Center' },
              { value: 'space-between', label: 'Spread out' },
              { value: 'flex-end', label: 'Right' },
            ])}
          </>
        );
      case 'kdsticketgrid':
        return (
          <>
            {select('Display mode', 'mode', [ { value: 'tickets', label: 'Tickets' }, { value: 'items-list', label: 'Items list' } ])}
            {select('Tile arrangement', 'layout', [ { value: 'grid', label: 'Grid' }, { value: 'list', label: 'List' } ])}
            {select('Tile size', 'density', [ { value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' } ])}
            {select('Screen type', 'stationType', [ { value: 'prep', label: 'Prep' }, { value: 'expo', label: 'Expo' } ])}
            {slider('Tile width (px)', 'cardMin', 200, 420, 10)}
            {toggle('Show elapsed', 'showElapsed')}
            {toggle('Show notes', 'showSpecial')}
            {toggle('Show allergy', 'showAllergy')}
          </>
        );
      case 'kdstickettemplate':
        return (
          <>
            {number('Columns', 'columns', 1, 4, 1)}
            {select('Style', 'style', [ { value: 'minimal', label: 'Minimal' }, { value: 'detailed', label: 'Detailed' } ])}
            {toggle('Show header', 'showHeader')}
            {toggle('Show order #', 'showOrderMeta')}
            {toggle('Show items', 'showItems')}
            {toggle('Show modifiers', 'showModifiers')}
            {toggle('Show elapsed', 'showElapsed')}
            {number('Warn at (s)', 'warnS', 0, 3600, 10)}
            {number('Critical at (s)', 'critS', 0, 3600, 10)}
            {select('Station theme', 'stationTheme', [ { value: 'auto', label: 'Auto' }, { value: 'expo', label: 'Expo' }, { value: 'prep', label: 'Prep' } ])}
            {text('Header left template', 'headerLeftTpl')}
            {text('Header right template', 'headerRightTpl')}
            {toggle('Show actions', 'showActions')}
          </>
        );
      case 'kdsallday':
        return (
          <>
            {toggle('Show modifiers', 'showMods')}
            {number('Max rows', 'maxRows', 1, 50, 1)}
          </>
        );
      case 'datatable':
        return (
          <>
            {text('API URL', 'url')}
            {number('Refresh (ms)', 'refreshMs', 0, 60000, 1000)}
          </>
        );
      case 'simpleform':
        return (
          <>
            {text('API URL', 'url')}
            {text('HTTP Method', 'method')}
          </>
        );
      case 'grid':
      case 'stack':
        return slider('Spacing between parts', 'gap', 0, 32, 1);
      case 'image':
        return (
          <>
            {text('Image URL', 'src')}
            {text('Alt text', 'alt')}
            {text('Width (e.g., 100%, 320px)', 'width')}
          </>
        );
      case 'video':
        return (
          <>
            {text('Embed URL', 'url')}
            {number('Height (px)', 'height', 120, 1200, 10)}
          </>
        );
      case 'map':
        return (
          <>
            {text('Embed URL', 'url')}
            {number('Height (px)', 'height', 120, 1200, 10)}
          </>
        );
      case 'menusection':
        return (
          <>
            <div className="mb-2">
              <label className="form-label small">Category</label>
              <select className="form-select form-select-sm" value={selected.props.categoryId ?? ''}
                onChange={(e)=>setProp((p)=>{ p.categoryId = e.target.value; })}>
                <option value="">All categories</option>
                {menuCats.map((c)=> (<option key={c.id} value={c.id}>{c.name}</option>))}
              </select>
            </div>
            {number('Columns', 'columns', 1, 4, 1)}
            {toggle('Show images', 'showImages')}
          </>
        );
      case 'galleryblock':
        return (
          <>
            {text('Image URLs (comma-separated)', 'images')}
            {number('Height (px)', 'height', 120, 1200, 10)}
            {number('Interval (ms)', 'intervalMs', 1000, 60000, 100)}
          </>
        );
      case 'testimonialsslider':
        return (
          <>
            {text('Testimonials (quote|author per line)', 'itemsText')}
            {number('Interval (ms)', 'intervalMs', 1000, 60000, 100)}
          </>
        );
      case 'contactform':
        return (
          <>
            {text('Submit URL', 'url')}
            {text('Success message', 'success')}
          </>
        );
      default:
        return <div className="text-muted">No settings for this part yet</div>;
    }
  };

  return (
    <div className="card-surface p-2">
      <div className="fw-bold mb-2">Settings</div>
      {renderFor(selected.name)}
      {/* Snippets */}
      <div className="border-top mt-2 pt-2">
        <div className="fw-bold small mb-1">Snippets</div>
        <div className="d-flex gap-2 mb-2">
          <button className="btn btn-sm btn-outline-primary" onClick={() => {
            const name = prompt('Save snippet as'); if (!name) return;
            try {
              const build = (id) => {
                const node = query.node(id).get();
                if (!node || !node.data) return null;
                const type = node.data.displayName || node.data.name;
                const props = node.data.props || {};
                const children = (node.data.nodes || []).map((cid) => build(cid)).filter(Boolean);
                return { type, props, children };
              };
              const tree = build(selected.id);
              if (!tree) return;
              const next = [...snippets.filter((s)=> s.name !== name), { name, tree }];
              setSnippets(next);
              localStorage.setItem('ds_snippets', JSON.stringify(next));
            } catch {}
          }}>Save snippet…</button>
        </div>
        <div>
          {snippets.map((s) => (
            <div key={s.name} className="d-flex align-items-center justify-content-between mb-1">
              <div className="small">{s.name}</div>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-primary" onClick={() => {
                  try {
                    const canvases = new Set(['Stack','Grid']);
                    const toEl = (n) => {
                      const Comp = Blocks[n.type];
                      if (!Comp) return null;
                      const kids = (n.children||[]).map(toEl).filter(Boolean);
                      if (canvases.has(n.type)) return (<Element is={Comp} canvas>{kids}</Element>);
                      return React.createElement(Comp, n.props || {}, kids);
                    };
                    const el = toEl(s.tree);
                    if (!el) return;
                    const tree = query.parseReactElement(el).toNodeTree();
                    editorActions.addNodeTree(tree, 'ROOT');
                  } catch {}
                }}>Insert</button>
                <button className="btn btn-sm btn-outline-danger" onClick={() => {
                  const next = snippets.filter((x)=> x.name !== s.name);
                  setSnippets(next);
                  localStorage.setItem('ds_snippets', JSON.stringify(next));
                }}>Delete</button>
              </div>
            </div>
          ))}
          {!snippets.length && <div className="text-muted small">No snippets saved</div>}
        </div>
      </div>
      <div className="border-top mt-2 pt-2">
        <div className="fw-bold small mb-1">Visibility</div>
        <div className="row g-2">
          <div className="col-6">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="hidePhone" checked={!!selected.props.hideOnPhone} onChange={(e)=>setProp((p)=>{ p.hideOnPhone = e.target.checked; })} />
              <label className="form-check-label small" htmlFor="hidePhone">Hide on phone</label>
            </div>
          </div>
          <div className="col-6">
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="hideTablet" checked={!!selected.props.hideOnTablet} onChange={(e)=>setProp((p)=>{ p.hideOnTablet = e.target.checked; })} />
              <label className="form-check-label small" htmlFor="hideTablet">Hide on tablet</label>
            </div>
          </div>
        </div>
      </div>
      <div className="border-top mt-2 pt-2">
        <div className="fw-bold small mb-1">Animation</div>
        <div className="row g-2">
          <div className="col-6">
            <label className="form-label small">Effect</label>
            <select className="form-select form-select-sm" value={selected.props.anim || ''} onChange={(e)=>setProp((p)=>{ p.anim = e.target.value; })}>
              <option value="">None</option>
              <option value="fade-in">Fade in</option>
              <option value="slide-up">Slide up</option>
            </select>
          </div>
          <div className="col-3">
            <label className="form-label small">Duration (ms)</label>
            <input type="number" className="form-control form-control-sm" value={selected.props.duration ?? 300} onChange={(e)=>setProp((p)=>{ p.duration = parseInt(e.target.value||'0',10)||0; })} />
          </div>
          <div className="col-3">
            <label className="form-label small">Delay (ms)</label>
            <input type="number" className="form-control form-control-sm" value={selected.props.delay ?? 0} onChange={(e)=>setProp((p)=>{ p.delay = parseInt(e.target.value||'0',10)||0; })} />
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-end mt-3">
        <button className="btn btn-sm btn-outline-danger" onClick={() => actions.delete(selected.id)}>Remove this part</button>
      </div>
    </div>
  );
}
function ThemeControls() {
  const [accent, setAccent] = React.useState('#0d6efd');
  const [surface, setSurface] = React.useState('#f8f9fa');
  const [background, setBackground] = React.useState('#ffffff');
  const [text, setText] = React.useState('#212529');
  const [radius, setRadius] = React.useState(8);
  const [uiSize, setUiSize] = React.useState('cozy');
  const apply = () => {
    const root = document.documentElement;
    try {
      root.style.setProperty('--token-color-accent', accent);
      root.style.setProperty('--token-color-surface', surface);
      root.style.setProperty('--token-color-background', background);
      root.style.setProperty('--token-color-text', text);
      root.style.setProperty('--token-radius-card', radius + 'px');
      const sizeMap = { compact: '95%', cozy: '100%', airy: '112%' };
      root.style.fontSize = sizeMap[uiSize] || '100%';
    } catch {}
  };
  const save = async () => {
    try {
      const body = { color: { accent: { $value: accent }, surface: { $value: surface }, background: { $value: background }, text: { $value: text } }, radius: { card: { $value: radius + 'px' } } };
      const res = await fetch('/api/tokens', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      alert(res.ok ? 'Theme saved' : 'Save failed');
    } catch { alert('Save failed'); }
  };
  React.useEffect(apply, []);
  return (
    <div className="card-surface p-2 mb-2">
      <div className="fw-bold small mb-2">Theme</div>
      <div className="row g-2">
        <div className="col-6">
          <label className="form-label small">Accent</label>
          <input type="color" className="form-control form-control-color" value={accent} onChange={(e)=>setAccent(e.target.value)} onBlur={apply} />
        </div>
        <div className="col-6">
          <label className="form-label small">Text</label>
          <input type="color" className="form-control form-control-color" value={text} onChange={(e)=>setText(e.target.value)} onBlur={apply} />
        </div>
        <div className="col-6">
          <label className="form-label small">Surface</label>
          <input type="color" className="form-control form-control-color" value={surface} onChange={(e)=>setSurface(e.target.value)} onBlur={apply} />
        </div>
        <div className="col-6">
          <label className="form-label small">Background</label>
          <input type="color" className="form-control form-control-color" value={background} onChange={(e)=>setBackground(e.target.value)} onBlur={apply} />
        </div>
        <div className="col-12">
          <label className="form-label small">Corners</label>
          <input type="range" min="0" max="20" value={radius} onChange={(e)=>{ setRadius(parseInt(e.target.value,10)||0); }} onMouseUp={apply} />
        </div>
        <div className="col-12">
          <label className="form-label small me-2">UI Size</label>
          <div className="btn-group btn-group-sm" role="group">
            {['compact','cozy','airy'].map((s)=>(<button type="button" key={s} className={`btn ${uiSize===s?'btn-primary':'btn-outline-secondary'}`} onClick={()=>{ setUiSize(s); apply(); }}>{s[0].toUpperCase()+s.slice(1)}</button>))}
          </div>
        </div>
        <div className="col-12 d-flex gap-2 mt-2">
          <button className="btn btn-sm btn-outline-secondary" onClick={apply}>Preview</button>
          <button className="btn btn-sm btn-primary" onClick={save}>Save Theme</button>
        </div>
      </div>
    </div>
  );
}
