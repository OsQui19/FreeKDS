import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
<<<<<<< ours
} from "react";
import { Link, Route } from "react-router-dom";
import loadPlugins from "./index.js";
=======
} from 'react';
import { Link, Route } from 'react-router-dom';
import pluginFiles from './index.js';
import {
  install,
  enable,
  activate as activatePlugin,
  deactivate as deactivatePlugin,
  on,
} from './lifecycle.js';
>>>>>>> theirs

const PluginContext = createContext({ plugins: [], zones: {} });

export function PluginProvider({ children }) {
  const [plugins, setPlugins] = useState([]);

<<<<<<< ours
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
=======
  useEffect(() => {
    const disposers = [];
    let cancelled = false;
    async function load() {
      const loaded = await Promise.all(
        pluginFiles.map(async (file) => {
          try {
            const mod = await import(/* @vite-ignore */ `./${file}`);
            return { Component: mod.default, meta: mod.meta, activate: mod.activate, deactivate: mod.deactivate };
          } catch (err) {
            console.error(`Failed to load plugin: ${file}`, err);
            return null;
          }
        })
      );
      if (cancelled) return;
      loaded.filter(Boolean).forEach((plugin) => {
        install(plugin);
        enable(plugin);

        const doActivate = () => {
          setPlugins((prev) => {
            if (prev.some((p) => p.meta.id === plugin.meta.id)) return prev;
            activatePlugin(plugin);
            return [...prev, plugin];
          });
        };

        const doDeactivate = () => {
          setPlugins((prev) => {
            if (!prev.some((p) => p.meta.id === plugin.meta.id)) return prev;
            deactivatePlugin(plugin);
            return prev.filter((p) => p.meta.id !== plugin.meta.id);
          });
        };

        const { activationEvents = [], deactivationEvents = [] } = plugin.meta || {};

        if (activationEvents.length === 0) {
          doActivate();
        } else {
          activationEvents.forEach((ev) => disposers.push(on(ev, doActivate)));
        }
        deactivationEvents.forEach((ev) => disposers.push(on(ev, doDeactivate)));
      });
    }
    load();
    return () => {
      cancelled = true;
      disposers.forEach((d) => d());
    };
  }, []);
>>>>>>> theirs

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
