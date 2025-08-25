import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or send to logging service
    console.error('App crashed:', error, errorInfo);

    this.setState({ error, errorInfo });

    try {
      fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: error.toString(), errorInfo }),
      });
    } catch (loggingError) {
      // Ignore logging errors to avoid infinite loops
      console.error('Logging failed:', loggingError);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>Something went wrong.</h1>
          <p>We're sorry, but the application encountered an unexpected error.</p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>
              {this.state.error.toString()}
              <br />
              {this.state.errorInfo?.componentStack}
            </details>
          )}
          <button onClick={this.handleReload} style={{ marginTop: '1rem' }}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
