/**
 * One-time cleanup of localStorage data left behind by features that were
 * removed from Splorer (AI chat/agent, AI search providers, Google Drive,
 * marketplace, cloud sync). Some of these entries held API keys or sync
 * tokens, so they are deleted rather than left orphaned.
 */
import { STORAGE_KEYS } from './storage-keys';

const CLEANUP_FLAG = 'xplorer:legacy-cleanup-v1';

/** Exact keys of removed features. */
const REMOVED_KEYS = [
  'xplorer:marketplace-url',
  'xplorer-installed-extensions',
  'xplorer:auto-update-extensions',
  'xplorer_openai_key',
  'xplorer_ollama_url',
  'xplorer-sync-api-url',
  'xplorer-sync-token',
  'xplorer-auto-sync-enabled',
  'xplorer:pending-gdrive-tab',
  'gdrive-plugin-settings',
  'gdrive-file-cache',
];

/** Key prefixes of removed features. */
const REMOVED_PREFIXES = ['xplorer:ai-', 'xplorer:agent-', 'xplorer:proactive-agent', 'gdrive-'];

/** AI fields that used to live inside the settings object (some held API keys). */
const REMOVED_SETTINGS_FIELDS = [
  'aiSearchProvider',
  'aiSearchModel',
  'aiSearchApiKey',
  'aiServiceMode',
  'aiCloudModel',
  'aiCustomProvider',
  'aiCustomModel',
  'aiCustomApiKey',
];

export const runLegacyCleanup = (): void => {
  try {
    if (localStorage.getItem(CLEANUP_FLAG)) return;

    const toRemove = new Set<string>(REMOVED_KEYS);
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && REMOVED_PREFIXES.some((p) => key.startsWith(p))) toRemove.add(key);
    }
    toRemove.forEach((key) => localStorage.removeItem(key));

    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      const parsed: unknown = JSON.parse(rawSettings);
      if (parsed && typeof parsed === 'object') {
        const settings = parsed as Record<string, unknown>;
        REMOVED_SETTINGS_FIELDS.forEach((field) => delete settings[field]);
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      }
    }

    // Drop tabs that pointed at Google Drive or chat files from the saved layout
    const rawLayout = localStorage.getItem(STORAGE_KEYS.SPLIT_LAYOUT);
    if (rawLayout && /gdrive/.test(rawLayout)) {
      localStorage.removeItem(STORAGE_KEYS.SPLIT_LAYOUT);
    }

    localStorage.setItem(CLEANUP_FLAG, '1');
  } catch (err) {
    console.warn('[legacy-cleanup] failed:', err);
  }
};
