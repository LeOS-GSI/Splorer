/**
 * Context Menu Rules — user-configurable rules that control which context menu
 * items appear based on file type, extension, name pattern, or directory status.
 *
 * Rules are persisted in localStorage under `xplorer:context-menu-rules`.
 */

import i18n from '@/i18n';
import type { FileEntry } from '@/lib/tauri-api';
import { STORAGE_KEYS } from '@/lib/storage-keys';

// ── Types ──────────────────────────────────────────────────────────

export interface RuleMatcher {
  type: 'extension' | 'file_type' | 'name_pattern' | 'is_directory';
  /** e.g. ".jpg,.png", "image/*", "readme*", "true" */
  value: string;
}

export interface ContextMenuRule {
  id: string;
  menuItemId: string;
  menuItemLabel: string;
  condition: 'show_only_for' | 'hide_for';
  matcher: RuleMatcher;
  enabled: boolean;
}

// ── Storage key ────────────────────────────────────────────────────

const STORAGE_KEY = STORAGE_KEYS.CONTEXT_MENU_RULES;

// ── Known menu items (for the rule editor dropdown) ────────────────

const KNOWN_MENU_ITEMS: { id: string; label: string }[] = [
  {
    id: 'open',
    get label() {
      return i18n.t('contextMenu.open');
    },
  },
  {
    id: 'open-new-tab',
    get label() {
      return i18n.t('contextMenu.openInNewTab');
    },
  },
  {
    id: 'open-with',
    get label() {
      return i18n.t('contextMenu.openWith');
    },
  },
  {
    id: 'open-in-editor',
    get label() {
      return i18n.t('contextMenu.edit');
    },
  },
  {
    id: 'copy',
    get label() {
      return i18n.t('contextMenu.copy');
    },
  },
  {
    id: 'cut',
    get label() {
      return i18n.t('contextMenu.cut');
    },
  },
  {
    id: 'paste',
    get label() {
      return i18n.t('contextMenu.paste');
    },
  },
  {
    id: 'duplicate',
    get label() {
      return i18n.t('contextMenu.duplicate');
    },
  },
  {
    id: 'create-symlink',
    get label() {
      return i18n.t('contextMenu.createLink');
    },
  },
  {
    id: 'rename',
    get label() {
      return i18n.t('contextMenu.rename');
    },
  },
  {
    id: 'bulk-rename',
    get label() {
      return i18n.t('contextMenu.bulkRenameShort');
    },
  },
  {
    id: 'delete',
    get label() {
      return i18n.t('contextMenu.delete');
    },
  },
  {
    id: 'secure-delete',
    get label() {
      return i18n.t('contextMenu.secureDelete');
    },
  },
  {
    id: 'archive',
    get label() {
      return i18n.t('contextMenu.archive');
    },
  },
  {
    id: 'compress',
    get label() {
      return i18n.t('contextMenu.addToArchive');
    },
  },
  {
    id: 'extract',
    get label() {
      return i18n.t('contextMenu.extractHere');
    },
  },
  {
    id: 'encrypt',
    get label() {
      return i18n.t('contextMenu.encrypt');
    },
  },
  {
    id: 'decrypt',
    get label() {
      return i18n.t('contextMenu.decrypt');
    },
  },
  {
    id: 'compare',
    get label() {
      return i18n.t('contextMenu.compare');
    },
  },
  {
    id: 'open-terminal',
    get label() {
      return i18n.t('contextMenu.openInTerminal');
    },
  },
  {
    id: 'calculate-folder-size',
    get label() {
      return i18n.t('contextMenu.calculateFolderSize');
    },
  },
  {
    id: 'file-details',
    get label() {
      return i18n.t('contextMenu.fileDetails');
    },
  },
  {
    id: 'manage-tags',
    get label() {
      return i18n.t('contextMenu.tags');
    },
  },
  {
    id: 'copy-path',
    get label() {
      return i18n.t('contextMenu.copyPath');
    },
  },
  {
    id: 'copy-name',
    get label() {
      return i18n.t('contextMenu.copyName');
    },
  },
  {
    id: 'version-history',
    get label() {
      return i18n.t('contextMenu.versionHistory');
    },
  },
  {
    id: 'pin-to-sidebar',
    get label() {
      return i18n.t('contextMenu.pinToSidebar');
    },
  },
  {
    id: 'add-bookmark',
    get label() {
      return i18n.t('contextMenu.addToBookmarks');
    },
  },
  {
    id: 'properties',
    get label() {
      return i18n.t('common.properties');
    },
  },
];

// ── CRUD helpers ───────────────────────────────────────────────────

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
};

export const getContextMenuRules = (): ContextMenuRule[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ContextMenuRule[];
  } catch {
    return [];
  }
};

const saveRules = (rules: ContextMenuRule[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch {
    // storage full or unavailable
  }
};

export const createRule = (rule: Omit<ContextMenuRule, 'id'>): ContextMenuRule => {
  const newRule: ContextMenuRule = { ...rule, id: generateId() };
  const rules = getContextMenuRules();
  rules.push(newRule);
  saveRules(rules);
  return newRule;
};

export const updateRule = (id: string, updates: Partial<Omit<ContextMenuRule, 'id'>>): void => {
  const rules = getContextMenuRules();
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return;
  rules[idx] = { ...rules[idx], ...updates };
  saveRules(rules);
};

export const deleteRule = (id: string): void => {
  const rules = getContextMenuRules().filter((r) => r.id !== id);
  saveRules(rules);
};

export const resetRules = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

export const getAvailableMenuItems = (): { id: string; label: string }[] => {
  return KNOWN_MENU_ITEMS;
};

// ── Rule matching ──────────────────────────────────────────────────

const getFileExtension = (file: FileEntry): string => {
  const dotIdx = file.name.lastIndexOf('.');
  return dotIdx > 0 ? file.name.slice(dotIdx).toLowerCase() : '';
};

const matchesRule = (matcher: RuleMatcher, file: FileEntry): boolean => {
  switch (matcher.type) {
    case 'extension': {
      const ext = getFileExtension(file);
      if (!ext) return false;
      // value is comma-separated list of extensions, e.g. ".jpg,.png"
      const exts = matcher.value
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
        .map((e) => (e.startsWith('.') ? e : `.${e}`));
      return exts.includes(ext);
    }

    case 'file_type': {
      const pattern = matcher.value.trim().toLowerCase();
      if (!pattern) return false;
      // Support wildcard patterns like "image/*"
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        return (file.file_type || '').toLowerCase().startsWith(prefix);
      }
      return (file.file_type || '').toLowerCase() === pattern;
    }

    case 'name_pattern': {
      const pattern = matcher.value.trim().toLowerCase();
      if (!pattern) return false;
      const name = file.name.toLowerCase();
      // Simple glob: only * is supported
      if (pattern.includes('*')) {
        const regex = new RegExp(
          `^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`,
        );
        return regex.test(name);
      }
      return name === pattern;
    }

    case 'is_directory': {
      const wantDir = matcher.value.trim().toLowerCase() === 'true';
      return file.is_dir === wantDir;
    }

    default:
      return false;
  }
};

// ── Cached rule lookup (rebuilt on every call but O(n) where n = rules count) ──

/**
 * Determines whether a menu item with the given id should be shown for the
 * supplied file, based on the user's context menu rules.
 *
 * Evaluation logic:
 * - If no enabled rules target this menuItemId, return true (show).
 * - `show_only_for` rules: the item is ONLY shown when the file matches at
 *   least one of these rules. If none match, hide.
 * - `hide_for` rules: the item is hidden when the file matches any of these.
 * - When both types exist, `show_only_for` is evaluated first. If none match,
 *   the item is hidden. Then `hide_for` is applied on top.
 */
export const shouldShowMenuItem = (menuItemId: string, file: FileEntry): boolean => {
  const rules = getContextMenuRules();

  // Collect enabled rules for this menu item
  const showOnlyRules: ContextMenuRule[] = [];
  const hideRules: ContextMenuRule[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.menuItemId !== menuItemId) continue;
    if (rule.condition === 'show_only_for') {
      showOnlyRules.push(rule);
    } else {
      hideRules.push(rule);
    }
  }

  // No rules for this item — always show
  if (showOnlyRules.length === 0 && hideRules.length === 0) {
    return true;
  }

  // show_only_for: at least one must match, else hide
  if (showOnlyRules.length > 0) {
    const anyShowMatch = showOnlyRules.some((r) => matchesRule(r.matcher, file));
    if (!anyShowMatch) return false;
  }

  // hide_for: if any matches, hide
  if (hideRules.length > 0) {
    const anyHideMatch = hideRules.some((r) => matchesRule(r.matcher, file));
    if (anyHideMatch) return false;
  }

  return true;
};
