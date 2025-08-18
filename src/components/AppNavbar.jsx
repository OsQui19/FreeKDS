import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { usePlugins } from '@/plugins/PluginManager.jsx';
import { getToken } from '@/utils/tokens.js';

export default function AppNavbar() {
  const { theme, toggleTheme } = useTheme();
  const { plugins } = usePlugins();
  const surface = getToken('color.surface');
  const text = getToken('color.text');
  const accent = getToken('color.accent');
  return (
    <Navbar expand="lg" className="mb-3" style={{ backgroundColor: surface, color: text }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: text }}>
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
          <Button
            onClick={toggleTheme}
            style={{ backgroundColor: accent, borderColor: accent }}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

