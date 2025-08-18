import React, { useEffect, useState } from 'react';
import useFeatureFlag from '@/hooks/useFeatureFlag.js';
import { updateFeatureFlags } from '@/featureFlags/index.js';

const NAMESPACES = ['ui', 'transport', 'perf'];

function FlagRow({ flagKey, defaultValue, context, onSave }) {
  const { value, variant } = useFeatureFlag(flagKey, defaultValue, context);
  const [edit, setEdit] = useState('');

  const handleSave = () => {
    onSave(flagKey, edit);
    setEdit('');
  };

  return (
    <tr>
      <td>{flagKey}</td>
      <td>
        <input
          className="form-control"
          value={edit}
          placeholder={String(value)}
          onChange={(e) => setEdit(e.target.value)}
        />
      </td>
      <td>{variant}</td>
      <td>
        <button className="btn btn-sm btn-primary" onClick={handleSave}>
          Save
        </button>
      </td>
    </tr>
  );
}

export default function FeatureFlagsAdminPanel() {
  const [tenantId, setTenantId] = useState('');
  const [stationId, setStationId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [flagsData, setFlagsData] = useState(null);

  const context = {};
  if (tenantId) context.tenant = tenantId;
  if (stationId) context.station = stationId;
  if (screenId) context.screen = screenId;

  async function loadFlags() {
    const res = await fetch('/api/flags');
    const data = await res.json();
    setFlagsData(data);
    updateFeatureFlags(data);
  }

  useEffect(() => {
    loadFlags();
  }, []);

  const handleSave = async (flagKey, raw) => {
    let value;
    if (raw === '') {
      value = null;
    } else {
      try {
        value = JSON.parse(raw);
      } catch {
        value = raw;
      }
    }
    const [namespace, key] = flagKey.split('.');
    let level = 'global';
    let id;
    if (screenId) {
      level = 'screen';
      id = screenId;
    } else if (stationId) {
      level = 'station';
      id = stationId;
    } else if (tenantId) {
      level = 'tenant';
      id = tenantId;
    }
    await fetch('/api/flags', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, id, namespace, key, value }),
    });
    await loadFlags();
  };

  if (!flagsData) return <div>Loading...</div>;

  const rows = [];
  NAMESPACES.forEach((ns) => {
    const keySet = new Set(Object.keys(flagsData.global?.[ns] || {}));
    Object.values(flagsData.tenant || {}).forEach((scope) => {
      Object.keys(scope[ns] || {}).forEach((k) => keySet.add(k));
    });
    Object.values(flagsData.station || {}).forEach((scope) => {
      Object.keys(scope[ns] || {}).forEach((k) => keySet.add(k));
    });
    Object.values(flagsData.screen || {}).forEach((scope) => {
      Object.keys(scope[ns] || {}).forEach((k) => keySet.add(k));
    });
    keySet.forEach((key) => {
      const fullKey = `${ns}.${key}`;
      const defaultValue =
        flagsData.global?.[ns]?.[key] !== undefined
          ? flagsData.global[ns][key]
          : false;
      rows.push(
        <FlagRow
          key={fullKey}
          flagKey={fullKey}
          defaultValue={defaultValue}
          context={context}
          onSave={handleSave}
        />,
      );
    });
  });

  return (
    <div>
      <div className="mb-3">
        <label className="form-label me-2">Tenant</label>
        <input
          className="form-control d-inline-block w-auto me-3"
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
        />
        <label className="form-label me-2">Station</label>
        <input
          className="form-control d-inline-block w-auto me-3"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
        />
        <label className="form-label me-2">Screen</label>
        <input
          className="form-control d-inline-block w-auto"
          value={screenId}
          onChange={(e) => setScreenId(e.target.value)}
        />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Flag</th>
            <th>Value</th>
            <th>Source</th>
            <th></th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

FeatureFlagsAdminPanel.meta = {
  id: 'feature-flags',
  title: 'Feature Flags',
  dataDomain: 'feature-flags',
  scopes: [],
  latencyClass: 'interactive',
};

