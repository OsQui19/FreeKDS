import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { useTheme } from '@/contexts/ThemeContext.jsx';

export default function AppNavbar() {
  const { theme, toggleTheme } = useTheme();
  return (
    <Navbar bg="light" expand="lg" className="mb-3">
      <Container>
        <Navbar.Brand href="/">FreeKDS</Navbar.Brand>
        <Navbar.Toggle aria-controls="app-navbar" />
        <Navbar.Collapse id="app-navbar">
          <Nav className="me-auto">
            <Nav.Link href="/dashboard">Dashboard</Nav.Link>
            <Nav.Link href="/admin">Admin</Nav.Link>
          </Nav>
          <Button variant="secondary" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
