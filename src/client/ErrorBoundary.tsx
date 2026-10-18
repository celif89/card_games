// Gdy coś się wywróci przy wyświetlaniu, pokazujemy komunikat zamiast pustej strony.
import { Component, type ReactNode } from 'react';
import { clearSavedGame } from './net.ts';

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="home crash">
        <h1>Ups, coś poszło nie tak</h1>
        <p>Gra napotkała błąd. Zwykle pomaga powrót do ekranu startowego — zapisana gra w tej przeglądarce zostanie wtedy usunięta.</p>
        <button
          className="primary"
          onClick={() => {
            clearSavedGame();
            location.href = location.pathname;
          }}
        >
          Wróć do ekranu startowego
        </button>
        <button onClick={() => location.reload()}>Spróbuj ponownie</button>
        <details>
          <summary>Szczegóły błędu</summary>
          <code>{this.state.error.message}</code>
        </details>
      </div>
    );
  }
}
