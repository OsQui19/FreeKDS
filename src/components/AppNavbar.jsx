import React from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext.jsx';
import { usePlugins } from '@/plugins/PluginManager.jsx';
import { resolveTokens } from '@/utils/tokens.js';

const DEFAULT_TOKENS = {
  color: {
    surface: { $value: '#f8f9fa' },
    text: { $value: '#212529' },
    accent: { $value: '#0d6efd' },
  },
};

export default function AppNavbar() {
  const { themeName, toggleTheme } = useTheme();
  const { plugins } = usePlugins();
  const [tokens, setTokens] = React.useState(DEFAULT_TOKENS);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    const loadTokens = async (retries = 3) => {
      try {
        const t = await resolveTokens();
        const merged = {
          ...DEFAULT_TOKENS,
          ...t,
          color: { ...DEFAULT_TOKENS.color, ...(t?.color || {}) },
        };
        if (isMounted) setTokens(merged);
      } catch (err) {
        if (retries > 0) {
          setTimeout(() => loadTokens(retries - 1), 500);
        } else {
          console.error('Failed to load tokens', err);
          if (isMounted) setError(true);
        }
      }
    };

    loadTokens();
    return () => {
      isMounted = false;
    };
  }, []);

  const surface = tokens.color?.surface?.$value ?? DEFAULT_TOKENS.color.surface.$value;
  const text = tokens.color?.text?.$value ?? DEFAULT_TOKENS.color.text.$value;
  const accent = tokens.color?.accent?.$value ?? DEFAULT_TOKENS.color.accent.$value;
  return (
    <Navbar expand="lg" className="mb-3" style={{ backgroundColor: surface, color: text }}>
      <Container>
        <Navbar.Brand as={Link} to="/" style={{ color: text }}>
          FreeKDS
        </Navbar.Brand>
        {error && (
          <div className="ms-2 text-warning small">Default theme applied</div>
        )}
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
            {themeName === 'light' ? 'Dark Mode' : 'Light Mode'}
          </Button>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

