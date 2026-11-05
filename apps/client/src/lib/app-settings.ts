/**
 * App settings (Settings page) — single source of truth for the rest of the app.
 *
 * Settings are stored as one JSON object in localStorage. Anything outside the
 * settings page reads them through `useAppSettings()` (React) or
 * `loadAppSettings()` (plain code) and is notified immediately when they change.
 */
import { useSyncExternalStore } from 'react';
import { STORAGE_KEYS } from './storage-keys';

export interface AppSettings {
  theme: string;
  language: string;
  showHiddenFiles: boolean;
  enableMarkdownPreview: boolean;
  defaultView: string;
  enableAnimations: boolean;
  showFileExtensions: boolean;
  enableNotifications: boolean;
  fontSize: string;
  sidebarWidth: string;
  reducedMotion: boolean;
  enhancedFocus: boolean;
  highContrast: boolean;
  autoCalculateFolderSizes: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'glass',
  language: '',
  showHiddenFiles: false,
  enableMarkdownPreview: true,
  defaultView: 'grid',
  enableAnimations: true,
  showFileExtensions: true,
  enableNotifications: true,
  fontSize: 'medium',
  sidebarWidth: 'medium',
  reducedMotion: false,
  enhancedFocus: false,
  highContrast: false,
  autoCalculateFolderSizes: false,
};

export const SETTINGS_KEY = STORAGE_KEYS.SETTINGS;

/** Fired on window whenever the settings object is saved. */
export const SETTINGS_CHANGED_EVENT = 'xplorer:settings-changed';

/** Left sidebar width in px for each "Sidebar Width" preset. */
export const SIDEBAR_WIDTH_PRESETS: Record<string, number> = {
  narrow: 200,
  medium: 256,
  wide: 340,
};

let cachedRaw: string | null | undefined;
let cachedSettings: AppSettings = DEFAULT_SETTINGS;

/** Read the current settings (merged over defaults). Returns a stable object while unchanged. */
export const loadAppSettings = (): AppSettings => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SETTINGS_KEY);
  } catch {
    return DEFAULT_SETTINGS;
  }
  if (raw === cachedRaw) return cachedSettings;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    cachedSettings =
      parsed && typeof parsed === 'object'
        ? { ...DEFAULT_SETTINGS, ...(parsed as Partial<AppSettings>) }
        : DEFAULT_SETTINGS;
  } catch {
    cachedSettings = DEFAULT_SETTINGS;
  }
  return cachedSettings;
};

/** Persist settings and notify every listener in this window. */
export const saveAppSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[app-settings] failed to save:', err);
  }
  window.dispatchEvent(new CustomEvent(SETTINGS_CHANGED_EVENT));
};

const subscribe = (onChange: () => void): (() => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key === SETTINGS_KEY) onChange();
  };
  window.addEventListener(SETTINGS_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(SETTINGS_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
};

/** React hook: current settings, re-renders when they change. */
export const useAppSettings = (): AppSettings =>
  useSyncExternalStore(subscribe, loadAppSettings, loadAppSettings);

/** Apply settings that live as classes on <html> (accessibility, animations). */
export const applyDocumentSettings = (settings: AppSettings = loadAppSettings()): void => {
  const root = document.documentElement.classList;
  root.toggle('reduce-motion', settings.reducedMotion);
  root.toggle('enhanced-focus', settings.enhancedFocus);
  root.toggle('high-contrast', settings.highContrast);
  root.toggle('no-animations', !settings.enableAnimations);
};

/** Apply document-level settings now and keep them in sync. Call once at startup. */
export const installDocumentSettings = (): void => {
  applyDocumentSettings();
  subscribe(() => applyDocumentSettings());
};

/** File name as shown in the UI, honoring "Show File Extensions". Folders are never shortened. */
export const getDisplayName = (name: string, isDir: boolean, showExtensions: boolean): string => {
  if (showExtensions || isDir) return name;
  const dot = name.lastIndexOf('.');
  // Keep dotfiles (".bashrc") and names without an extension as they are
  return dot > 0 ? name.slice(0, dot) : name;
};
