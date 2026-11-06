import i18n from '@/i18n';
import {
  FileEdit,
  Trash2,
  Terminal,
  Globe,
  Cpu,
  FolderMinus,
  PanelLeft,
  Eye,
  Info,
  Settings,
  Puzzle,
  FileText,
  FolderPlus,
  FolderOpen,
  Bell,
  Clipboard,
  Palette,
  History,
  type LucideIcon,
} from 'lucide-react';

export type RiskLevel = 'danger' | 'warning' | 'safe';

export interface PermissionInfo {
  id: string;
  label: string;
  description: string;
  risk: RiskLevel;
  icon: LucideIcon;
}

const PERMISSIONS: Record<string, PermissionInfo> = {
  // ── Danger ────────────────────────────────────────────────────────────────
  'file:write': {
    id: 'file:write',
    get label() {
      return i18n.t('extPerm.file_write.label');
    },
    get description() {
      return i18n.t('extPerm.file_write.desc');
    },
    risk: 'danger',
    icon: FileEdit,
  },
  'file:delete': {
    id: 'file:delete',
    get label() {
      return i18n.t('extPerm.file_delete.label');
    },
    get description() {
      return i18n.t('extPerm.file_delete.desc');
    },
    risk: 'danger',
    icon: Trash2,
  },
  'file:execute': {
    id: 'file:execute',
    get label() {
      return i18n.t('extPerm.file_execute.label');
    },
    get description() {
      return i18n.t('extPerm.file_execute.desc');
    },
    risk: 'danger',
    icon: Terminal,
  },
  'native:invoke': {
    id: 'native:invoke',
    get label() {
      return i18n.t('extPerm.native_invoke.label');
    },
    get description() {
      return i18n.t('extPerm.native_invoke.desc');
    },
    risk: 'danger',
    icon: Cpu,
  },
  'system:commands': {
    id: 'system:commands',
    get label() {
      return i18n.t('extPerm.system_commands.label');
    },
    get description() {
      return i18n.t('extPerm.system_commands.desc');
    },
    risk: 'danger',
    icon: Terminal,
  },
  'system:network': {
    id: 'system:network',
    get label() {
      return i18n.t('extPerm.system_network.label');
    },
    get description() {
      return i18n.t('extPerm.system_network.desc');
    },
    risk: 'danger',
    icon: Globe,
  },

  // ── Warning ───────────────────────────────────────────────────────────────
  'directory:delete': {
    id: 'directory:delete',
    get label() {
      return i18n.t('extPerm.directory_delete.label');
    },
    get description() {
      return i18n.t('extPerm.directory_delete.desc');
    },
    risk: 'warning',
    icon: FolderMinus,
  },
  'ui:modify': {
    id: 'ui:modify',
    get label() {
      return i18n.t('extPerm.ui_modify.label');
    },
    get description() {
      return i18n.t('extPerm.ui_modify.desc');
    },
    risk: 'warning',
    icon: PanelLeft,
  },
  'system:info': {
    id: 'system:info',
    get label() {
      return i18n.t('extPerm.system_info.label');
    },
    get description() {
      return i18n.t('extPerm.system_info.desc');
    },
    risk: 'warning',
    icon: Info,
  },
  'xplorer:settings': {
    id: 'xplorer:settings',
    get label() {
      return i18n.t('extPerm.xplorer_settings.label');
    },
    get description() {
      return i18n.t('extPerm.xplorer_settings.desc');
    },
    risk: 'warning',
    icon: Settings,
  },
  'xplorer:extensions': {
    id: 'xplorer:extensions',
    get label() {
      return i18n.t('extPerm.xplorer_extensions.label');
    },
    get description() {
      return i18n.t('extPerm.xplorer_extensions.desc');
    },
    risk: 'warning',
    icon: Puzzle,
  },

  // ── Safe ──────────────────────────────────────────────────────────────────
  'file:read': {
    id: 'file:read',
    get label() {
      return i18n.t('extPerm.file_read.label');
    },
    get description() {
      return i18n.t('extPerm.file_read.desc');
    },
    risk: 'safe',
    icon: FileText,
  },
  'directory:create': {
    id: 'directory:create',
    get label() {
      return i18n.t('extPerm.directory_create.label');
    },
    get description() {
      return i18n.t('extPerm.directory_create.desc');
    },
    risk: 'safe',
    icon: FolderPlus,
  },
  'directory:list': {
    id: 'directory:list',
    get label() {
      return i18n.t('extPerm.directory_list.label');
    },
    get description() {
      return i18n.t('extPerm.directory_list.desc');
    },
    risk: 'safe',
    icon: FolderOpen,
  },
  'ui:panels': {
    id: 'ui:panels',
    get label() {
      return i18n.t('extPerm.ui_panels.label');
    },
    get description() {
      return i18n.t('extPerm.ui_panels.desc');
    },
    risk: 'safe',
    icon: PanelLeft,
  },
  'ui:notifications': {
    id: 'ui:notifications',
    get label() {
      return i18n.t('extPerm.ui_notifications.label');
    },
    get description() {
      return i18n.t('extPerm.ui_notifications.desc');
    },
    risk: 'safe',
    icon: Bell,
  },
  'ui:clipboard': {
    id: 'ui:clipboard',
    get label() {
      return i18n.t('extPerm.ui_clipboard.label');
    },
    get description() {
      return i18n.t('extPerm.ui_clipboard.desc');
    },
    risk: 'safe',
    icon: Clipboard,
  },
  'xplorer:themes': {
    id: 'xplorer:themes',
    get label() {
      return i18n.t('extPerm.xplorer_themes.label');
    },
    get description() {
      return i18n.t('extPerm.xplorer_themes.desc');
    },
    risk: 'safe',
    icon: Palette,
  },
  'xplorer:history': {
    id: 'xplorer:history',
    get label() {
      return i18n.t('extPerm.xplorer_history.label');
    },
    get description() {
      return i18n.t('extPerm.xplorer_history.desc');
    },
    risk: 'safe',
    icon: History,
  },
};

const RISK_ORDER: Record<RiskLevel, number> = { danger: 0, warning: 1, safe: 2 };

export const getPermissionInfo = (permission: string): PermissionInfo => {
  return (
    PERMISSIONS[permission] ?? {
      id: permission,
      label: permission,
      description: i18n.t('permissions.desc.unknown'),
      risk: 'warning' as RiskLevel,
      icon: Eye,
    }
  );
};

/** Sort permissions by risk (danger first) then alphabetically. */
export const sortPermissions = (permissions: string[]): PermissionInfo[] => {
  return permissions
    .map(getPermissionInfo)
    .sort((a, b) => RISK_ORDER[a.risk] - RISK_ORDER[b.risk] || a.label.localeCompare(b.label));
};

export const countByRisk = (permissions: string[]): Record<RiskLevel, number> => {
  const counts: Record<RiskLevel, number> = { danger: 0, warning: 0, safe: 0 };
  for (const p of permissions) {
    counts[getPermissionInfo(p).risk]++;
  }
  return counts;
};
