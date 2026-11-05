import { useState, useEffect } from 'react';
import { TauriAPI } from '@/lib/tauri-api';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  FolderOpen,
  Search,
  Accessibility,
  Keyboard,
  HardDrive,
  ClipboardList,
  History,
  MousePointerClick,
  Settings2,
  ChevronRight,
  FileCode,
  Heart,
  Github,
  ExternalLink,
  Info,
} from 'lucide-react';
import TokenizerSettings from '@/components/TokenizerSettings';
import BackupRestoreSettings from '@/components/settings/BackupRestoreSettings';
import AuditLogSettings from '@/components/settings/AuditLogSettings';
import VersioningSettings from '@/components/settings/VersioningSettings';
import ContextMenuRulesCard from '@/components/settings/ContextMenuRulesCard';
import ShortcutsSettingsPanel from '@/components/settings/ShortcutsSettings';
import GeneralSettings from '@/components/settings/GeneralSettings';
import ExplorerSettings from '@/components/settings/ExplorerSettings';
import AccessibilitySettings from '@/components/settings/AccessibilitySettings';
import FileAssociationsSettings from '@/components/settings/FileAssociationsSettings';
import { loadFontSize } from '@/lib/utils';
import { saveAppSettings } from '@/lib/app-settings';
import { AppSettings, DEFAULT_SETTINGS, SETTINGS_KEY } from '@/components/settings/shared';

type SettingsTab =
  | 'general'
  | 'explorer'
  | 'file-associations'
  | 'context-menu'
  | 'indexing'
  | 'shortcuts'
  | 'accessibility'
  | 'backup'
  | 'audit'
  | 'versioning'
  | 'about';

type TabDef = { id: SettingsTab; label: string; icon: React.ElementType; description: string };

const buildTabs = (t: (key: string) => string): TabDef[] => [
  {
    id: 'general',
    label: t('settings.tabs.general'),
    icon: Settings2,
    description: t('settings.tabs.generalDesc'),
  },
  {
    id: 'explorer',
    label: t('settings.tabs.explorer'),
    icon: FolderOpen,
    description: t('settings.tabs.explorerDesc'),
  },
  {
    id: 'file-associations',
    label: t('settings.tabs.fileAssociations'),
    icon: FileCode,
    description: t('settings.tabs.fileAssociationsDesc'),
  },
  {
    id: 'context-menu',
    label: t('settings.tabs.contextMenu'),
    icon: MousePointerClick,
    description: t('settings.tabs.contextMenuDesc'),
  },
  {
    id: 'indexing',
    label: t('settings.tabs.indexing'),
    icon: Search,
    description: t('settings.tabs.indexingDesc'),
  },
  {
    id: 'shortcuts',
    label: t('settings.tabs.shortcuts'),
    icon: Keyboard,
    description: t('settings.tabs.shortcutsDesc'),
  },
  {
    id: 'accessibility',
    label: t('settings.tabs.accessibility'),
    icon: Accessibility,
    description: t('settings.tabs.accessibilityDesc'),
  },
  {
    id: 'backup',
    label: t('settings.tabs.backup'),
    icon: HardDrive,
    description: t('settings.tabs.backupDesc'),
  },
  {
    id: 'audit',
    label: t('settings.tabs.audit'),
    icon: ClipboardList,
    description: t('settings.tabs.auditDesc'),
  },
  {
    id: 'versioning',
    label: t('settings.tabs.versioning'),
    icon: History,
    description: t('settings.tabs.versioningDesc'),
  },
  {
    id: 'about',
    label: t('settings.tabs.about'),
    icon: Info,
    description: t('settings.tabs.aboutDesc'),
  },
];

const Settings = () => {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const tabs = buildTabs(t);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch {
      /* ignore localStorage/parse errors */
    }
    return DEFAULT_SETTINGS;
  });

  // Persist and notify the rest of the app (applies the change immediately)
  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  useEffect(() => {
    loadFontSize();
  }, []);

  const updateSetting = (key: string, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings
            settings={settings}
            updateSetting={updateSetting}
            setSettings={setSettings}
          />
        );
      case 'explorer':
        return <ExplorerSettings settings={settings} updateSetting={updateSetting} />;
      case 'file-associations':
        return <FileAssociationsSettings />;
      case 'context-menu':
        return <ContextMenuRulesCard />;
      case 'indexing':
        return (
          <div className="px-4 py-2">
            <TokenizerSettings />
          </div>
        );
      case 'shortcuts':
        return <ShortcutsSettingsPanel />;
      case 'accessibility':
        return <AccessibilitySettings settings={settings} updateSetting={updateSetting} />;
      case 'backup':
        return <BackupRestoreSettings />;
      case 'audit':
        return <AuditLogSettings />;
      case 'versioning':
        return <VersioningSettings />;
      case 'about':
        return (
          <div className="space-y-6 px-4 py-2">
            <div className="border-xp-border rounded-lg border p-6 text-center">
              <h2 className="text-xp-text mb-1 text-2xl font-bold">Splorer</h2>
              <p className="text-xp-text-muted text-sm">v1.0.0-alpha.1</p>
              <p className="text-xp-text-secondary mt-3 text-sm">
                {t('settings.about.description')}
              </p>
            </div>

            <div className="border-xp-border rounded-lg border p-4">
              <h3 className="text-xp-text mb-3 text-sm font-semibold">
                {t('settings.about.links')}
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => TauriAPI.openUrl('https://github.com/LeOS-GSI/Splorer')}
                  className="text-xp-text hover:bg-xp-surface-light flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors"
                >
                  <Github size={18} className="text-xp-text-muted" />
                  <span className="text-sm">GitHub Repository</span>
                  <ExternalLink size={14} className="text-xp-text-muted ml-auto" />
                </button>
                <button
                  onClick={() => TauriAPI.openUrl('https://github.com/kimlimjustin/xplorer')}
                  className="text-xp-text hover:bg-xp-surface-light flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors"
                >
                  <Github size={18} className="text-xp-text-muted" />
                  <span className="text-sm">Based on Xplorer by Justin Kimlim</span>
                  <ExternalLink size={14} className="text-xp-text-muted ml-auto" />
                </button>
              </div>
            </div>

            <div className="border-xp-blue/30 bg-xp-blue/5 rounded-lg border p-5">
              <div className="flex items-start gap-3">
                <Heart size={20} className="text-xp-blue mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-xp-text text-sm font-semibold">
                    {t('settings.about.sponsorTitle')}
                  </h3>
                  <p className="text-xp-text-secondary mt-1 text-sm leading-relaxed">
                    {t('settings.about.sponsorDescription')}
                  </p>
                  <button
                    onClick={() => TauriAPI.openUrl('https://github.com/sponsors/kimlimjustin')}
                    className="bg-xp-blue hover:bg-xp-blue/80 mt-3 inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
                  >
                    <Heart size={14} />
                    {t('settings.about.sponsorButton')}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-xp-text-muted text-center text-xs">{t('settings.about.license')}</p>
          </div>
        );
    }
  };

  return (
    <div className="bg-xp-bg text-xp-text flex min-h-screen flex-col">
      {/* Header */}
      <div className="border-xp-border/50 bg-xp-bg/80 shrink-0 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-4">
          <button
            onClick={() => setLocation('/')}
            className="text-xp-text-secondary hover:bg-xp-surface hover:text-xp-text flex h-8 w-8 items-center justify-center rounded-md transition-colors"
            title={t('settings.backToApp')}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xp-text text-lg font-semibold leading-tight">
              {t('settings.title')}
            </h1>
            <p className="text-xp-text-secondary text-xs">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full max-w-6xl">
          {/* Sidebar */}
          <nav className="border-xp-border/50 w-56 shrink-0 overflow-y-auto border-r px-3 py-4">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                      isActive
                        ? 'bg-xp-accent/15 text-xp-accent'
                        : 'text-xp-text-secondary hover:bg-xp-surface hover:text-xp-text'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-xp-accent' : ''} />
                    <div className="min-w-0 flex-1">
                      <div
                        className={`truncate text-sm font-medium ${isActive ? 'text-xp-accent' : ''}`}
                      >
                        {tab.label}
                      </div>
                      <div className="text-xp-text-secondary/60 truncate text-[10px]">
                        {tab.description}
                      </div>
                    </div>
                    {isActive && <ChevronRight size={14} className="text-xp-accent/60 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Content */}
          <main className="flex-1 overflow-y-auto px-2 py-4">
            <div className="max-w-2xl">
              {/* Tab heading */}
              <div className="mb-4 px-4">
                <h2 className="text-xp-text text-xl font-semibold">
                  {tabs.find((t) => t.id === activeTab)?.label}
                </h2>
                <p className="text-xp-text-secondary mt-0.5 text-sm">
                  {tabs.find((t) => t.id === activeTab)?.description}
                </p>
              </div>

              {/* Settings content */}
              {renderTabContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Settings;
