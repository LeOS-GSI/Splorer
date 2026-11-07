// Splorer Search Engine — Tauri Command Wrappers
//
// Drop-in replacements for the old tokenizer.rs Tauri commands.
// They delegate to the global SearchEngine singleton.
// Signatures match the old commands (async fn, Result<T, String>).

use super::SearchResult;

use super::compat_engine::get_search_engine;
use super::compat_types::{
    CompatStructuredQuery, EnhancedSearchResult, FileToken, TokenizerSettings, TokenizerStats,
    DEFAULT_RECOMMENDATION_LIMIT, DEFAULT_SEARCH_LIMIT,
};

#[tauri::command]
pub async fn set_tokenizer_settings(settings: TokenizerSettings) -> Result<(), String> {
    get_search_engine().set_settings(settings);
    Ok(())
}

#[tauri::command]
pub async fn get_tokenizer_settings() -> Result<TokenizerSettings, String> {
    Ok(get_search_engine().get_settings())
}

#[tauri::command]
pub async fn rebuild_token_index() -> Result<(), String> {
    let engine = get_search_engine();
    if engine.is_indexing() {
        return Err("Indexing is already in progress".to_string());
    }
    engine.rebuild_full_index();
    Ok(())
}

#[tauri::command]
pub async fn search_tokens(
    query: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    tokio::task::spawn_blocking(move || {
        Ok(get_search_engine().search(&query, limit.unwrap_or(DEFAULT_SEARCH_LIMIT)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn natural_language_search(
    query: String,
    language: Option<String>,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    tokio::task::spawn_blocking(move || {
        Ok(get_search_engine().natural_language_search(
            &query,
            language.as_deref(),
            limit.unwrap_or(DEFAULT_SEARCH_LIMIT),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_tokenizer_stats() -> Result<Option<TokenizerStats>, String> {
    tokio::task::spawn_blocking(move || Ok(get_search_engine().get_stats()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn is_tokenizer_indexing() -> Result<bool, String> {
    tokio::task::spawn_blocking(move || Ok(get_search_engine().is_indexing()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_file_tokens(file_path: String) -> Result<Option<FileToken>, String> {
    tokio::task::spawn_blocking(move || Ok(get_search_engine().get_file_tokens(&file_path)))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn add_path_to_tokenizer(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        get_search_engine().add_path(path);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn get_file_recommendations(
    file_path: String,
    limit: Option<usize>,
) -> Result<Vec<SearchResult>, String> {
    tokio::task::spawn_blocking(move || {
        Ok(get_search_engine()
            .get_file_recommendations(&file_path, limit.unwrap_or(DEFAULT_RECOMMENDATION_LIMIT)))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn parse_search_query(
    query: String,
    _language: Option<String>,
) -> Result<CompatStructuredQuery, String> {
    tokio::task::spawn_blocking(move || {
        Ok(get_search_engine().parse_search_query(&query, _language.as_deref()))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn enhanced_search(
    query: String,
    language: Option<String>,
    limit: Option<usize>,
) -> Result<EnhancedSearchResult, String> {
    tokio::task::spawn_blocking(move || {
        Ok(get_search_engine().enhanced_search(
            &query,
            language.as_deref(),
            limit.unwrap_or(DEFAULT_SEARCH_LIMIT),
        ))
    })
    .await
    .map_err(|e| e.to_string())?
}

// ===== Auto-index and context commands =======================================

#[tauri::command]
pub async fn index_directory(path: String, max_depth: Option<u32>) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        get_search_engine().index_directory(&path, max_depth);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn set_search_context(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        get_search_engine().set_context_path(&path);
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn add_whitelisted_path(path: String) -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let engine = get_search_engine();
        let mut settings = engine.get_settings();

        // Check blacklisted paths -- don't add if blacklisted.
        for bp in &settings.blacklisted_paths {
            let norm_bp = bp.replace('\\', "/").to_lowercase();
            let norm_path = path.replace('\\', "/").to_lowercase();
            if norm_path.starts_with(&norm_bp) {
                return Ok(());
            }
        }

        if !settings.whitelisted_paths.contains(&path) {
            settings.whitelisted_paths.push(path);
            engine.set_settings(settings);
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
}
