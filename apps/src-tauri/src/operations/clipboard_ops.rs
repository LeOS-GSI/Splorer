//! System-Clipboard: kopierte/ausgeschnittene Dateien auch für andere
//! Programme (Telegram, Browser, Dolphin, …) bereitstellen.
//!
//! Unter Linux werden die Pfade als `text/uri-list` angeboten (X11 und
//! Wayland/data-control). Die `Clipboard`-Instanz wird global gehalten,
//! damit der Besitz der Auswahl nicht sofort wieder verloren geht – unter
//! X11 muss der Prozess die Anfragen anderer Programme selbst bedienen.

use std::path::PathBuf;
use std::sync::Mutex;

static SYSTEM_CLIPBOARD: Mutex<Option<arboard::Clipboard>> = Mutex::new(None);

fn write_file_list(paths: &[PathBuf]) -> Result<(), String> {
    let mut guard = SYSTEM_CLIPBOARD
        .lock()
        .map_err(|_| "Clipboard-Lock vergiftet".to_string())?;

    if guard.is_none() {
        *guard = Some(arboard::Clipboard::new().map_err(|e| e.to_string())?);
    }

    let result = guard
        .as_mut()
        .expect("clipboard initialised above")
        .set()
        .file_list(paths)
        .map_err(|e| e.to_string());

    // Bei Fehler Instanz verwerfen, damit der nächste Versuch neu verbindet
    if result.is_err() {
        *guard = None;
    }
    result
}

/// Legt die angegebenen Dateien ins System-Clipboard.
#[tauri::command]
pub async fn set_system_clipboard_files(paths: Vec<String>) -> Result<(), String> {
    let paths: Vec<PathBuf> = paths
        .into_iter()
        .map(PathBuf::from)
        .filter(|p| p.exists())
        .collect();
    if paths.is_empty() {
        return Ok(());
    }

    tokio::task::spawn_blocking(move || write_file_list(&paths))
        .await
        .map_err(|e| e.to_string())?
}
