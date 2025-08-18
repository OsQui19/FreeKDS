import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, Route } from 'react-router-dom';
import pluginFiles from './index.js';

const PluginContext = createContext({ plugins: [], zones: {} });

export function PluginProvider({ children }) {
  const [plugins, setPlugins] = useState([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const loaded = await Promise.all(
        pluginFiles.map(async (file) => {
          try {
            const mod = await import(/* @vite-ignore */ `./${file}`);
            return { Component: mod.default, meta: mod.meta };
          } catch (err) {
            console.error(`Failed to load plugin: ${file}`, err);
            return null;
          }
        })
      );
      if (active) {
        setPlugins(loaded.filter(Boolean));
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => {
    const zones = plugins.reduce((acc, plugin) => {
      const zone = plugin.meta?.zone;
      if (zone) {
        acc[zone] = acc[zone] || [];
        acc[zone].push(plugin);
      }
      return acc;
    }, {});
    return { plugins, zones };
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
