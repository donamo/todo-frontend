import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { logger } from "../lib/logger";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("React render hiba", { error, componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
          <div className="flex max-w-md items-start gap-3 rounded-lg border border-border bg-card p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <h1 className="text-base font-semibold">Az alkalmazás hibába futott.</h1>
              <p className="mt-1 text-sm text-muted-foreground">Frissítsd az oldalt, vagy nézd meg a konzol logot.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
