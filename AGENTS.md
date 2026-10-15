# Architecture decisions

- Wrap the React app in one root-level error boundary so component crashes show a recoverable screen instead of an empty WebView.