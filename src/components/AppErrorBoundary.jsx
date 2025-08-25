import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to console or send to logging service
    console.error('App crashed:', error, errorInfo);
    // Example: send to backend
    // fetch('/api/log', { method: 'POST', body: JSON.stringify({ error, errorInfo }) });
  }

  render() {
    if (this.state.hasError) {
      return <div>UI failed to load</div>;
    }
    return this.props.children;
  }
}
