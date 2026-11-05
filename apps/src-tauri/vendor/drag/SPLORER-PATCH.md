# Splorer patch for drag 2.1.0 (crabnebula-dev/drag-rs)

Vendored via `[patch.crates-io]` in apps/src-tauri/Cargo.toml.

Changes in `src/platform_impl/gtk/mod.rs` (Linux only):

1. Cleanup of the GTK drag signal handlers moved from `drop-performed` to `drag-end`.
   Upstream disconnected the `drag-data-get` handler before the drop target requested
   the data, so external apps (Telegram, browsers, Konsole) accepted the drop but
   received no files.
2. File URIs are built with `glib::filename_to_uri` (percent-encoded) instead of
   `format!("file://{}")`, so paths with spaces/umlauts work.

Bug is still present upstream (drag 2.1.1). Drop this vendor copy once fixed upstream.
