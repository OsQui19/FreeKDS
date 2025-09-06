import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { usePlugins } from '@/plugins/PluginManager.jsx';

export default function AppNavbar() {
  const { themeName, toggleTheme } = useTheme();
  const { plugins } = usePlugins();
  return (
    <Navbar expand="lg" className="mb-3 pro-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="pro-brand d-flex align-items-center gap-2">
          <span className="pro-brand-dot"></span>
          FreeKDS
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="app-navbar" />
        <Navbar.Collapse id="app-navbar">
          <Nav className="me-auto gap-1">
            <Nav.Link as={Link} to="/dashboard" className="pro-nav-link">
              Dashboard
            </Nav.Link>
            <Nav.Link as={Link} to="/admin" className="pro-nav-link">Admin</Nav.Link>
            {/* Plugin page links are disabled while we stabilize routing */}
          </Nav>
          <div className="d-flex align-items-center gap-2">
            <Button onClick={toggleTheme} className="btn-accent">
              {themeName === 'light' ? 'Dark Mode' : 'Light Mode'}
            </Button>
            <div className="avatar" title="User">U</div>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
