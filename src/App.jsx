import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { PluginProvider, PluginRoutes, PluginNavLinks, PluginZone } from './plugins/PluginManager.jsx';

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <PluginZone zone="dashboard" />
    </div>
  );
}

export default function App() {
  return (
    <PluginProvider>
      <Router>
        <nav>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <PluginNavLinks />
          </ul>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <PluginRoutes />
        </Routes>
      </Router>
    </PluginProvider>
  );
}
