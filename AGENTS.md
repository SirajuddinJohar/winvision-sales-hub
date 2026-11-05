# AGENTS.md

- Wrap the React app in one root-level error boundary so component crashes show a recoverable screen instead of an empty WebView.
- Admin Excel exports (DataExport page) join name lookups in code instead of PostgREST embeds, because the live schema's FKs are inconsistent and several reference `auth.users`, which PostgREST cannot embed.
