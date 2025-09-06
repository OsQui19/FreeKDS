import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PluginRoutes, PluginZone } from './plugins/PluginManager.jsx';
import LayoutWrap from '@/layouts/LayoutWrap.jsx';
import LiteLayout from '@/layouts/LiteLayout.jsx';
import AdminPanels from '@/features/AdminMenu/AdminPanels.jsx';
import AdminShell from '@/layouts/AdminShell.jsx';
import EmployeesRoute from '@/admin/routes/Employees.jsx';
import RolesRoute from '@/admin/routes/Roles.jsx';
import PayrollRoute from '@/admin/routes/Payroll.jsx';
import InventoryRoute from '@/admin/routes/Inventory.jsx';
import TimeClockRoute from '@/admin/routes/TimeClock.jsx';
import BackupsRoute from '@/admin/routes/Backups.jsx';
import MenuRoute from '@/admin/routes/Menu.jsx';
import FeatureFlagsAdminPanel from '@/features/featureFlags/FeatureFlagsAdminPanel.jsx';
import RequireAccess from '@/components/RequireAccess.jsx';
import LayoutsRoute from '@/admin/routes/Layouts.jsx';
import StationsRoute from '@/admin/routes/Stations.jsx';
import AppearanceRoute from '@/admin/routes/Appearance.jsx';
import ReportsRoute from '@/admin/routes/Reports.jsx';
import SettingsRoute from '@/admin/routes/Settings.jsx';
import IntegrationsRoute from '@/admin/routes/Integrations.jsx';
import DesignStudioRoute from '@/admin/routes/DesignStudio.jsx';
const LocationsRoute = React.lazy(() => import('@/admin/routes/Locations.jsx'));
const SuppliersRoute = React.lazy(() => import('@/admin/routes/Suppliers.jsx'));
const PurchaseOrdersRoute = React.lazy(() => import('@/admin/routes/PurchaseOrders.jsx'));
const PurchaseOrderDetailRoute = React.lazy(() => import('@/admin/routes/PurchaseOrderDetail.jsx'));
import ThemeEditorPro from '@/features/admin/ThemeEditorPro.jsx';
import InventoryPanel from '@/../packages/admin/InventoryPanel.jsx';
import ScheduleApp from '@/schedule/ScheduleApp.jsx';
import FlashMessage from './components/FlashMessage.jsx';
import LoginPage from './features/login/LoginPage.jsx';
import OrderEntryPage from './features/OrderEntry/OrderEntryPage.jsx';
import SchemaPage from '@/features/pages/SchemaPage.jsx';
import StationsPage from './features/stations/StationsPage.jsx';
import PosPage from './features/pos/PosPage.jsx';
import StationScreen from './features/kds/StationScreen.jsx';

function Home() {
  return (
    <div>
      <h1>Home</h1>
      <PluginZone zone="dashboard" />
    </div>
  );
}

// Static routes without gating to avoid SSR/CSR blank states
function RoutesConfig() {
  return (
    <Routes>
      {/* Public login route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Core application routes with shared layout and plugins */}
      <Route path="/" element={<LayoutWrap><Home /></LayoutWrap>} />
      <Route path="/order" element={<LayoutWrap><SchemaPage name="page:order" fallback={<OrderEntryPage />} /></LayoutWrap>} />
      <Route path="/stations" element={<LayoutWrap><StationsPage /></LayoutWrap>} />
      <Route path="/station/:id" element={<LiteLayout><StationScreen /></LiteLayout>} />
      <Route path="/foh/order" element={<LayoutWrap><OrderEntryPage /></LayoutWrap>} />
      <Route path="/pos" element={<LiteLayout><PosPage /></LiteLayout>} />

      {/* Admin shell with nested routes */}
  <Route path="/admin" element={<LayoutWrap><AdminShell /></LayoutWrap>}>
        <Route index element={<AdminPanels />} />
        <Route path="employees" element={<RequireAccess module="employees"><EmployeesRoute /></RequireAccess>} />
        <Route path="roles" element={<RequireAccess module="employees"><RolesRoute /></RequireAccess>} />
        <Route path="payroll" element={<RequireAccess module="employees"><PayrollRoute /></RequireAccess>} />
        <Route path="inventory" element={<RequireAccess module="inventory"><InventoryRoute /></RequireAccess>} />
        <Route path="suppliers" element={<RequireAccess module="inventory"><React.Suspense fallback={<div className="admin-section">Loading…</div>}><div className="admin-section"><SuppliersRoute /></div></React.Suspense></RequireAccess>} />
        <Route path="locations" element={<RequireAccess module="inventory"><React.Suspense fallback={<div className="admin-section">Loading…</div>}><div className="admin-section"><LocationsRoute /></div></React.Suspense></RequireAccess>} />
        <Route path="purchase-orders" element={<RequireAccess module="inventory"><React.Suspense fallback={<div className="admin-section">Loading…</div>}><div className="admin-section"><PurchaseOrdersRoute /></div></React.Suspense></RequireAccess>} />
        <Route path="purchase-orders/:id" element={<RequireAccess module="inventory"><React.Suspense fallback={<div className="admin-section">Loading…</div>}><div className="admin-section"><PurchaseOrderDetailRoute /></div></React.Suspense></RequireAccess>} />
        <Route path="timeclock" element={<RequireAccess module="employees"><TimeClockRoute /></RequireAccess>} />
        <Route path="backups" element={<RequireAccess module="backup"><BackupsRoute /></RequireAccess>} />
        <Route path="schedule" element={<RequireAccess module="employees"><div className="admin-section"><ScheduleApp /></div></RequireAccess>} />
        {/* Dedicated admin routes */}
        <Route path="menu" element={<RequireAccess module="menu"><MenuRoute /></RequireAccess>} />
        <Route path="stations" element={<RequireAccess module="stations"><StationsRoute /></RequireAccess>} />
        <Route path="theme" element={<RequireAccess module="theme"><div className="admin-section"><ThemeEditorPro /></div></RequireAccess>} />
        <Route path="appearance" element={<RequireAccess module="theme"><AppearanceRoute /></RequireAccess>} />
        <Route path="studio" element={<RequireAccess module="theme"><DesignStudioRoute /></RequireAccess>} />
        <Route path="settings" element={<RequireAccess module="updates"><SettingsRoute /></RequireAccess>} />
        <Route path="reports" element={<RequireAccess module="reports"><ReportsRoute /></RequireAccess>} />
        <Route path="integrations" element={<RequireAccess module="updates"><IntegrationsRoute /></RequireAccess>} />
        <Route path="layouts" element={<RequireAccess module="menu"><LayoutsRoute /></RequireAccess>} />
        <Route path="flags" element={<RequireAccess module="updates"><div className="admin-section"><FeatureFlagsAdminPanel /></div></RequireAccess>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const msg = params.get('msg');
  const err = params.get('err');
  const detail = params.get('detail');

  return (
    <Router>
      <FlashMessage message={msg} error={err} detail={detail} />
      <RoutesConfig />
    </Router>
  );
}

// App.jsx now only exports the App component. Mounting is handled in src/main.jsx.
        <Route path="schema/overview" element={<RequireAccess module="updates"><SchemaPage name="page:admin-overview" /></RequireAccess>} />
