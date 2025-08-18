import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, Route } from "react-router-dom";
import loadPlugins from "./index.js";

const PluginContext = createContext({ plugins: [], zones: {}, contributions: {} });

export function PluginProvider({ children }) {
  const [plugins, setPlugins] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const loaded = await loadPlugins();
      if (active) {
        setPlugins(loaded);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => {
    const zones = {};
    const contributions = {
      actions: [],
      routes: [],
      transforms: [],
      shortcuts: [],
      adminPanels: [],
    };
    plugins.forEach((plugin) => {
      const { meta } = plugin;
      const zone = meta?.zone;
      if (zone) {
        zones[zone] = zones[zone] || [];
        zones[zone].push(plugin);
      }
      const contrib = meta?.contributes || {};
      Object.keys(contributions).forEach((key) => {
        (contrib[key] || []).forEach((item) => contributions[key].push(item));
      });
    });
    return { plugins, zones, contributions };
  }, [plugins]);

  return (
    <PluginContext.Provider value={value}>{children}</PluginContext.Provider>
  );
}

export function usePlugins() {
  return useContext(PluginContext);
}

export function PluginRoutes() {
  const { plugins } = usePlugins();
  return plugins.map(({ Component, meta }) => (
    <Route key={meta.id} path={meta.route} element={<Component />} />
  ));
}

export function PluginNavLinks() {
  const { plugins } = usePlugins();
  return plugins.map(({ meta }) => (
    <li key={meta.id}>
      <Link to={meta.route}>{meta.name}</Link>
    </li>
  ));
}

export function PluginZone({ zone }) {
  const { zones } = usePlugins();
  const zonePlugins = zones[zone] || [];
  return (
    <>
      {zonePlugins.map(({ Component, meta }) => (
        <Component key={meta.id} />
      ))}
    </>
  );
}

