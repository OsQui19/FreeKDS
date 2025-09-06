import React, { useEffect, useRef, useState } from 'react';
import OrderList from '../Orders/components/OrderList.jsx';
import { TicketGrid } from '../../../packages/renderers/index.js';
import useTransport from '@/hooks/useTransport.js';
import KdsSidebar from './KdsSidebar.jsx';

/**
 * KDS application component that renders incoming orders.
 *
 * @param {object} props
 * @param {string} [props.stationType]
 */
export default function KdsApp({ stationType, stationId, transport = 'ws', fallback, takeoutOnly = false, newSound = 'beep', urgentSound = 'beep2', showSidebar = false, bumpedOrders = [], showAllDay = true, allStations = [] }) {
  const [orders, setOrders] = useState([]);
  const [urgentIds, setUrgentIds] = useState(new Set());
  const [heldIds, setHeldIds] = useState(new Set());
  const [newIds, setNewIds] = useState(new Set());
  const [selectedId, setSelectedId] = useState(null);
  const [recallId, setRecallId] = useState(null);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [recallLimit, setRecallLimit] = useState(100);
  const [bumpedList, setBumpedList] = useState(() => Array.isArray(bumpedOrders) ? bumpedOrders : []);
  const queueRef = useRef([]);
  const { connection, connected, stale, on, off, send } = useTransport({
    type: transport,
    fallback,
    stationId,
    sseType: stationType === 'expo' ? 'expo' : undefined,
  });
  const audioCtxRef = useRef(null);
  const lastBumpedIdRef = useRef(null);
  const stationsById = React.useMemo(() => {
    const m = {};
    (allStations || []).forEach((s) => {
      if (!s) return;
      const key = String(s.id);
      m[key] = s.name || `Station ${s.id}`;
    });
    return m;
  }, [allStations]);
  // Expose send for simple UI hooks
  useEffect(() => {
    try { if (typeof window !== 'undefined') window.__kdsSend = send; } catch {}
  }, [send]);
  const beep = (tone = 'beep') => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      const freq = tone === 'beep2' ? 1320 : tone === 'low' ? 660 : 880;
      const duration = 120;
      o.frequency.value = freq;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      o.start();
      setTimeout(() => { try { g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.02); o.stop(ctx.currentTime + 0.03); } catch {} }, duration);
    } catch {}
  };

  useEffect(() => {
    if (connected && queueRef.current.length) {
      queueRef.current.forEach((evt) => {
        if (evt.type === 'add') {
          setOrders((prev) => [...prev, evt.order]);
        } else if (evt.type === 'complete') {
          setOrders((prev) => prev.filter((o) => o.orderId !== evt.orderId));
        }
      });
      queueRef.current = [];
    }
  }, [connected]);

  useEffect(() => {
    if (!connection) return;

    const sortOrders = (list) => {
      return [...list].sort((a, b) => {
        const pa = a.priority || 0; const pb = b.priority || 0;
        if (pb !== pa) return pb - pa;
        return (a.createdTs || 0) - (b.createdTs || 0);
      });
    };
    const handleAdd = (order) => {
      if (connected) setOrders((prev) => sortOrders([...prev, order]));
      else queueRef.current.push({ type: 'add', order });
      // gentle beep on new order
      beep(newSound);
      try {
        setNewIds((prev) => {
          const n = new Set(prev); n.add(order.orderId);
          setTimeout(() => setNewIds((prev2) => { const n2 = new Set(prev2); n2.delete(order.orderId); return n2; }), 2000);
          return n;
        });
      } catch {}
    };
    const handleComplete = ({ orderId }) => {
      lastBumpedIdRef.current = orderId;
      if (connected) {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      } else {
        queueRef.current.push({ type: 'complete', orderId });
      }
    };
    const handleUrgent = ({ orderId }) => {
      setUrgentIds((prev) => new Set([...prev, orderId]));
      beep(urgentSound);
    };
    const handleItemState = ({ orderId, itemId, state }) => {
      const ts = state === 'ready' ? Math.floor(Date.now()/1000) : undefined;
      setOrders((prev) => prev.map((o) =>
        o.orderId === orderId
          ? { ...o, items: (o.items || []).map((it) => it.itemId === itemId ? { ...it, state, preparedTs: ts } : it) }
          : o
      ));
    };
    const handleHeld = ({ orderId }) => {
      setHeldIds((prev) => new Set([...prev, orderId]));
    };
    const handleReleased = ({ orderId }) => {
      setHeldIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
      setUrgentIds((prev) => { const n = new Set(prev); n.delete(orderId); return n; });
    };
    const handleReady = ({ orderId, readyTs }) => {
      setOrders((prev) => prev.map((o) => o.orderId === orderId ? { ...o, readyTs: readyTs || Math.floor(Date.now()/1000) } : o));
    };
    const handlePriority = ({ orderId, priority }) => {
      setOrders((prev) => {
        const next = prev.map((o) => o.orderId === orderId ? { ...o, priority: priority || 0 } : o);
        return sortOrders(next);
      });
    };
    const refreshBumped = async () => {
      if (stationType !== 'expo') return;
      try {
        const res = await fetch(`/api/bumped_orders?station_id=${stationId}&limit=100`);
        const json = await res.json();
        setBumpedList(Array.isArray(json.orders)?json.orders:[]);
      } catch {}
    };

    on('orderAdded', handleAdd);
    on('orderCompleted', handleComplete);
    on('orderUrgent', handleUrgent);
    on('itemState', handleItemState);
    on('orderHeld', handleHeld);
    on('orderReleased', handleReleased);
    on('orderReady', handleReady);
    on('orderPriority', handlePriority);
    on('stationDone', ({ orderId, stationId: doneId }) => {
      const ts = Math.floor(Date.now()/1000);
      setOrders((prev) => prev.map((o) => (
        o.orderId === orderId
          ? { ...o, items: (o.items || []).map((it) => (String(it.stationId) === String(doneId) ? { ...it, state: 'ready', preparedTs: ts } : it)) }
          : o
      )));
    });
    if (stationType === 'expo') {
      on('orderCompleted', refreshBumped);
      on('stationUndo', refreshBumped);
    }

    return () => {
      off('orderAdded', handleAdd);
      off('orderCompleted', handleComplete);
      off('orderUrgent', handleUrgent);
      off('itemState', handleItemState);
      off('orderHeld', handleHeld);
      off('orderReleased', handleReleased);
      off('orderReady', handleReady);
      off('orderPriority', handlePriority);
      off('stationDone', () => {});
      if (stationType === 'expo') {
        off('orderCompleted', refreshBumped);
        off('stationUndo', refreshBumped);
      }
    };
  }, [connection, connected, on, off]);

  const visibleOrders = React.useMemo(() => (takeoutOnly ? orders.filter((o)=> String(o.orderType||'').toUpperCase().includes('TO-GO')) : orders), [orders, takeoutOnly]);
  // Poll fallback to keep KDS updated even if realtime is blocked
  const mapOrder = React.useCallback((o) => ({
      orderId: o.order_id,
      orderNumber: o.order_number || o.order_id,
      orderType: o.order_type || '',
      specialInstructions: o.special_instructions || '',
      allergy: !!o.allergy,
      createdTs: o.ts,
      readyTs: o.ready_ts || null,
      priority: o.priority || 0,
      items: (o.items||[]).map((it)=> ({
        quantity: it.quantity,
        name: it.name,
        stationId: it.stationId,
        itemId: it.itemId,
        orderItemId: it.orderItemId,
        modifiers: it.modifiers||[],
        specialInstructions: it.specialInstructions||'',
        allergy: !!it.allergy,
      })),
    }), []);
  const tick = React.useCallback(async () => {
      try {
        const res = await fetch(`/api/station/${stationId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json.orders)) {
          setOrders(json.orders.map(mapOrder));
        }
      } catch {}
    }, [stationId, mapOrder]);
  useEffect(() => {
    if (!stationId) return;
    let active = true;
    tick();
    // Initial fetch and periodic when not connected or stale
    const interval = setInterval(() => { if (!connected || stale) tick(); }, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [stationId, connected, stale, tick]);

  // Force refresh when server broadcasts report changes (e.g., after order create)
  useEffect(() => {
    const handleReports = () => tick();
    on('reportsUpdated', handleReports);
    return () => off('reportsUpdated', handleReports);
  }, [on, off, tick]);
  // Keep recall selection in sync with bumped list
  useEffect(() => {
    if (Array.isArray(bumpedList) && bumpedList.length) {
      setRecallId((prev) => (prev && bumpedList.some((b) => b.order_id === prev)) ? prev : bumpedList[0].order_id);
    } else {
      setRecallId(null);
    }
  }, [bumpedList]);
  const allDay = React.useMemo(() => {
    const map = new Map();
    visibleOrders.forEach((o) => (o.items||[]).forEach((it) => {
      const key = it.name + '|' + (it.modifiers||[]).join(',');
      map.set(key, (map.get(key)||0) + (it.quantity||0));
    }));
    return Array.from(map.entries()).map(([k,v])=>({ name: k.split('|')[0], mods: k.split('|')[1], qty: v })).sort((a,b)=> b.qty - a.qty);
  }, [visibleOrders]);

  return (
    <>
      {stale && <div className="stale-indicator">Offline</div>}
      <div style={{position:'fixed', bottom: 8, left: 8, zIndex: 9}} className="text-muted small">
        <span>RT: {connected ? 'connected' : 'connecting'} ({connection ? (connection.constructor?.name || transport) : 'n/a'})</span>
      </div>
      <div className="kds-frame">
        {showSidebar && <KdsSidebar orders={visibleOrders} />}
        <div className="kds-screen">
          <TicketGrid
            tickets={visibleOrders}
            stationType={stationType}
            density={document.body.classList.contains('kds-compact') ? 'compact' : 'comfortable'}
            layout="grid"
            onTicketClick={(orderId) => setSelectedId((prev)=> prev===orderId ? null : orderId)}
            selectedId={selectedId}
            stationsMap={stationsById}
            onItemToggle={(orderId, orderItemId, state) => send('itemPrepared', { orderId, orderItemId, state })}
            onBump={(orderId) => {
              const id = orderId || selectedId || orders[0]?.orderId;
              if (!id) return;
              send('bumpOrder', { orderId: id });
              setSelectedId((prev)=> prev===id ? null : prev);
            }}
          />
        </div>
      </div>
      {/* Removed small Clear Ready above the bar; consolidated into action bar */}
      <style>{Array.from(newIds).map((id)=>`.ticket-wrap[data-order-id="${id}"]{}`)}</style>
      <div className="kds-actionbar">
        <button className="kbtn kbtn-danger" onClick={() => {
          const id = selectedId || orders[0]?.orderId; if (id) send('prioritizeOrder', { orderId: id, amount: 1 });
        }}>Priority</button>
        <button className="kbtn kbtn-success" onClick={() => {
          const id = selectedId || orders[0]?.orderId; if (!id) return;
          send('bumpOrder', { orderId: id });
          setSelectedId((prev)=> prev===id ? null : prev);
          if (stationType !== 'expo') {
            // Optimistically remove from local list for prep stations
            setOrders((prev) => prev.filter((o) => o.orderId !== id));
          }
        }}>Bump</button>
        <button className="kbtn kbtn-info" onClick={() => {
          const id = selectedId || orders[0]?.orderId; if (id) send('holdOrder', { orderId: id });
        }}>Hold</button>
        {stationType === 'expo' && (
          <>
            <button className="kbtn kbtn-info" onClick={async () => {
              try {
                const res = await fetch(`/api/bumped_orders?station_id=${stationId}&limit=100`);
                const json = await res.json();
                setBumpedList(Array.isArray(json.orders)?json.orders:[]);
              } catch {}
              setShowRecallModal(true);
            }}>Recall…</button>
            <button className="kbtn kbtn-danger" onClick={() => { if (window.confirm('Clear all READY orders now?')) send('clearReady'); }}>Clear Ready</button>
          </>
        )}
      </div>
      {showAllDay && (
        <div className="admin-section mt-3">
          <h6 className="mb-2">All Day</h6>
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead><tr><th>Item</th><th>Mods</th><th className="text-end">Qty</th></tr></thead>
              <tbody>
                {allDay.map((r, i)=> (
                  <tr key={i}><td>{r.name}</td><td className="text-muted small">{r.mods}</td><td className="text-end fw-bold">{r.qty}</td></tr>
                ))}
                {!allDay.length && <tr><td colSpan={3} className="text-muted">No active items</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recall Modal for Expo: shows bumped orders list with Recall actions */}
      {showRecallModal && stationType === 'expo' && (
        <div className="modal d-block" tabIndex="-1" role="dialog" aria-modal="true">
          <div className="modal-dialog modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Bumped Orders</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={()=>setShowRecallModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead><tr><th>Order #</th><th>Bumped At</th><th></th></tr></thead>
                    <tbody>
                      {(bumpedList||[]).map((bo) => (
                        <tr key={bo.order_id}>
                          <td>{bo.order_number || bo.order_id}</td>
                          <td>{bo.bumped_at ? new Date(bo.bumped_at).toLocaleTimeString() : '-'}</td>
                          <td className="text-end">
                            <button className="btn btn-sm btn-outline-primary" onClick={() => { send('recallOrder', { orderId: bo.order_id }); setShowRecallModal(false); }}>Recall</button>
                          </td>
                        </tr>
                      ))}
                      {(!bumpedList || !bumpedList.length) && (
                        <tr><td colSpan={3} className="text-muted">No bumped orders</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={async ()=>{ try{ const r=await fetch(`/api/bumped_orders?station_id=${stationId}&limit=${recallLimit}`); const j=await r.json(); setBumpedList(Array.isArray(j.orders)?j.orders:[]);}catch{} }}>Refresh</button>
                <button className="btn btn-outline-primary" onClick={async ()=>{ const next = recallLimit + 100; setRecallLimit(next); try{ const r=await fetch(`/api/bumped_orders?station_id=${stationId}&limit=${next}`); const j=await r.json(); setBumpedList(Array.isArray(j.orders)?j.orders:[]);}catch{} }}>Load more</button>
                <button className="btn btn-secondary" onClick={()=>setShowRecallModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
