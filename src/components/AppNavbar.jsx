import React from 'react';
<<<<<<< ours
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { usePlugins } from '@/plugins/PluginManager.jsx';

export default function AppNavbar() {
  const { theme, toggleTheme } = useTheme();
  const { plugins } = usePlugins();
  return (
    <Navbar bg="light" expand="lg" className="mb-3">
      <Container>
        <Navbar.Brand as={Link} to="/">
          FreeKDS
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="app-navbar" />
        <Navbar.Collapse id="app-navbar">
          <Nav className="me-auto">
            <Nav.Link as={Link} to="/dashboard">
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/admin">Admin</Nav.Link>
            {plugins.map(({ meta }) => (
              <Nav.Link key={meta.id} as={Link} to={meta.route}>
                {meta.name}
              </Nav.Link>
            ))}
          </Nav>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
=======

export default function AppNavbar({ user, hasAccess }) {
  const canAdmin =
    typeof hasAccess === 'function' &&
    (hasAccess('menu') ||
      hasAccess('inventory') ||
      hasAccess('suppliers') ||
      hasAccess('purchase-orders') ||
      hasAccess('reports') ||
      hasAccess('employees') ||
      hasAccess('theme') ||
      hasAccess('locations') ||
      hasAccess('backup'));

  return (
    <div className="nav-buttons d-flex gap-2">
      {typeof hasAccess === 'function' && hasAccess('order') && (
        <a href="/foh/order" className="btn btn-secondary btn-sm" aria-label="Order">
          <i className="bi bi-cart-fill me-1" aria-hidden="true"></i>Order
        </a>
      )}
      {typeof hasAccess === 'function' && hasAccess('stations') && (
        <a href="/stations" className="btn btn-secondary btn-sm" aria-label="KDS">
          <i className="bi bi-display-fill me-1" aria-hidden="true"></i>KDS
        </a>
      )}
      {canAdmin && (
        <a
          href="/admin?tab=stations"
          id="adminNavBtn"
          className="btn btn-secondary btn-sm"
          aria-label="Admin"
        >
          <i className="bi bi-gear-fill me-1" aria-hidden="true"></i>Admin
        </a>
      )}
      {user ? (
        <>
          <a href="/clock/dashboard" className="btn btn-secondary btn-sm" aria-label="Clock">
            <i className="bi bi-clock-fill me-1" aria-hidden="true"></i>Clock
          </a>
          <form action="/logout" method="post" className="m-0">
            <button
              type="submit"
              className="btn btn-danger btn-sm"
              aria-label="Log Out"
            >
              <i className="bi bi-box-arrow-right me-1" aria-hidden="true"></i>Log Out
            </button>
          </form>
        </>
      ) : (
        <a href="/login" className="btn btn-secondary btn-sm" aria-label="Log In">
          <i className="bi bi-box-arrow-in-right me-1" aria-hidden="true"></i>Log In
        </a>
      )}
    </div>
>>>>>>> theirs
  );
}
