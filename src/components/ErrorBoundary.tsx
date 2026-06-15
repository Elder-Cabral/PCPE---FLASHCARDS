import React, { Component, ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary captured:', error, info);
    // TODO: integrate with Sentry or other monitoring here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: '#111827',
          color: '#f1f5f9',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h2>Algo deu errado 😞</h2>
          <p>Ocorreu um erro inesperado. Por favor, recarregue a página ou tente novamente mais tarde.</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-hover"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: '10px 16px',
              color: '#94a3b8',
              cursor: 'pointer',
              marginTop: 16
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
