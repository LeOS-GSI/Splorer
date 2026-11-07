use crate::extensions::types::*;
use tauri::command;

use super::{get_extensions_tmp_dir, safe_extract_zip, validate_extension_id, EXTENSION_MANAGER};

#[command]
pub async fn install_extension_from_path(
    extension_path: String,
) -> Result<ExtensionPackage, String> {
    let mut manager_guard = EXTENSION_MANAGER.lock().map_err(|e| e.to_string())?;
    if let Some(manager) = manager_guard.as_mut() {
        manager.install_extension(&extension_path)
    } else {
        Err("Extension manager not initialized".to_string())
    }
}

#[command]
pub async fn uninstall_extension_by_id(extension_id: String) -> Result<(), String> {
    validate_extension_id(&extension_id)?;
    let mut manager_guard = EXTENSION_MANAGER.lock().map_err(|e| e.to_string())?;
    if let Some(manager) = manager_guard.as_mut() {
        manager.uninstall_extension(&extension_id)
    } else {
        Err("Extension manager not initialized".to_string())
    }
}

/// Install an extension from a .xtension file.
/// Extracts the ZIP, parses the manifest, and installs via the extension manager.
#[command]
pub async fn install_xtension_file(xtension_path: String) -> Result<ExtensionPackage, String> {
    use std::path::Path;

    let file_path = Path::new(&xtension_path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", xtension_path));
    }

    // Verify it has the .xtension extension
    match file_path.extension().and_then(|e| e.to_str()) {
        Some("xtension") => {}
        _ => return Err("File must have .xtension extension".to_string()),
    }

    // Create temp extraction directory inside the extensions directory
    let temp_dir = get_extensions_tmp_dir()?;
    std::fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // Generate a unique extraction folder name
    let stem = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("extension");
    let extract_dir = temp_dir.join(stem);
    if extract_dir.exists() {
        std::fs::remove_dir_all(&extract_dir).map_err(|e| e.to_string())?;
    }

    // Extract the ZIP safely (Zip Slip protection)
    safe_extract_zip(file_path, &extract_dir)?;

    // Install via the extension manager
    let mut manager_guard = EXTENSION_MANAGER.lock().map_err(|e| e.to_string())?;
    let manager = manager_guard
        .as_mut()
        .ok_or("Extension manager not initialized")?;

    let result = manager.install_extension(extract_dir.to_str().ok_or("Invalid path")?);

    // Cleanup temp extraction
    let _ = std::fs::remove_dir_all(&extract_dir);

    result
}
