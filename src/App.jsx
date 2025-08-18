import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PluginProvider, PluginRoutes, PluginZone } from './plugins/PluginManager.jsx';
<<<<<<< ours
import BaseLayout from '@/layouts/BaseLayout.jsx';
=======
import AppNavbar from './components/AppNavbar.jsx';
import FlashMessage from './components/FlashMessage.jsx';
>>>>>>> theirs

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <PluginZone zone="dashboard" />
    </div>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const msg = params.get('msg');
  const err = params.get('err');
  const detail = params.get('detail');

  return (
    <PluginProvider>
      <Router>
<<<<<<< ours
        <BaseLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <PluginRoutes />
          </Routes>
        </BaseLayout>
=======
        <AppNavbar />
        <FlashMessage message={msg} error={err} detail={detail} />
        <Routes>
          <Route path="/" element={<Home />} />
          <PluginRoutes />
        </Routes>
>>>>>>> theirs
      </Router>
    </PluginProvider>
  );
}
