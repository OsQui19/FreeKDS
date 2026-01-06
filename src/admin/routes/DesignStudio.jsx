import React, { useMemo, useState, useEffect } from 'react';
import StudioFlagsPanel from '@/admin/components/StudioFlagsPanel.jsx';
import { TicketGrid } from '@/../packages/renderers/index.js';
import { LayoutProvider } from '@/contexts/LayoutContext.jsx';
import Builder from '@/features/LayoutBuilder/Builder.jsx';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import Renderer from '@/features/LayoutBuilder/Renderer.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import * as BuilderBlocks from '@/features/LayoutBuilder/components.jsx';
import { Element } from '@craftjs/core';

// No default tickets; users can run a test to generate

export default function DesignStudioRoute() {
  const { push } = useToast();
  const [stationType, setStationType] = useState('prep');
  const [density, setDensity] = useState('comfortable');
  const [layout, setLayout] = useState('grid');
  const [takeoutOnly, setTakeoutOnly] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderTarget, setBuilderTarget] = useState('kds');
  const [pageKey, setPageKey] = useState('page:order');
  const [themeInBuilder, setThemeInBuilder] = useState(false);
  const [cardMin, setCardMin] = useState(280);
  const [stationId, setStationId] = useState('');
  const [layoutName, setLayoutName] = useState('default');
  const [layoutNames, setLayoutNames] = useState(['default']);
  const [tokenPresets, setTokenPresets] = useState([]); // kept for future but not shown inline
  const [themeScope, setThemeScope] = useState('global'); // global | screen
  const [previewWidth, setPreviewWidth] = useState(1024);
  const [target, setTarget] = useState('kds'); // 'kds' | 'order' | 'admin'
  const [previewEnabled, setPreviewEnabled] = useState(false);
  // KDS options (token-driven)
  const [kdsShowSidebar, setKdsShowSidebar] = useState(() => {
    try { return document.documentElement.style.getPropertyValue('--token-kds-showSidebar') === '1'; } catch { return false; }
  });
  const [kdsSelectBorder, setKdsSelectBorder] = useState(() => {
    try { return getComputedStyle(document.documentElement).getPropertyValue('--token-kds-selectBorder').trim() || '#0d6efd'; } catch { return '#0d6efd'; }
  });
  const [kdsShowChips, setKdsShowChips] = useState(() => {
    try { return getComputedStyle(document.documentElement).getPropertyValue('--token-kds-expo-showChips').trim() === '1'; } catch { return true; }
  });
  const [kdsReadyDecoration, setKdsReadyDecoration] = useState(() => {
    try { return getComputedStyle(document.documentElement).getPropertyValue('--token-kds-readyDecoration').trim() || 'line-through'; } catch { return 'line-through'; }
  });
  const [kdsReadyOpacity, setKdsReadyOpacity] = useState(() => {
    try { const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--token-kds-readyOpacity')); return Number.isFinite(v) ? v : 0.75; } catch { return 0.75; }
  });
  const [testTickets, setTestTickets] = useState([]);
  const [testOpen, setTestOpen] = useState(false);
  const [menuData, setMenuData] = useState(null);
  const [pickerCat, setPickerCat] = useState('');
  const [pickerQty, setPickerQty] = useState({});
  const [scenarios, setScenarios] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('ds_scenarios')||'[]'); } catch { return []; }
  });
  const [showHistory, setShowHistory] = useState(false);
  const [versions, setVersions] = useState([]);

  const tickets = useMemo(() => {
    const base = Array.isArray(testTickets) ? testTickets : [];
    return takeoutOnly
      ? base.filter((t) => String(t.orderType || '').toUpperCase().includes('TO-GO'))
      : base;
  }, [takeoutOnly, testTickets]);

  // Theme controls
  const { themeName, setThemeName, toggleTheme } = useTheme();

  // Reset preview data when switching targets
  useEffect(() => { setPreviewEnabled(false); setTestTickets([]); try { window.__DS_TEST_TICKETS__ = []; } catch {} }, [target]);

  // Expose tickets globally for builder blocks
  useEffect(() => { try { window.__DS_TEST_TICKETS__ = testTickets || []; } catch {} }, [testTickets]);

  // Auto-open test modal for KDS builder if no tickets, and load menu
  useEffect(() => {
    if (isBuilderOpen && builderTarget === 'kds' && (!testTickets || !testTickets.length)) {
      setTestOpen(true);
    }
  }, [isBuilderOpen, builderTarget, testTickets]);
  useEffect(() => {
    if (builderTarget === 'order') setPageKey('page:order');
    if (builderTarget === 'admin') setPageKey('page:admin-overview');
  }, [builderTarget]);
  useEffect(() => {
    if (testOpen && !menuData) {
      (async ()=>{
        try { const r = await fetch('/api/admin'); const j = await r.json(); setMenuData(j); setPickerCat(String(j.categories?.[0]?.id||'')); }
        catch {_=>{}}
      })();
    }
  }, [testOpen, menuData]);

  // Load saved layout names for CRUD and theme presets
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/layout/names');
        const json = await res.json();
        if (Array.isArray(json.names) && json.names.length) {
          setLayoutNames(json.names);
          if (!json.names.includes(layoutName)) setLayoutName(json.names[0]);
        }
      } catch {}
    })();
    (async () => {
      try {
        const r = await fetch('/api/presets/tokens');
        const j = await r.json();
        setTokenPresets(j.presets || []);
      } catch {}
    })();
  }, []);

  async function refreshNames() {
    try { const r = await fetch('/api/layout/names'); const j = await r.json(); if (Array.isArray(j.names)) setLayoutNames(j.names); } catch {}
  }

  async function saveCurrentLayout(serializeFn) {
    try {
      const layoutJson = serializeFn ? serializeFn() : null;
      const body = { name: layoutName };
      if (layoutJson) body.layout = layoutJson;
      else return;
      const res = await fetch('/api/layout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      push(res.ok ? 'Layout saved' : 'Save failed', { variant: res.ok ? 'success' : 'danger' });
      await refreshNames();
    } catch { push('Save failed', { variant: 'danger' }); }
  }

  async function saveAs(serializeFn, newName) {
    if (!newName || !newName.trim()) return;
    setLayoutName(newName.trim());
    await saveCurrentLayout(serializeFn);
  }

  async function deleteLayout(name) {
    if (!name) return;
    const res = await fetch(`/api/layout?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    await refreshNames();
    if (layoutName === name) setLayoutName('default');
    push(res.ok ? 'Layout deleted' : 'Delete failed', { variant: res.ok ? 'success' : 'danger' });
  }

  async function openHistory() {
    try {
      const r = await fetch(`/api/layout/versions?name=${encodeURIComponent(layoutName)}`);
      const j = await r.json();
      setVersions(j.versions || []);
      setShowHistory(true);
    } catch { setVersions([]); setShowHistory(true); }
  }

  async function restoreVersion(id) {
    try {
      const res = await fetch('/api/layout/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: layoutName }) });
      push(res.ok ? 'Layout restored' : 'Restore failed', { variant: res.ok ? 'success' : 'danger' });
      setShowHistory(false);
    } catch { push('Restore failed', { variant: 'danger' }); }
  }

  // Quick style buttons for preview (does not persist)
  const applyQuick = (preset) => {
    const root = document.documentElement;
    switch (preset) {
      case 'cozy':
        setDensity('comfortable'); setCardMin(300);
        root.style.setProperty('--token-color-surface', '#fbfbfc');
        root.style.setProperty('--token-color-background', '#ffffff');
        root.style.setProperty('--token-color-accent', '#5b8def');
        break;
      case 'compact':
        setDensity('compact'); setCardMin(260);
        root.style.setProperty('--token-color-surface', '#ffffff');
        root.style.setProperty('--token-color-background', '#f7f7f7');
        root.style.setProperty('--token-color-accent', '#0d6efd');
        break;
      case 'high-contrast':
        setDensity('comfortable'); setCardMin(300);
        root.style.setProperty('--token-color-surface', '#ffffff');
        root.style.setProperty('--token-color-background', '#f0f0f0');
        root.style.setProperty('--token-color-accent', '#111827');
        break;
      default:
        break;
    }
  };

  return (
    <div className="studio-container">
      <div className="studio-toolbar">
        <div className="studio-title">Design Studio</div>
        <div className="sbtn-group me-2" role="group" aria-label="Theme">
          <button className={`sbtn ${themeName==='light'?'active':''}`} onClick={()=>setThemeName('light')}>Light</button>
          <button className={`sbtn ${themeName==='dark'?'active':''}`} onClick={()=>setThemeName('dark')}>Dark</button>
        </div>
        {target==='kds' && (
          <div className="sgrp">
            <label className="small">KDS Options</label>
            <div className="form-check form-switch ms-2">
              <input className="form-check-input" id="kdsSidebar" type="checkbox" checked={kdsShowSidebar} onChange={(e)=>setKdsShowSidebar(e.target.checked)} />
              <label className="form-check-label small" htmlFor="kdsSidebar">Summary sidebar</label>
            </div>
            <div className="d-inline-flex align-items-center gap-2 ms-2">
              <label className="small">Select border</label>
              <input type="color" value={kdsSelectBorder} onChange={(e)=>setKdsSelectBorder(e.target.value)} />
              <button className="sbtn" title="Apply to tokens" onClick={async ()=>{
                try {
                  const qs = stationId ? `?stationId=${encodeURIComponent(stationId)}` : '';
                  const body = { kds: { showSidebar: { value: kdsShowSidebar ? 1 : 0 }, selectBorder: { value: kdsSelectBorder }, readyDecoration: { value: kdsReadyDecoration }, readyOpacity: { value: kdsReadyOpacity }, expo: { showChips: { value: kdsShowChips ? 1 : 0 } } } };
                  const res = await fetch(`/api/tokens${qs}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                  if (res.ok) {
                    // Reflect immediately
                    const root = document.documentElement;
                    root.style.setProperty('--token-kds-showSidebar', kdsShowSidebar ? '1' : '0');
                    root.style.setProperty('--token-kds-selectBorder', kdsSelectBorder);
                    root.style.setProperty('--token-kds-readyDecoration', kdsReadyDecoration);
                    root.style.setProperty('--token-kds-readyOpacity', String(kdsReadyOpacity));
                    root.style.setProperty('--token-kds-expo-showChips', kdsShowChips ? '1' : '0');
                    push('KDS tokens applied', { variant: 'success' });
                  } else push('Failed to apply KDS tokens', { variant: 'danger' });
                } catch { push('Failed to apply KDS tokens', { variant: 'danger' }); }
              }}>Apply</button>
            </div>
            <div className="d-inline-flex align-items-center gap-2 ms-2">
              <label className="small">Cross‑out</label>
              <select className="form-select form-select-sm" style={{ width: 140 }} value={kdsReadyDecoration} onChange={(e)=>setKdsReadyDecoration(e.target.value)}>
                <option value="line-through">Line through</option>
                <option value="none">No line</option>
              </select>
              <label className="small">Dim</label>
              <input type="range" min="0" max="1" step="0.05" value={kdsReadyOpacity} onChange={(e)=>setKdsReadyOpacity(parseFloat(e.target.value))} style={{ width: 100 }} />
              <div className="small text-muted" style={{ width: 40, textAlign: 'right' }}>{kdsReadyOpacity.toFixed(2)}</div>
            </div>
            <div className="form-check form-switch ms-2">
              <input className="form-check-input" id="kdsShowChips" type="checkbox" checked={kdsShowChips} onChange={(e)=>setKdsShowChips(e.target.checked)} />
              <label className="form-check-label small" htmlFor="kdsShowChips">Show station progress chips</label>
            </div>
          </div>
        )}
        <div className="sbtn-group me-2" role="group" aria-label="Screen">
          <button className={`sbtn ${target==='kds'?'active':''}`} onClick={()=>{ setTarget('kds'); setPreviewEnabled(true); }}>KDS</button>
          <button className={`sbtn ${target==='order'?'active':''}`} onClick={()=>{ setTarget('order'); setPreviewEnabled(false); }}>Order</button>
          <button className={`sbtn ${target==='admin'?'active':''}`} onClick={()=>{ setTarget('admin'); setPreviewEnabled(false); }}>Admin</button>
        </div>
        <label className="small">Device</label>
        <select className="form-select form-select-sm sctrl" value={previewWidth} onChange={(e)=>setPreviewWidth(parseInt(e.target.value,10))} title="Change preview size">
          <option value={360}>Phone</option>
          <option value={414}>Phone (large)</option>
          <option value={768}>Tablet</option>
          <option value={1024}>Large tablet</option>
          <option value={1280}>Desktop</option>
          <option value={1440}>Wide</option>
        </select>
        <label className="small">Screen</label>
        <select className="form-select form-select-sm sctrl" value={stationType} onChange={(e)=>setStationType(e.target.value)}>
          <option value="prep">Prep</option>
          <option value="expo">Expo</option>
        </select>
        <input className="form-control form-control-sm sctrl sctrl-xs" placeholder="Screen ID" value={stationId} onChange={(e)=>setStationId(e.target.value)} />
        {target==='kds' && (<><label className="small">Tiles</label>
        <select className="form-select form-select-sm sctrl" value={layout} onChange={(e)=>setLayout(e.target.value)}>
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
        <select className="form-select form-select-sm sctrl sctrl-xs" value={density} onChange={(e)=>setDensity(e.target.value)}>
          <option value="comfortable">Comfortable</option>
          <option value="compact">Compact</option>
        </select>
        <input type="number" className="form-control form-select-sm sctrl sctrl-xs" value={cardMin} onChange={(e)=>setCardMin(parseInt(e.target.value||'0',10)||280)} title="Tile width (px)" />
        <div className="form-check form-switch ms-2">
          <input className="form-check-input" type="checkbox" id="toggleTakeout" checked={takeoutOnly} onChange={(e)=>setTakeoutOnly(e.target.checked)} />
          <label className="form-check-label small" htmlFor="toggleTakeout">Takeout only</label>
        </div>
        <div className="form-check form-switch ms-2">
          <input className="form-check-input" type="checkbox" id="togglePreview" checked={previewEnabled} onChange={(e)=>setPreviewEnabled(e.target.checked)} />
          <label className="form-check-label small" htmlFor="togglePreview">Show preview</label>
        </div></>)}
        <div className="studio-spacer"></div>
        <button className="sbtn primary" onClick={()=>{ setBuilderTarget(target); setIsBuilderOpen(true); }}>Open Builder</button>
        <button className="sbtn" onClick={()=>setTestOpen(true)}>Test Order</button>
        <button className="sbtn danger" onClick={()=>{ setPreviewEnabled(false); setTestTickets([]); try { window.__DS_TEST_TICKETS__ = []; } catch {} }}>Clear Preview</button>
        <button className="sbtn" onClick={openHistory}>History</button>
      </div>

      <div className="studio-canvas">
        <div className="d-flex align-items-center gap-2 mb-2">
          <label className="small">Layout</label>
          <select className="form-select form-select-sm" value={layoutName} onChange={(e)=>setLayoutName(e.target.value)}>
            {layoutNames.map((n)=> <option key={n} value={n}>{n}</option>)}
          </select>
          {/* Builder actions moved to toolbar modal */}
        </div>
        {
          target==='kds' && previewEnabled ? (
            <div className="kds-screen" style={{ ['--kds-card-min']: `${cardMin}px`, maxWidth: `${previewWidth}px`, margin: '0 auto' }}>
              <TicketGrid tickets={tickets} stationType={stationType} density={density} layout={layout} onBump={()=>{}} />
            </div>
          ) : (
            <div className="card-surface p-3 text-muted" style={{ maxWidth: `${previewWidth}px`, margin: '0 auto' }}>
              {target==='kds' ? 'Preview hidden — switch to Builder to edit, or enable Show preview.' : 'Design this screen in Builder mode. Components for Order/Admin can be added via the Builder palette.'}
            </div>
          )
        }
      </div>

      <div className="row g-3">
        
        <div className="col-12 col-xl-4">
          <div className="admin-section">
            <h5 className="mb-3">Feature Flags</h5>
            <StudioFlagsPanel stationId={stationId} />
          </div>
        </div>
      </div>

      {isBuilderOpen && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Builder</h5>
                <div className="ms-2 sbtn-group" role="group" aria-label="Builder target">
                  <button className={`sbtn ${builderTarget==='kds'?'active':''}`} onClick={()=>setBuilderTarget('kds')}>KDS</button>
                  <button className={`sbtn ${builderTarget==='order'?'active':''}`} onClick={()=>setBuilderTarget('order')}>Order</button>
                  <button className={`sbtn ${builderTarget==='admin'?'active':''}`} onClick={()=>setBuilderTarget('admin')}>Admin</button>
                </div>
                {(builderTarget==='order' || builderTarget==='admin') && (
                  <div className="d-flex align-items-center gap-2 ms-3">
                    <label className="small">Page Key</label>
                    <input className="form-control form-control-sm" style={{ width: 220 }} value={pageKey} onChange={(e)=>setPageKey(e.target.value)} />
                  </div>
                )}
                
                <button type="button" className="btn-close" aria-label="Close" onClick={()=>setIsBuilderOpen(false)}></button>
              </div>
              <div className="modal-body">
                <LayoutProvider name={(builderTarget==='kds') ? `${layoutName}:${builderTarget}` : pageKey} stationId={builderTarget==='kds' && stationId ? parseInt(stationId,10): undefined}>
                  <div className="row g-3">
                    <div className="col-12 col-lg-7">
                      <div className="card-surface p-2">
                        <Builder target={builderTarget} renderControls={({ saveDraft, publishDraft, serialize, applyTemplate }) => (
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex gap-2">
                              <div className="dropdown">
                                <button className="sbtn dropdown-toggle" data-bs-toggle="dropdown">Templates</button>
                                <ul className="dropdown-menu">
                                  <li><button className="dropdown-item" onClick={() => applyTemplate(
                                    (<Element is={BuilderBlocks.Stack} canvas>
                                      <BuilderBlocks.KdsHeader />
                                      <Element is={BuilderBlocks.Grid} canvas>
                                        <BuilderBlocks.KdsTicketGrid />
                                      </Element>
                                    </Element>)
                                  )}>KDS: Header + Grid</button></li>
                                  <li><button className="dropdown-item" onClick={() => applyTemplate(
                                    (<Element is={BuilderBlocks.Stack} canvas>
                                      <BuilderBlocks.KdsHeader />
                                      <BuilderBlocks.KdsAllDay />
                                      <BuilderBlocks.KdsTicketGrid />
                                    </Element>)
                                  )}>KDS: Header + All Day + Grid</button></li>
                                </ul>
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              <button className="sbtn" onClick={saveDraft}>Save Draft</button>
                              <button className="sbtn primary" onClick={publishDraft}>Publish</button>
                              <button className="sbtn" onClick={()=>{ const n = prompt('Save as (new layout name)'); if (n) saveAs(serialize, n); }}>Save as…</button>
                            </div>
                          </div>
                        )} />
                      </div>
                    </div>
                    <div className="col-12 col-lg-5">
                      <div className="card-surface p-2">
                        <Renderer />
                      </div>
                    </div>
                    
                  </div>
                </LayoutProvider>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setIsBuilderOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {testOpen && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header"><h5 className="modal-title">Run Test Order</h5><button type="button" className="btn-close" aria-label="Close" onClick={()=>setTestOpen(false)}></button></div>
              <div className="modal-body">
                <p className="small text-muted">Generate a temporary order to preview tiles. Choose menu-driven sample, randomize, or quick dummy data. This does not persist.</p>
        <div className="d-flex flex-wrap gap-2 mb-3">
                  <button className="btn btn-outline-primary" onClick={async ()=>{
                    try {
                      const res = await fetch('/api/admin');
                      const json = await res.json();
                      const items = [];
                      (json.categories||[]).forEach((c)=> (c.items||[]).slice(0,1).forEach((it)=> items.push({ name: it.name, quantity: 1 })));
                      const now = Math.floor(Date.now()/1000);
                      setTestTickets([{ orderId: 5001, orderNumber: 'T5001', orderType: 'TO-GO', createdTs: now-120, items: items.slice(0,5) }]);
                      setPreviewEnabled(true); setTestOpen(false);
                    } catch { /* ignore */ }
                  }}>Sample from Menu</button>
                  <button className="btn btn-outline-success" onClick={async ()=>{
                    try {
                      const res = await fetch('/api/admin');
                      const json = await res.json();
                      const cats = (json.categories||[]).filter(c=>Array.isArray(c.items)&&c.items.length);
                      const pick = (arr)=> arr[Math.floor(Math.random()*arr.length)];
                      const count = 2 + Math.floor(Math.random()*5);
                      const items = [];
                      for (let i=0;i<count;i++) {
                        const c = pick(cats);
                        const it = pick(c.items);
                        items.push({ name: it.name, quantity: 1 + Math.floor(Math.random()*3) });
                      }
                      const types = ['TO-GO','DINE-IN','CURBSIDE'];
                      const now = Math.floor(Date.now()/1000);
                      setTestTickets([{ orderId: 7000 + Math.floor(Math.random()*1000), orderNumber: 'R'+(7000 + Math.floor(Math.random()*1000)), orderType: pick(types), createdTs: now - (30 + Math.floor(Math.random()*300)), items }]);
                      setPreviewEnabled(true); setTestOpen(false);
                    } catch { /* ignore */ }
                  }}>Randomize</button>
                  <button className="btn btn-outline-secondary" onClick={()=>{
                    const now = Math.floor(Date.now()/1000);
                    setTestTickets([{ orderId: 9001, orderNumber: 'D9001', orderType: 'DINE-IN', createdTs: now-60, items: [ { name: 'Test Item A', quantity: 2 }, { name: 'Test Item B', quantity: 1 } ] }]);
                    setPreviewEnabled(true); setTestOpen(false);
                  }}>Use Dummy Data</button>
                  <button className="btn btn-outline-dark" onClick={()=>{
                    if (!testTickets || !testTickets.length) { alert('Create test data first'); return; }
                    const name = prompt('Save scenario as:');
                    if (!name) return;
                    const next = [...scenarios.filter(s=>s.name!==name), { name, tickets: testTickets }];
                    setScenarios(next);
                    try { localStorage.setItem('ds_scenarios', JSON.stringify(next)); } catch {}
                  }}>Save Scenario</button>
                  <button className="btn btn-outline-secondary" onClick={()=>{
                    try {
                      const data = JSON.stringify(scenarios||[], null, 2);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = 'ds-scenarios.json'; a.click(); URL.revokeObjectURL(url);
                    } catch {}
                  }}>Export Scenarios</button>
                  <label className="btn btn-outline-secondary mb-0">
                    Import Scenarios
                    <input type="file" accept="application/json" hidden onChange={async (e)=>{
                      const file = e.target.files?.[0]; if (!file) return; try { const text = await file.text(); const arr = JSON.parse(text); if (Array.isArray(arr)) { setScenarios(arr); localStorage.setItem('ds_scenarios', JSON.stringify(arr)); } } catch { alert('Invalid file'); }
                    }} />
                  </label>
                </div>
                <div className="card-surface p-2">
                  <div className="small fw-bold mb-2">Manual JSON (optional)</div>
                  <textarea className="form-control" rows="4" placeholder='{"orderId":1,"orderNumber":"A1","orderType":"TO-GO","createdTs":1710000000,"items":[{"name":"Burger","quantity":1}]}' id="manualJson"></textarea>
                  <div className="d-flex gap-2 mt-2">
                    <button className="btn btn-primary" onClick={()=>{
                      try {
                        const el = document.getElementById('manualJson');
                        const obj = JSON.parse(el.value||'{}');
                        setTestTickets(Array.isArray(obj) ? obj : [obj]);
                        setPreviewEnabled(true); setTestOpen(false);
                      } catch { alert('Invalid JSON'); }
                    }}>Use JSON</button>
                    <button className="btn btn-outline-secondary" onClick={()=>{ const el = document.getElementById('manualJson'); el.value=''; }}>Clear</button>
                  </div>
                </div>
                <div className="card-surface p-2 mt-3">
                  <div className="small fw-bold mb-2">Pick Items from Menu (optional)</div>
                  {!menuData && <div className="text-muted small">Loading menu…</div>}
                  {menuData && (
                    <>
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <label className="small">Category</label>
                        <select className="form-select form-select-sm" style={{ maxWidth: 240 }} value={pickerCat} onChange={(e)=>{ setPickerCat(e.target.value); setPickerQty({}); }}>
                          {(menuData.categories||[]).map((c)=>(<option key={c.id} value={c.id}>{c.name}</option>))}
                        </select>
                      </div>
                      <div className="table-responsive" style={{ maxHeight: 220, overflow: 'auto' }}>
                        <table className="table table-sm align-middle">
                          <thead><tr><th>Item</th><th className="text-end" style={{ width: 100 }}>Qty</th></tr></thead>
                          <tbody>
                            {(menuData.categories||[]).filter(c=>String(c.id)===String(pickerCat)).flatMap(c=>c.items||[]).map((it)=> (
                              <tr key={it.id}>
                                <td>{it.name}</td>
                                <td className="text-end">
                                  <input type="number" min="0" className="form-control form-control-sm" style={{ width: 80, display: 'inline-block' }} value={pickerQty[it.id]||0} onChange={(e)=>setPickerQty(prev=>({ ...prev, [it.id]: parseInt(e.target.value||'0',10)||0 }))} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button className="btn btn-primary" onClick={()=>{
                          const items=[]; Object.entries(pickerQty).forEach(([id,qty])=>{ if(qty>0){ const cat=(menuData.categories||[]).find(c=>String(c.id)===String(pickerCat)); const it=(cat?.items||[]).find(i=>i.id===Number(id)); if(it) items.push({ name: it.name, quantity: qty }); }});
                          if(items.length){ const now=Math.floor(Date.now()/1000); setTestTickets([{ orderId: 8100+Math.floor(Math.random()*100), orderNumber:'C'+(8100+Math.floor(Math.random()*100)), orderType: 'TO-GO', createdTs: now-60, items }]); setPreviewEnabled(true); setTestOpen(false); }
                        }}>Generate from Selection</button>
                      </div>
                    </>
                  )}
                </div>
                <div className="card-surface p-2 mt-3">
                  <div className="small fw-bold mb-2">Saved Scenarios</div>
                  {(scenarios||[]).length===0 && <div className="text-muted small">No scenarios saved</div>}
                  {(scenarios||[]).map((s)=> (
                    <div key={s.name} className="d-flex align-items-center justify-content-between mb-1">
                      <div>{s.name}</div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={()=>{ setTestTickets(s.tickets||[]); setPreviewEnabled(true); setTestOpen(false); }}>Load</button>
                        <button className="btn btn-sm btn-outline-danger" onClick={()=>{ const next=scenarios.filter(x=>x.name!==s.name); setScenarios(next); try{localStorage.setItem('ds_scenarios', JSON.stringify(next));}catch{} }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setTestOpen(false)}>Close</button></div>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Layout History</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={()=>setShowHistory(false)}></button>
              </div>
              <div className="modal-body">
                <div className="list-group">
                  {versions.map((v)=> (
                    <div key={v.id} className="list-group-item d-flex align-items-center justify-content-between">
                      <div className="small">{new Date(v.created_at).toLocaleString()}</div>
                      <button className="btn btn-sm btn-outline-primary" onClick={()=>restoreVersion(v.id)}>Restore</button>
                    </div>
                  ))}
                  {!versions.length && <div className="text-muted">No saved versions</div>}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={()=>setShowHistory(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
