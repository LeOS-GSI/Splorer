// User directory, recent-folder and system-info helpers.
// (Split out of the former ai.rs when the AI features were removed.)

use serde::{Deserialize, Serialize};
use std::env;
use std::sync::{Arc, LazyLock, Mutex};
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
pub struct UserDirectories {
    pub home: String,
    pub documents: String,
    pub downloads: String,
    pub desktop: String,
    pub pictures: String,
    pub videos: String,
    pub music: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub os: String,
    pub arch: String,
    pub version: String,
    pub hostname: String,
}

static RECENT_FOLDERS: LazyLock<Arc<Mutex<Vec<String>>>> =
    LazyLock::new(|| Arc::new(Mutex::new(Vec::new())));

// User directory operations
#[command]
pub async fn get_user_directories() -> Result<UserDirectories, String> {
    let home_path =
        dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    let home = home_path.to_string_lossy().to_string();

    Ok(UserDirectories {
        home: home.clone(),
        documents: home_path.join("Documents").to_string_lossy().to_string(),
        downloads: home_path.join("Downloads").to_string_lossy().to_string(),
        desktop: home_path.join("Desktop").to_string_lossy().to_string(),
        pictures: home_path.join("Pictures").to_string_lossy().to_string(),
        videos: home_path.join("Videos").to_string_lossy().to_string(),
        music: home_path.join("Music").to_string_lossy().to_string(),
    })
}

#[command]
pub async fn get_recent_folders() -> Result<Vec<String>, String> {
    let recent_folders = RECENT_FOLDERS.lock().map_err(|e| e.to_string())?;
    Ok(recent_folders.clone())
}

#[command]
pub async fn add_to_recent_folders(path: String) -> Result<(), String> {
    let mut recent_folders = RECENT_FOLDERS.lock().map_err(|e| e.to_string())?;

    // Remove if already exists
    recent_folders.retain(|p| p != &path);

    // Add to front
    recent_folders.insert(0, path);

    // Keep only last 10
    if recent_folders.len() > 10 {
        recent_folders.truncate(10);
    }

    Ok(())
}

#[command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let os = env::consts::OS.to_string();
    let arch = env::consts::ARCH.to_string();
    let version = env::var("OS").unwrap_or_else(|_| "Unknown".to_string());
    let hostname = env::var("COMPUTERNAME")
        .or_else(|_| env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Unknown".to_string());

    Ok(SystemInfo {
        os,
        arch,
        version,
        hostname,
    })
}
