import React, { Component, type ErrorInfo, type ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    // You could also log the error to an error reporting service here
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      // Check if the error message indicates context invalidation for a more specific message
      const errorMessage = this.state.error?.message || ""
      const isContextInvalidated =
        errorMessage.includes("Extension context invalidated") ||
        errorMessage.includes("Context invalidated") ||
        errorMessage.includes("InvalidStateError")

      if (isContextInvalidated) {
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              padding: "20px",
              textAlign: "center"
            }}>
            <h1 style={{ fontSize: "1.2em", marginBottom: "10px" }}>
              Extension Context Invalidated
            </h1>
            <p style={{ marginBottom: "15px", fontSize: "0.9em" }}>
              The connection to the extension was lost. Please reload.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                padding: "8px 15px",
                fontSize: "0.9em",
                cursor: "pointer",
                border: "1px solid #ccc",
                borderRadius: "4px"
              }}>
              Reload Extension View
            </button>
          </div>
        )
      }

      // Generic fallback UI
      return (
        <div style={{ padding: "20px", textAlign: "center" }}>
          <h1>Something went wrong.</h1>
          <p>Please try reloading the extension view.</p>
          <button onClick={this.handleReload}>Reload</button>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
