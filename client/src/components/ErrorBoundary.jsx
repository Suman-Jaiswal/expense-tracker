import { CopyOutlined } from "@ant-design/icons";
import { Button, Result, message } from "antd";
import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleCopyError = () => {
    const errorText = `Error: ${
      this.state.error?.toString() || "Unknown error"
    }\n\nStack Trace:\n${
      this.state.errorInfo?.componentStack || "No stack trace available"
    }`;

    navigator.clipboard
      .writeText(errorText)
      .then(() => {
        message.success("Error details copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement("textarea");
        textArea.value = errorText;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          message.success("Error details copied to clipboard!");
        } catch (err) {
          message.error("Failed to copy error details");
        }
        document.body.removeChild(textArea);
      });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "50px", textAlign: "center" }}>
          <Result
            status="500"
            title="Oops! Something went wrong"
            subTitle="Sorry, an unexpected error has occurred. Please try refreshing the page."
            extra={[
              <Button type="primary" onClick={this.handleReset} key="refresh">
                Refresh Page
              </Button>,
              this.state.error && (
                <Button
                  icon={<CopyOutlined />}
                  onClick={this.handleCopyError}
                  key="copy"
                >
                  Copy Error Details
                </Button>
              ),
            ]}
          />
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details
              style={{
                marginTop: "20px",
                textAlign: "left",
                padding: "20px",
                backgroundColor: "#f5f5f5",
                borderRadius: "4px",
                maxWidth: "800px",
                margin: "20px auto",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: "bold",
                  marginBottom: "10px",
                }}
              >
                Error Details (Development Only)
              </summary>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: "10px",
                }}
              >
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={this.handleCopyError}
                >
                  Copy
                </Button>
              </div>
              <pre
                style={{
                  marginTop: "10px",
                  overflow: "auto",
                  backgroundColor: "#ffffff",
                  padding: "15px",
                  borderRadius: "4px",
                  border: "1px solid #d9d9d9",
                }}
              >
                {this.state.error.toString()}
                {"\n\n"}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
