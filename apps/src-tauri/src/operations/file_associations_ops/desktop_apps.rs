//! Real "Open With" support for Linux.
//!
//! Scans freedesktop `.desktop` entries (system, user, Flatpak, Snap),
//! matches them against the MIME type of a file and launches the chosen
//! application by expanding its `Exec=` line according to the Desktop Entry
//! specification. On other platforms the commands return empty results.

use serde::Serialize;
use tauri::command;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopApp {
    /// Desktop file ID, e.g. `org.kde.gwenview.desktop`
    pub id: String,
    /// Localised display name
    pub name: String,
    /// Localised comment / generic name
    pub comment: Option<String>,
    /// Icon as data URL (`data:image/png;base64,...`), if it could be resolved
    pub icon: Option<String>,
    /// System default application for this MIME type
    pub is_default: bool,
    /// Declares support for this MIME type
    pub recommended: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenWithApps {
    pub mime_type: String,
    pub apps: Vec<DesktopApp>,
}

/// List applications that can open `file_path`. Recommended apps (matching
/// MIME type) come first, the default app at the very top, followed by all
/// other installed applications.
#[command]
pub async fn list_open_with_apps(file_path: String) -> Result<OpenWithApps, String> {
    crate::operations::validate_file_path(&file_path)?;

    #[cfg(target_os = "linux")]
    {
        tauri::async_runtime::spawn_blocking(move || linux::list_apps(&file_path))
            .await
            .map_err(|e| format!("Failed to list applications: {}", e))?
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = file_path;
        Ok(OpenWithApps {
            mime_type: String::new(),
            apps: Vec::new(),
        })
    }
}

/// Launch the application identified by `desktop_id` with the given files.
#[command]
pub async fn launch_desktop_app(desktop_id: String, file_paths: Vec<String>) -> Result<(), String> {
    for p in &file_paths {
        crate::operations::validate_file_path(p)?;
        if !std::path::Path::new(p).exists() {
            return Err(format!("File does not exist: {}", p));
        }
    }

    #[cfg(target_os = "linux")]
    {
        tauri::async_runtime::spawn_blocking(move || linux::launch(&desktop_id, &file_paths))
            .await
            .map_err(|e| format!("Failed to launch application: {}", e))?
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = (desktop_id, file_paths);
        Err("Launching desktop applications is only supported on Linux".to_string())
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use super::{DesktopApp, OpenWithApps};
    use base64::Engine;
    use std::collections::{HashMap, HashSet};
    use std::path::{Path, PathBuf};
    use std::process::{Command, Stdio};

    #[derive(Debug, Clone, Default)]
    pub(super) struct Entry {
        pub id: String,
        pub path: PathBuf,
        pub name: String,
        pub comment: Option<String>,
        pub exec: String,
        pub icon: Option<String>,
        pub mime_types: Vec<String>,
        pub terminal: bool,
        pub no_display: bool,
    }

    // ── XDG directories ─────────────────────────────────────────────────────

    fn home() -> PathBuf {
        dirs::home_dir().unwrap_or_else(|| PathBuf::from("/"))
    }

    fn data_dirs() -> Vec<PathBuf> {
        let mut out: Vec<PathBuf> = Vec::new();
        let data_home = std::env::var("XDG_DATA_HOME")
            .ok()
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| home().join(".local/share"));
        out.push(data_home);

        let sys = std::env::var("XDG_DATA_DIRS")
            .ok()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "/usr/local/share:/usr/share".to_string());
        out.extend(sys.split(':').filter(|s| !s.is_empty()).map(PathBuf::from));

        // Make sure Flatpak / Snap exports are found even if XDG_DATA_DIRS
        // was not set up by the session.
        out.push(home().join(".local/share/flatpak/exports/share"));
        out.push(PathBuf::from("/var/lib/flatpak/exports/share"));
        out.push(PathBuf::from("/var/lib/snapd/desktop"));
        out.push(PathBuf::from("/usr/local/share"));
        out.push(PathBuf::from("/usr/share"));

        let mut seen = HashSet::new();
        out.retain(|p| seen.insert(p.clone()));
        out
    }

    fn config_dirs() -> Vec<PathBuf> {
        let mut out = vec![std::env::var("XDG_CONFIG_HOME")
            .ok()
            .filter(|s| !s.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| home().join(".config"))];
        let sys = std::env::var("XDG_CONFIG_DIRS")
            .ok()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "/etc/xdg".to_string());
        out.extend(sys.split(':').filter(|s| !s.is_empty()).map(PathBuf::from));
        out
    }

    // ── Locale ──────────────────────────────────────────────────────────────

    /// Locale keys to try, most specific first: `de_AT`, `de`.
    fn locale_keys() -> Vec<String> {
        let raw = ["LC_ALL", "LC_MESSAGES", "LANG"]
            .iter()
            .filter_map(|k| std::env::var(k).ok())
            .find(|v| !v.is_empty() && v != "C" && v != "POSIX")
            .unwrap_or_default();
        let base = raw.split('.').next().unwrap_or("").split('@').next().unwrap_or("");
        let mut keys = Vec::new();
        if !base.is_empty() {
            keys.push(base.to_string());
            if let Some((lang, _)) = base.split_once('_') {
                keys.push(lang.to_string());
            }
        }
        keys
    }

    // ── .desktop parsing ────────────────────────────────────────────────────

    /// Unescape a desktop entry string value (`\s`, `\n`, `\t`, `\r`, `\\`).
    fn unescape_value(v: &str) -> String {
        let mut out = String::with_capacity(v.len());
        let mut chars = v.chars();
        while let Some(c) = chars.next() {
            if c == '\\' {
                match chars.next() {
                    Some('s') => out.push(' '),
                    Some('n') => out.push('\n'),
                    Some('t') => out.push('\t'),
                    Some('r') => out.push('\r'),
                    Some('\\') => out.push('\\'),
                    Some(o) => {
                        out.push('\\');
                        out.push(o);
                    }
                    None => out.push('\\'),
                }
            } else {
                out.push(c);
            }
        }
        out
    }

    /// Parse a desktop file. Returns `Ok(None)` for entries that are hidden
    /// (they still shadow entries with the same ID in lower-priority dirs).
    pub(super) fn parse_desktop(
        id: &str,
        path: &Path,
        content: &str,
        locales: &[String],
    ) -> Option<Entry> {
        let mut in_main = false;
        let mut kv: HashMap<String, String> = HashMap::new();
        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if line.starts_with('[') {
                in_main = line == "[Desktop Entry]";
                continue;
            }
            if !in_main {
                continue;
            }
            if let Some((k, v)) = line.split_once('=') {
                kv.entry(k.trim().to_string())
                    .or_insert_with(|| v.trim().to_string());
            }
        }

        let localized = |key: &str| -> Option<String> {
            for l in locales {
                if let Some(v) = kv.get(&format!("{}[{}]", key, l)) {
                    if !v.is_empty() {
                        return Some(unescape_value(v));
                    }
                }
            }
            kv.get(key).filter(|v| !v.is_empty()).map(|v| unescape_value(v))
        };
        let is_true = |key: &str| kv.get(key).map(|v| v == "true").unwrap_or(false);

        if kv.get("Type").map(|t| t != "Application").unwrap_or(true) {
            return None;
        }
        if is_true("Hidden") {
            return None;
        }
        let exec = kv.get("Exec").cloned().unwrap_or_default();
        if exec.is_empty() {
            return None;
        }
        if let Some(try_exec) = kv.get("TryExec").filter(|v| !v.is_empty()) {
            if find_in_path(&unescape_value(try_exec)).is_none() {
                return None;
            }
        }
        let name = localized("Name")?;

        let comment = localized("GenericName").or_else(|| localized("Comment"));
        let mime_types = kv
            .get("MimeType")
            .map(|m| {
                m.split(';')
                    .map(|s| s.trim().to_lowercase())
                    .filter(|s| !s.is_empty())
                    .collect()
            })
            .unwrap_or_default();

        Some(Entry {
            id: id.to_string(),
            path: path.to_path_buf(),
            name,
            comment,
            exec,
            icon: localized("Icon"),
            mime_types,
            terminal: is_true("Terminal"),
            no_display: is_true("NoDisplay"),
        })
    }

    fn find_in_path(bin: &str) -> Option<PathBuf> {
        if bin.contains('/') {
            let p = PathBuf::from(bin);
            return p.exists().then_some(p);
        }
        std::env::var_os("PATH").and_then(|paths| {
            std::env::split_paths(&paths)
                .map(|d| d.join(bin))
                .find(|p| p.is_file())
        })
    }

    fn collect_desktop_files(base: &Path, dir: &Path, out: &mut Vec<(String, PathBuf)>, depth: u8) {
        if depth > 4 {
            return;
        }
        let Ok(entries) = std::fs::read_dir(dir) else { return };
        let mut entries: Vec<_> = entries.flatten().collect();
        entries.sort_by_key(|e| e.file_name());
        for e in entries {
            let p = e.path();
            if p.is_dir() {
                collect_desktop_files(base, &p, out, depth + 1);
            } else if p.extension().map(|x| x == "desktop").unwrap_or(false) {
                if let Ok(rel) = p.strip_prefix(base) {
                    let id = rel.to_string_lossy().replace('/', "-");
                    out.push((id, p));
                }
            }
        }
    }

    /// All visible desktop entries, user dirs first (shadowing system ones).
    pub(super) fn all_entries() -> Vec<Entry> {
        let locales = locale_keys();
        let mut seen: HashSet<String> = HashSet::new();
        let mut result = Vec::new();
        for d in data_dirs() {
            let apps_dir = d.join("applications");
            let mut files = Vec::new();
            collect_desktop_files(&apps_dir, &apps_dir, &mut files, 0);
            for (id, path) in files {
                if !seen.insert(id.clone()) {
                    continue;
                }
                let Ok(content) = std::fs::read_to_string(&path) else { continue };
                if let Some(entry) = parse_desktop(&id, &path, &content, &locales) {
                    result.push(entry);
                }
            }
        }
        result
    }

    // ── MIME handling ───────────────────────────────────────────────────────

    fn run_trimmed(cmd: &str, args: &[&str]) -> Option<String> {
        let out = Command::new(cmd)
            .args(args)
            .stdin(Stdio::null())
            .stderr(Stdio::null())
            .output()
            .ok()?;
        if !out.status.success() {
            return None;
        }
        let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
        (!s.is_empty()).then_some(s)
    }

    /// Look the file name up in shared-mime-info's `globs2` database.
    pub(super) fn mime_from_globs(file_name: &str, globs2: &str) -> Option<String> {
        let lower = file_name.to_lowercase();
        let mut best: Option<(u32, usize, String)> = None;
        for line in globs2.lines() {
            if line.starts_with('#') {
                continue;
            }
            let mut parts = line.splitn(4, ':');
            let (Some(w), Some(mime), Some(glob)) = (parts.next(), parts.next(), parts.next())
            else {
                continue;
            };
            let case_sensitive = parts.next().map(|f| f.contains("cs")).unwrap_or(false);
            let weight: u32 = w.parse().unwrap_or(50);
            let (name, pat) = if case_sensitive {
                (file_name.to_string(), glob.to_string())
            } else {
                (lower.clone(), glob.to_lowercase())
            };
            let hit = if let Some(suffix) = pat.strip_prefix('*') {
                !suffix.contains(['*', '?', '[']) && name.ends_with(suffix)
            } else {
                !pat.contains(['*', '?', '[']) && name == pat
            };
            if hit {
                let better = match &best {
                    None => true,
                    Some((bw, bl, _)) => weight > *bw || (weight == *bw && pat.len() > *bl),
                };
                if better {
                    best = Some((weight, pat.len(), mime.to_string()));
                }
            }
        }
        best.map(|(_, _, m)| m)
    }

    fn detect_mime(file: &str) -> String {
        let file_name = Path::new(file)
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        data_dirs()
            .into_iter()
            .filter_map(|d| std::fs::read_to_string(d.join("mime/globs2")).ok())
            .find_map(|g| mime_from_globs(&file_name, &g))
            .or_else(|| run_trimmed("xdg-mime", &["query", "filetype", file]))
            .or_else(|| run_trimmed("file", &["--brief", "--mime-type", file]))
            .map(|s| s.split(';').next().unwrap_or("").trim().to_lowercase())
            .filter(|s| s.contains('/'))
            .unwrap_or_else(|| "application/octet-stream".to_string())
    }

    /// Read a group from all mimeapps.list files (highest priority first).
    fn mimeapps_group(group: &str, mime: &str) -> Vec<String> {
        let desktop = std::env::var("XDG_CURRENT_DESKTOP")
            .unwrap_or_default()
            .to_lowercase();
        let mut files: Vec<PathBuf> = Vec::new();
        for d in config_dirs() {
            for de in desktop.split(':').filter(|s| !s.is_empty()) {
                files.push(d.join(format!("{}-mimeapps.list", de)));
            }
            files.push(d.join("mimeapps.list"));
        }
        for d in data_dirs() {
            files.push(d.join("applications/mimeapps.list"));
            files.push(d.join("applications/defaults.list"));
        }

        let header = format!("[{}]", group);
        let mut out = Vec::new();
        for f in files {
            let Ok(content) = std::fs::read_to_string(&f) else { continue };
            let mut in_group = false;
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with('[') {
                    in_group = line == header;
                    continue;
                }
                if !in_group {
                    continue;
                }
                if let Some((k, v)) = line.split_once('=') {
                    if k.trim().eq_ignore_ascii_case(mime) {
                        for id in v.split(';').map(str::trim).filter(|s| !s.is_empty()) {
                            if !out.iter().any(|x| x == id) {
                                out.push(id.to_string());
                            }
                        }
                    }
                }
            }
        }
        out
    }

    fn default_app_for(mime: &str) -> Option<String> {
        run_trimmed("xdg-mime", &["query", "default", mime])
            .or_else(|| mimeapps_group("Default Applications", mime).into_iter().next())
    }

    /// Does an app declaring `declared` handle `mime`?
    pub(super) fn mime_matches(declared: &[String], mime: &str) -> bool {
        let major = mime.split('/').next().unwrap_or("");
        declared.iter().any(|d| {
            d == mime
                || (d.ends_with("/*") && d.trim_end_matches("/*") == major)
                // Every text/* file can be shown by a plain-text editor
                || (major == "text" && d == "text/plain")
        })
    }

    // ── Icons ───────────────────────────────────────────────────────────────

    fn icon_theme() -> Option<String> {
        let kdeglobals = config_dirs().into_iter().next()?.join("kdeglobals");
        let content = std::fs::read_to_string(kdeglobals).ok()?;
        let mut in_icons = false;
        for line in content.lines() {
            let line = line.trim();
            if line.starts_with('[') {
                in_icons = line == "[Icons]";
            } else if in_icons {
                if let Some(v) = line.strip_prefix("Theme=") {
                    return Some(v.trim().to_string());
                }
            }
        }
        None
    }

    struct IconResolver {
        roots: Vec<PathBuf>,
        cache: HashMap<String, Option<String>>,
    }

    impl IconResolver {
        fn new() -> Self {
            let mut themes: Vec<String> = Vec::new();
            if let Some(t) = icon_theme() {
                themes.push(t);
            }
            for t in ["breeze", "Papirus", "Adwaita", "hicolor"] {
                if !themes.iter().any(|x| x == t) {
                    themes.push(t.to_string());
                }
            }
            let mut bases = vec![home().join(".icons")];
            bases.extend(data_dirs().into_iter().map(|d| d.join("icons")));
            let mut roots = Vec::new();
            for t in &themes {
                for b in &bases {
                    let r = b.join(t);
                    if r.is_dir() {
                        roots.push(r);
                    }
                }
            }
            Self { roots, cache: HashMap::new() }
        }

        fn to_data_url(path: &Path) -> Option<String> {
            let meta = std::fs::metadata(path).ok()?;
            if !meta.is_file() || meta.len() > 256 * 1024 {
                return None;
            }
            let mime = match path.extension()?.to_str()?.to_lowercase().as_str() {
                "png" => "image/png",
                "svg" => "image/svg+xml",
                "jpg" | "jpeg" => "image/jpeg",
                _ => return None,
            };
            let bytes = std::fs::read(path).ok()?;
            Some(format!(
                "data:{};base64,{}",
                mime,
                base64::engine::general_purpose::STANDARD.encode(bytes)
            ))
        }

        fn resolve(&mut self, icon: &str) -> Option<String> {
            if let Some(c) = self.cache.get(icon) {
                return c.clone();
            }
            let found = self.find(icon).and_then(|p| Self::to_data_url(&p));
            self.cache.insert(icon.to_string(), found.clone());
            found
        }

        fn find(&self, icon: &str) -> Option<PathBuf> {
            if icon.starts_with('/') {
                let p = PathBuf::from(icon);
                return p.is_file().then_some(p);
            }
            const SUBDIRS: &[&str] = &[
                "48x48/apps", "apps/48", "64x64/apps", "apps/64", "scalable/apps",
                "apps/scalable", "128x128/apps", "96x96/apps", "32x32/apps", "apps/32",
                "256x256/apps", "48x48/mimetypes", "scalable/mimetypes",
                "48x48/categories", "scalable/categories",
            ];
            for root in &self.roots {
                for sub in SUBDIRS {
                    for ext in ["svg", "png"] {
                        let p = root.join(sub).join(format!("{}.{}", icon, ext));
                        if p.is_file() {
                            return Some(p);
                        }
                    }
                }
            }
            for d in data_dirs() {
                for ext in ["svg", "png"] {
                    let p = d.join("pixmaps").join(format!("{}.{}", icon, ext));
                    if p.is_file() {
                        return Some(p);
                    }
                }
            }
            None
        }
    }

    // ── Public operations ───────────────────────────────────────────────────

    pub fn list_apps(file: &str) -> Result<OpenWithApps, String> {
        let mime = detect_mime(file);
        let default_id = default_app_for(&mime);
        let added = mimeapps_group("Added Associations", &mime);
        let removed = mimeapps_group("Removed Associations", &mime);

        let mut icons = IconResolver::new();
        let mut apps: Vec<DesktopApp> = all_entries()
            .into_iter()
            .filter_map(|e| {
                let is_default = default_id.as_deref() == Some(e.id.as_str());
                let recommended = is_default
                    || added.contains(&e.id)
                    || (mime_matches(&e.mime_types, &mime) && !removed.contains(&e.id));
                // Hidden helper entries only make sense when they handle the type
                if e.no_display && !recommended {
                    return None;
                }
                Some(DesktopApp {
                    icon: e.icon.as_deref().and_then(|i| icons.resolve(i)),
                    id: e.id,
                    name: e.name,
                    comment: e.comment,
                    is_default,
                    recommended,
                })
            })
            .collect();

        apps.sort_by(|a, b| {
            b.is_default
                .cmp(&a.is_default)
                .then(b.recommended.cmp(&a.recommended))
                .then(a.name.to_lowercase().cmp(&b.name.to_lowercase()))
        });

        Ok(OpenWithApps { mime_type: mime, apps })
    }

    /// Split an Exec value into arguments following the quoting rules of the
    /// Desktop Entry spec.
    pub(super) fn tokenize_exec(exec: &str) -> Vec<String> {
        let exec = unescape_value(exec);
        let mut args = Vec::new();
        let mut cur = String::new();
        let mut in_quotes = false;
        let mut has_token = false;
        let mut chars = exec.chars().peekable();
        while let Some(c) = chars.next() {
            match c {
                '"' => {
                    in_quotes = !in_quotes;
                    has_token = true;
                }
                '\\' if in_quotes => {
                    if let Some(&n) = chars.peek() {
                        if matches!(n, '"' | '`' | '$' | '\\') {
                            cur.push(n);
                            chars.next();
                            continue;
                        }
                    }
                    cur.push('\\');
                }
                c if c.is_whitespace() && !in_quotes => {
                    if has_token || !cur.is_empty() {
                        args.push(std::mem::take(&mut cur));
                        has_token = false;
                    }
                }
                c => cur.push(c),
            }
        }
        if has_token || !cur.is_empty() {
            args.push(cur);
        }
        args
    }

    /// Expand field codes. Returns one argv per process to start.
    pub(super) fn build_commands(entry: &Entry, files: &[String]) -> Vec<Vec<String>> {
        let tokens = tokenize_exec(&entry.exec);
        let multi = tokens.iter().any(|t| t == "%F" || t == "%U");
        let single = tokens.iter().any(|t| t.contains("%f") || t.contains("%u"));

        let expand = |file_set: &[String]| -> Vec<String> {
            let mut argv = Vec::new();
            for t in &tokens {
                match t.as_str() {
                    "%F" | "%U" => argv.extend(file_set.iter().cloned()),
                    "%i" => {
                        if let Some(icon) = &entry.icon {
                            argv.push("--icon".to_string());
                            argv.push(icon.clone());
                        }
                    }
                    _ => {
                        let mut out = String::new();
                        let mut chars = t.chars().peekable();
                        while let Some(c) = chars.next() {
                            if c != '%' {
                                out.push(c);
                                continue;
                            }
                            match chars.next() {
                                Some('%') => out.push('%'),
                                Some('f') | Some('u') => {
                                    if let Some(f) = file_set.first() {
                                        out.push_str(f);
                                    }
                                }
                                Some('c') => out.push_str(&entry.name),
                                Some('k') => out.push_str(&entry.path.to_string_lossy()),
                                _ => {} // deprecated / unknown codes are dropped
                            }
                        }
                        // Drop arguments that consisted only of a removed field code
                        if !out.is_empty() || !t.starts_with('%') {
                            argv.push(out);
                        }
                    }
                }
            }
            if !multi && !single {
                argv.extend(file_set.iter().cloned());
            }
            argv
        };

        if multi || !single || files.len() <= 1 {
            vec![expand(files)]
        } else {
            files.iter().map(|f| expand(std::slice::from_ref(f))).collect()
        }
    }

    fn wrap_terminal(argv: Vec<String>) -> Vec<String> {
        let candidates: Vec<(String, &str)> = std::env::var("TERMINAL")
            .ok()
            .filter(|s| !s.is_empty())
            .map(|t| vec![(t, "-e")])
            .unwrap_or_default()
            .into_iter()
            .chain(
                [
                    ("x-terminal-emulator", "-e"),
                    ("konsole", "-e"),
                    ("gnome-terminal", "--"),
                    ("xfce4-terminal", "-x"),
                    ("lxterminal", "-e"),
                    ("xterm", "-e"),
                ]
                .into_iter()
                .map(|(a, b)| (a.to_string(), b)),
            )
            .collect();
        for (term, flag) in candidates {
            if find_in_path(&term).is_some() {
                let mut out = vec![term, flag.to_string()];
                out.extend(argv);
                return out;
            }
        }
        argv
    }

    pub fn launch(desktop_id: &str, files: &[String]) -> Result<(), String> {
        let entry = all_entries()
            .into_iter()
            .find(|e| e.id == desktop_id)
            .ok_or_else(|| format!("Application not found: {}", desktop_id))?;

        let cwd = files
            .first()
            .and_then(|f| Path::new(f).parent().map(Path::to_path_buf))
            .unwrap_or_else(home);

        for mut argv in build_commands(&entry, files) {
            if entry.terminal {
                argv = wrap_terminal(argv);
            }
            if argv.is_empty() {
                return Err("Invalid Exec line".to_string());
            }
            let mut cmd = Command::new(&argv[0]);
            cmd.args(&argv[1..])
                .current_dir(&cwd)
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null());
            {
                use std::os::unix::process::CommandExt;
                // Detach from Splorer's process group so closing Splorer
                // does not take the launched application with it.
                cmd.process_group(0);
            }
            let mut child = cmd
                .spawn()
                .map_err(|e| format!("Failed to start {}: {}", entry.name, e))?;
            // Reap the child in the background to avoid zombies.
            std::thread::spawn(move || {
                let _ = child.wait();
            });
        }
        Ok(())
    }
}

#[cfg(all(test, target_os = "linux"))]
mod tests {
    use super::linux::*;
    use std::path::Path;

    const SAMPLE: &str = "[Desktop Entry]\nType=Application\nName=Gwenview\nName[de]=Gwenview DE\nGenericName=Image Viewer\nExec=gwenview %U\nIcon=gwenview\nMimeType=image/png;image/jpeg;\n\n[Desktop Action foo]\nName=Other\nExec=other\n";

    #[test]
    fn parses_main_group_and_locale() {
        let e = parse_desktop("g.desktop", Path::new("/x/g.desktop"), SAMPLE, &["de_AT".into(), "de".into()]).unwrap();
        assert_eq!(e.name, "Gwenview DE");
        assert_eq!(e.exec, "gwenview %U");
        assert_eq!(e.mime_types, vec!["image/png", "image/jpeg"]);
    }

    #[test]
    fn globs_lookup() {
        let g = "60:text/x-python:*.py\n50:image/png:*.png\n40:image/apng:*.png\n50:text/x-makefile:makefile\n";
        assert_eq!(mime_from_globs("Colibri.PNG", g).as_deref(), Some("image/png"));
        assert_eq!(mime_from_globs("a.py", g).as_deref(), Some("text/x-python"));
        assert_eq!(mime_from_globs("Makefile", g).as_deref(), Some("text/x-makefile"));
        assert_eq!(mime_from_globs("x.zzz", g), None);
    }

    #[test]
    fn mime_matching() {
        assert!(mime_matches(&["image/*".into()], "image/png"));
        assert!(mime_matches(&["text/plain".into()], "text/x-python"));
        assert!(!mime_matches(&["image/jpeg".into()], "image/png"));
    }

    #[test]
    fn exec_expansion() {
        let mut e = parse_desktop("g.desktop", Path::new("/x/g.desktop"), SAMPLE, &[]).unwrap();
        let files = vec!["/a b.png".to_string(), "/c.png".to_string()];
        assert_eq!(build_commands(&e, &files), vec![vec!["gwenview", "/a b.png", "/c.png"]]);

        e.exec = "\"/opt/My App/bin\" --x %f".into();
        assert_eq!(
            build_commands(&e, &files),
            vec![vec!["/opt/My App/bin", "--x", "/a b.png"], vec!["/opt/My App/bin", "--x", "/c.png"]]
        );

        e.exec = "foo %i --name=%c".into();
        assert_eq!(
            build_commands(&e, &files[..1]),
            vec![vec!["foo", "--icon", "gwenview", "--name=Gwenview", "/a b.png"]]
        );

        e.exec = "/usr/bin/flatpak run --file-forwarding org.x.Y @@u %U @@".into();
        assert_eq!(
            build_commands(&e, &files[..1]),
            vec![vec!["/usr/bin/flatpak", "run", "--file-forwarding", "org.x.Y", "@@u", "/a b.png", "@@"]]
        );
    }
}
