import React, { useEffect, useMemo, useState } from 'react';

export default function OrderEntryPage() {
  const [categories, setCategories] = useState([]);
  const [modGroups, setModGroups] = useState([]);
  const [table, setTable] = useState(null);
  const [orderType, setOrderType] = useState('DINE-IN');
  const [stations, setStations] = useState([]);
  const [stationId, setStationId] = useState('');
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [query, setQuery] = useState('');

  // modal state
  const [currentItem, setCurrentItem] = useState(null);
  const [selectedMods, setSelectedMods] = useState([]);
  const [instructions, setInstructions] = useState('');
  const [allergy, setAllergy] = useState(false);
  const [allergyDetails, setAllergyDetails] = useState('');

  useEffect(() => {
    // Load stations for filter
    fetch('/api/stations')
      .then(r=> r.ok ? r.json() : Promise.reject())
      .then((json)=> setStations(json.stations || []))
      .catch(()=>{});
  }, []);

  const loadMenu = React.useCallback((sid) => {
    const qs = sid ? `?stationId=${sid}` : '';
    fetch(`/api/order${qs}`)
      .then((res) => res.json())
      .then((data) => {
        setCategories(data.categories || []);
        setModGroups(data.modGroups || []);
        setTable(data.table || null);
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadMenu(stationId); }, [loadMenu, stationId]);

  const itemMap = useMemo(() => {
    const map = {};
    categories.forEach((cat) => {
      (cat.items || []).forEach((it) => {
        map[it.id] = it;
      });
    });
    return map;
  }, [categories]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((c) => ({ ...c, items: (c.items || []).filter((it) => it.name.toLowerCase().includes(q)) }))
      .filter((c) => c.items && c.items.length);
  }, [categories, query]);

  const total = useMemo(
    () => cart.reduce((sum, c) => sum + c.quantity * (c.price || 0), 0),
    [cart],
  );

  function openItem(itemId) {
    const it = itemMap[itemId];
    if (!it) return;
    setCurrentItem(it);
    setSelectedMods([]);
    setInstructions('');
    setAllergy(false);
    setAllergyDetails('');
  }

  function toggleMod(id) {
    setSelectedMods((mods) =>
      mods.includes(id) ? mods.filter((m) => m !== id) : [...mods, id],
    );
  }

  function confirmItem() {
    if (!currentItem) return;
    const modNames = selectedMods
      .map((id) => {
        const m = currentItem.modifiers.find((mod) => mod.id === id);
        return m ? m.name : null;
      })
      .filter(Boolean);
    setCart((c) => [
      ...c,
      {
        itemId: currentItem.id,
        name: currentItem.name,
        price: currentItem.price,
        modifierIds: selectedMods,
        modifierNames: modNames,
        quantity: 1,
        instructions,
        allergy,
        allergyDetails,
      },
    ]);
    setCurrentItem(null);
  }

  function inc(idx) {
    setCart((c) =>
      c.map((item, i) =>
        i === idx ? { ...item, quantity: item.quantity + 1 } : item,
      ),
    );
  }

  function dec(idx) {
    setCart((c) =>
      c
        .map((item, i) =>
          i === idx ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function remove(idx) {
    setCart((c) => c.filter((_, i) => i !== idx));
  }

  function submitOrder() {
    const payload = {};
    if (table) payload.order_number = table;
    if (orderType) payload.order_type = orderType;
    payload.items = cart.map((c) => {
      const item = {
        menu_item_id: c.itemId,
        quantity: c.quantity,
      };
      if (Array.isArray(c.modifierIds) && c.modifierIds.length) item.modifier_ids = c.modifierIds;
      const combinedInstr = [c.instructions, c.allergyDetails].filter((s)=> !!s && String(s).trim()).join(' | ');
      if (combinedInstr) item.special_instructions = combinedInstr;
      if (c.allergy) item.allergy = true;
      return item;
    });
    // Prefer API-token auth; read from window or localStorage
    const apiToken = (typeof window !== 'undefined' && (window.__API_TOKEN__ || window.localStorage?.getItem('api_token'))) || '';
    const headers = { 'Content-Type': 'application/json' };
    if (apiToken) headers['Authorization'] = `Bearer ${apiToken}`;
    fetch('/api/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        let body = null;
        try { body = await res.json(); } catch {}
        if (!res.ok || (body && body.error)) {
          const errMsg = (body && body.error) || `HTTP ${res.status}`;
          throw new Error(errMsg);
        }
        return body;
      })
      .then(() => {
        setCart([]);
        setMessage({ text: 'Order placed!', error: false });
        setPayOpen(false);
      })
      .catch((e) => {
        console.error('Order submit failed:', e);
        setMessage({ text: `Error sending order${e?.message ? `: ${e.message}` : ''}` , error: true });
      });
  }

  return (
    <div className={`menu-layout-grid`}>
      <header className="menu-header sticky-top-sm">
        <div className="d-flex flex-column">
          <span className="brand-name fw-bold"></span>
          <h1 className="menu-title m-0">Menu</h1>
        </div>
        <div className="header-controls">
          <div className="mt-1 me-3">
            <label className="fw-bold me-2">Search:</label>
            <input className="form-control d-inline-block w-auto" placeholder="Find items…" value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>
          <div className="mt-1 me-3">
            <label className="fw-bold me-2">Station:</label>
            <select className="form-select d-inline-block w-auto" value={stationId} onChange={(e)=>setStationId(e.target.value)}>
              <option value="">All</option>
              {stations.map((s)=> <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="mt-1 order-type-select">
            <label htmlFor="orderType" className="fw-bold me-2">
              Order Type:
            </label>
            <select
              id="orderType"
              className="form-select d-inline-block w-auto"
              value={orderType}
              onChange={(e) => setOrderType(e.target.value)}
            >
              <option value="DINE-IN">DINE-IN</option>
              <option value="TO-GO">TO-GO</option>
              <option value="CATERING">CATERING</option>
            </select>
          </div>
        </div>
        <nav id="categoryNav" className="category-nav mt-2">
          {categories.map((cat) => (
            <a key={cat.id} className="category-chip" href={`#cat-${cat.id}`}>
              {cat.name}
            </a>
          ))}
        </nav>
      </header>
      <main id="menu" className="menu-content container py-3">
        {filteredCategories.map((cat) => (
          <div className="category" id={`cat-${cat.id}`} key={cat.id}>
            <h2>{cat.name}</h2>
            <div className="item-grid">
              {(cat.items || []).map((item) => (
                <div className="item-card" key={item.id}>
                  <img
                    src={item.image_url || '/no-image-150.png'}
                    alt={item.name}
                  />
                  <span className="item-name">{item.name}</span>
                  <span className="item-price">
                    ${Number(item.price).toFixed(2)}
                  </span>
                  <button
                    className="btn btn-primary btn-touch"
                    onClick={() => openItem(item.id)}
                  >
                    <i className="bi bi-plus-lg"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filteredCategories.length === 0 && (
          <div className="text-muted">No items match your search.</div>
        )}
      </main>
      <div className="cart" id="cart">
        <h3>Your Order</h3>
        <ul id="cartItems">
          {cart.map((c, idx) => (
            <li key={idx}>
              <span>
                {c.quantity}× {c.name}
                {c.modifierNames.length > 0 && (
                  <> ({c.modifierNames.join(', ')})</>
                )}
                {c.allergy && ' [ALLERGY]'}
                {c.allergyDetails && ` (${c.allergyDetails})`}
                {c.instructions && ` - ${c.instructions}`}
              </span>
              <span>
                <button
                  className="btn btn-primary btn-sm ms-1"
                  onClick={() => dec(idx)}
                >
                  <i className="bi bi-dash-lg"></i>
                </button>
                <button
                  className="btn btn-primary btn-sm ms-1"
                  onClick={() => inc(idx)}
                >
                  <i className="bi bi-plus-lg"></i>
                </button>
                <button
                  className="btn btn-danger btn-sm ms-1"
                  onClick={() => remove(idx)}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="cart-summary mt-2 d-flex align-items-center justify-content-between">
          <div className="fw-bold">Total: ${total.toFixed(2)}</div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary" onClick={()=> setCart([])} disabled={!cart.length}>Clear</button>
            <button className="btn btn-primary" onClick={submitOrder} disabled={!cart.length}>Place Order</button>
          </div>
        </div>
      </div>
      {currentItem && (
        <div className="modal d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content modal-small bg-white text-dark">
              <div className="modal-header">
                <h5 className="modal-title">Add {currentItem.name}</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setCurrentItem(null)}
                ></button>
              </div>
              <div className="modal-body p-3">
                <div>
                  {(() => {
                    const groups = {};
                    currentItem.modifiers.forEach((m) => {
                      const gid = m.group_id || 'extras';
                      if (!groups[gid]) groups[gid] = [];
                      groups[gid].push(m);
                    });
                    return Object.keys(groups).map((gid) => (
                      <div key={gid}>
                        <div className="mod-group-label">
                          {gid === 'extras'
                            ? 'Extras'
                            : modGroups.find((g) => g.id === parseInt(gid))?.name ||
                              'Options'}
                        </div>
                        {groups[gid].map((m) => (
                          <label key={m.id} className="d-block">
                            <input
                              type="checkbox"
                              value={m.id}
                              checked={selectedMods.includes(m.id)}
                              onChange={() => toggleMod(m.id)}
                            />
                            {' '}
                            {m.name}
                          </label>
                        ))}
                      </div>
                    ));
                  })()}
                </div>
                <div className="mb-2">
                  <label className="form-label">Special Instructions:</label>
                  <textarea
                    rows="2"
                    className="form-control"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  ></textarea>
                </div>
                <div className="mb-2 form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="modAllergy"
                    checked={allergy}
                    onChange={(e) => setAllergy(e.target.checked)}
                  />
                  <label className="form-check-label" htmlFor="modAllergy">
                    Allergy
                  </label>
                </div>
                {allergy && (
                  <div className="mb-2" id="modAllergyDetailDiv">
                    <label className="form-label">Allergy Details:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={allergyDetails}
                      onChange={(e) => setAllergyDetails(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  id="modConfirm"
                  className="btn btn-success"
                  onClick={confirmItem}
                >
                  Add Item
                </button>
                <button
                  id="modCancel"
                  className="btn btn-secondary"
                  onClick={() => setCurrentItem(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Payment modal removed in default UI. Hook POS for real payments if needed. */}
      {message && (
        <div
          className={`toast show position-fixed bottom-0 end-0 m-3 text-bg-${message.error ? 'danger' : 'success'}`}
        >
          <div className="toast-body">{message.text}</div>
        </div>
      )}
    </div>
  );
}
