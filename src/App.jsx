import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PluginProvider, PluginRoutes, PluginZone } from './plugins/PluginManager.jsx';
import BaseLayout from '@/layouts/BaseLayout.jsx';
import FlashMessage from './components/FlashMessage.jsx';
<<<<<<< ours
import LoginPage from './features/login/LoginPage.jsx';
import OrderPage from './features/order/OrderPage.jsx';
import StationsPage from './features/stations/StationsPage.jsx';
=======
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
=======
        <FlashMessage message={msg} error={err} detail={detail} />
>>>>>>> theirs
        <BaseLayout>
          <FlashMessage message={msg} error={err} detail={detail} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/order" element={<OrderPage />} />
            <Route path="/stations" element={<StationsPage />} />
            <PluginRoutes />
          </Routes>
        </BaseLayout>
      </Router>
    </PluginProvider>
  );
}
