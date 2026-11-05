/**
 * Centralized registry of all localStorage keys used by Splorer.
 * Always reference these constants instead of hardcoding key strings.
 */
export const STORAGE_KEYS = {
  // Core settings & UI
  SETTINGS: 'xplorer:settings',
  UI_STATE: 'xplorer:ui-state',
  FONT_SIZE: 'xplorer:font-size',
  SPLIT_LAYOUT: 'xplorer:split-layout',
  SMART_VIEW: 'xplorer:folder-views',
  FOLDER_SETTINGS: 'xplorer:folder-settings',

  // Extensions
  PERMISSION_VIOLATIONS: 'xplorer-permission-violations',

  // Search
  SEARCH_SCOPE: 'xplorer:search-scope',
  SEARCH_HISTORY: 'xplorer-search-history',
  COMMAND_HISTORY: 'xplorer:command-history',
  COMMAND_FAVORITES: 'xplorer:command-favorites',

  // Explorer UI
  SIDEBAR_SECTIONS: 'xplorer-sidebar-sections',
  SIDEBAR_HEIGHTS: 'xplorer-sidebar-heights',
  SIDEBAR_WIDTH_PRESET: 'xplorer:sidebar-width-preset',

  // Collections, bookmarks, colors
  COLLECTIONS: 'xplorer:collections',
  PATH_BOOKMARKS: 'xplorer:path-bookmarks',
  FOLDER_COLORS: 'xplorer:folder-colors',

  // Onboarding / tour
  TOUR_COMPLETED: 'xplorer:tour-completed',
  BETA_WARNING_DISMISSED: 'xplorer:beta-warning-dismissed',
  AUTO_WHITELIST_VISITED: 'xplorer:auto-whitelist-visited',

  // Pane sync
  PANE_SYNC_ENABLED: 'xplorer:pane-sync-enabled',
  PANE_SYNC_MODE: 'xplorer:pane-sync-mode',

  // Vim mode
  VIM_MODE: 'xplorer-vim-mode',
  VIM_LEARNING_MODE: 'xplorer-vim-learning-mode',

  // Misc
  CUSTOM_THEMES: 'xplorer:custom-themes',
  CUSTOM_TEMPLATES: 'xplorer:custom-templates',
  CONTEXT_MENU_RULES: 'xplorer:context-menu-rules',
  SAVED_SEARCHES: 'xplorer:saved-searches',
  WORKSPACE_LAYOUTS: 'xplorer:workspace-layouts',
  CLIPBOARD_HISTORY: 'xplorer:clipboard-history',
  NOTIFICATION_HISTORY: 'xplorer-notification-history',
  LAST_EXPORT_DATE: 'xplorer:last-export-date',

  // File open preferences (Open With)
  FILE_OPEN_PREFS: 'xplorer:file-open-prefs',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
