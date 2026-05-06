/**
 * @module @architext/web/ErrorBoundary
 * Concepts: [[ErrorBoundary]], [[GracefulRecovery]]
 * Spec: Crash recovery — show friendly message instead of blank screen
 * Consumed by: [[main]] (wraps App)
 */

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-gray-50 text-gray-900">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-gray-500">
            An unexpected error occurred. Your work is auto-saved.
          </p>
          <button
            onClick={this.handleReload}
            className="mt-6 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
