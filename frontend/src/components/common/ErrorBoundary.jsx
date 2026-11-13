import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('_r', Date.now());
      window.location.href = url.toString();
    } catch (e) {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Something went wrong</h2>
              <p className="text-xs text-slate-400 mt-1">
                An unexpected error occurred while rendering this page.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-left overflow-auto max-h-36">
                <p className="text-xs font-mono text-red-400 break-words">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
              >
                <RefreshCw size={14} />
                Reload Page
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors border border-slate-700"
              >
                <Home size={14} />
                Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

