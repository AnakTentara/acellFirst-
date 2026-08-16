import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Catches render errors in one panel instead of blanking the whole app.
 *
 * Without this, a single undefined field (a missing import, a null coordinate)
 * unmounted the entire tree and left a white screen with no explanation —
 * which is exactly how the ShoppingTracker crash presented.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('💥 Render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="glass-panel error-boundary">
        <AlertTriangle size={30} className="error-boundary-icon" />
        <h3>Bagian ini gagal dimuat</h3>
        <p>
          Bagian lain aplikasi masih aman. Coba muat ulang panel ini — kalau
          masih error, tunjukkan pesan di bawah ke Haikal.
        </p>
        <pre className="error-boundary-detail">{String(this.state.error?.message || this.state.error)}</pre>
        <button
          type="button"
          className="glass-btn glass-btn-primary"
          onClick={() => this.setState({ error: null })}
        >
          <RotateCcw size={16} />
          <span>Coba Lagi</span>
        </button>
      </div>
    );
  }
}
