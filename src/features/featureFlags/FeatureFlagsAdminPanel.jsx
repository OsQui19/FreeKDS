import React, { useState } from 'react';
import useFeatureFlag from '@/hooks/useFeatureFlag.js';
import flagsData from '../../../config/flags.json';

const NAMESPACES = ['ui', 'transport', 'perf'];

function FlagRow({ flagKey, defaultValue, context }) {
  const { value, source } = useFeatureFlag(flagKey, defaultValue, context);
  return (
    <tr>
      <td>{flagKey}</td>
      <td>{String(value)}</td>
      <td>{source}</td>
    </tr>
  );
}

export default function FeatureFlagsAdminPanel() {
  const [stationId, setStationId] = useState('1');
  const context = stationId ? { station: stationId } : {};

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
        />
      );
    });
  });

  return (
    <div>
      <div className="mb-3">
        <label className="form-label me-2">Station</label>
        <input
          className="form-control d-inline-block w-auto"
          value={stationId}
          onChange={(e) => setStationId(e.target.value)}
        />
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Flag</th>
            <th>Value</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

