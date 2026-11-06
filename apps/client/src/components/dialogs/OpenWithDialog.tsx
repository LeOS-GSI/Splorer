import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AppWindow, ChevronDown, ChevronUp, FileCode, Loader2, Monitor, Search, X } from 'lucide-react';
import { TauriAPI, type DesktopApp } from '@/lib/tauri-api';
import {
  type OpenHandler,
  getFileExtension,
  isCodeFile,
  makeAppHandler,
  rememberAppName,
  setOpenPreference,
} from '@/hooks/use-open-with-prefs';

interface OpenWithDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  onChoose: (handler: OpenHandler) => void;
}

interface OptionRowProps {
  selected: boolean;
  label: string;
  description?: string | null;
  icon: React.ReactNode;
  badge?: string;
  onSelect: () => void;
  onActivate: () => void;
}

const OptionRow = ({
  selected,
  label,
  description,
  icon,
  badge,
  onSelect,
  onActivate,
}: OptionRowProps) => (
  <button
    type="button"
    onClick={onSelect}
    onDoubleClick={onActivate}
    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
      selected ? 'bg-xp-accent/15 ring-xp-accent/40 ring-1' : 'hover:bg-xp-surface-light'
    }`}
  >
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
        selected ? 'bg-xp-accent/20 text-xp-accent' : 'bg-xp-bg text-xp-text-secondary'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <span
          className={`truncate text-sm font-medium ${selected ? 'text-xp-accent' : 'text-xp-text'}`}
        >
          {label}
        </span>
        {badge && (
          <span className="bg-xp-accent/20 text-xp-accent shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium">
            {badge}
          </span>
        )}
      </div>
      {description && (
        <div className="text-xp-text-secondary truncate text-xs">{description}</div>
      )}
    </div>
    <div
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        selected ? 'border-xp-accent bg-xp-accent' : 'border-xp-border'
      }`}
    >
      {selected && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
    </div>
  </button>
);

const AppIcon = ({ app }: { app: DesktopApp }) =>
  app.icon ? (
    <img src={app.icon} alt="" className="h-6 w-6 object-contain" draggable={false} />
  ) : (
    <AppWindow size={18} />
  );

const OpenWithDialog = ({ isOpen, onClose, filePath, onChoose }: OpenWithDialogProps) => {
  const { t } = useTranslation();
  const isCode = isCodeFile(filePath);
  const defaultSelection: OpenHandler = isCode ? 'xplorer-editor' : 'system';

  const [selected, setSelected] = useState<OpenHandler>(defaultSelection);
  const [rememberChoice, setRememberChoice] = useState(false);
  const [apps, setApps] = useState<DesktopApp[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState('');

  const ext = getFileExtension(filePath);
  const fileName = filePath.split(/[/\\]/).pop() ?? '';

  // Load installed applications whenever the dialog opens for a file
  useEffect(() => {
    if (!isOpen || !filePath) return;
    let cancelled = false;
    setSelected(isCodeFile(filePath) ? 'xplorer-editor' : 'system');
    setRememberChoice(false);
    setShowAll(false);
    setFilter('');
    setApps([]);
    setLoading(true);
    TauriAPI.listOpenWithApps(filePath)
      .then((res) => {
        if (cancelled) return;
        setApps(res.apps);
        // Preselect the best match for non-code files
        if (!isCodeFile(filePath)) {
          const first = res.apps.find((a) => a.recommended);
          if (first) setSelected(makeAppHandler(first.id));
        }
      })
      .catch((err) => console.error('Failed to list applications:', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, filePath]);

  const recommended = useMemo(() => apps.filter((a) => a.recommended), [apps]);
  const others = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return apps.filter(
      (a) =>
        !a.recommended &&
        (!q || a.name.toLowerCase().includes(q) || a.comment?.toLowerCase().includes(q)),
    );
  }, [apps, filter]);
  const defaultApp = useMemo(() => apps.find((a) => a.isDefault), [apps]);

  const choose = useCallback(
    (handler: OpenHandler) => {
      const app = apps.find((a) => makeAppHandler(a.id) === handler);
      if (app) rememberAppName(app.id, app.name);
      if (rememberChoice && ext) {
        setOpenPreference(ext, handler);
      }
      onChoose(handler);
      onClose();
    },
    [apps, rememberChoice, ext, onChoose, onClose],
  );

  const handleOpen = useCallback(() => choose(selected), [choose, selected]);

  const handleClose = useCallback(() => {
    setSelected(defaultSelection);
    setRememberChoice(false);
    onClose();
  }, [onClose, defaultSelection]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLInputElement)) {
        handleOpen();
      }
    },
    [handleClose, handleOpen],
  );

  if (!isOpen) return null;

  const renderApp = (app: DesktopApp) => {
    const handler = makeAppHandler(app.id);
    return (
      <OptionRow
        key={app.id}
        selected={selected === handler}
        label={app.name}
        description={app.comment}
        icon={<AppIcon app={app} />}
        badge={app.isDefault ? t('openWith.defaultBadge', 'Default') : undefined}
        onSelect={() => setSelected(handler)}
        onActivate={() => choose(handler)}
      />
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('openWith.title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onKeyDown={handleKeyDown}
    >
      <div className="bg-xp-surface border-xp-border flex max-h-[85vh] w-[460px] max-w-[90vw] flex-col overflow-hidden rounded-xl border shadow-2xl">
        {/* Header */}
        <div className="border-xp-border flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-xp-text text-base font-semibold">{t('openWith.title')}</h2>
            <p className="text-xp-text-secondary mt-0.5 max-w-[340px] truncate text-xs">
              {fileName}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-xp-text-secondary hover:bg-xp-surface-light hover:text-xp-text rounded-md p-1.5 transition-colors"
            aria-label={t('openWith.cancel')}
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {isCode && (
            <OptionRow
              selected={selected === 'xplorer-editor'}
              label={t('openWith.xplorerEditor')}
              description={t('openWith.xplorerEditorDesc')}
              icon={<FileCode size={18} />}
              onSelect={() => setSelected('xplorer-editor')}
              onActivate={() => choose('xplorer-editor')}
            />
          )}

          {recommended.map(renderApp)}

          <OptionRow
            selected={selected === 'system'}
            label={t('openWith.systemDefault')}
            description={
              defaultApp
                ? t('openWith.systemDefaultCurrent', {
                    app: defaultApp.name,
                    defaultValue: 'Currently: {{app}}',
                  })
                : t('openWith.systemDefaultDesc')
            }
            icon={<Monitor size={18} />}
            onSelect={() => setSelected('system')}
            onActivate={() => choose('system')}
          />

          {loading && (
            <div className="text-xp-text-secondary flex items-center gap-2 px-3 py-2 text-xs">
              <Loader2 size={14} className="animate-spin" />
              {t('openWith.loadingApps', 'Looking for applications…')}
            </div>
          )}

          {!loading && apps.length > recommended.length && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="text-xp-text-secondary hover:text-xp-text flex w-full items-center gap-1.5 px-3 pt-2 pb-1 text-xs font-medium transition-colors"
            >
              {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {showAll
                ? t('openWith.hideOtherApps', 'Hide other applications')
                : t('openWith.showOtherApps', 'Show other applications')}
            </button>
          )}

          {showAll && (
            <>
              <div className="relative px-1 pb-1">
                <Search
                  size={14}
                  className="text-xp-text-secondary pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2"
                />
                <input
                  type="text"
                  autoFocus
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder={t('openWith.searchApps', 'Search applications…')}
                  className="bg-xp-bg border-xp-border text-xp-text focus:ring-xp-accent w-full rounded-md border py-1.5 pr-2 pl-8 text-sm outline-none focus:ring-1"
                />
              </div>
              {others.map(renderApp)}
              {others.length === 0 && (
                <div className="text-xp-text-secondary px-3 py-2 text-xs">
                  {t('openWith.noAppsFound', 'No applications found')}
                </div>
              )}
            </>
          )}
        </div>

        {/* Remember checkbox */}
        {ext && (
          <div className="border-xp-border border-t px-5 py-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={rememberChoice}
                onChange={(e) => setRememberChoice(e.target.checked)}
                className="text-xp-accent bg-xp-bg border-xp-border focus:ring-xp-accent h-4 w-4 rounded focus:ring-2"
              />
              <span className="text-xp-text text-sm">{t('openWith.alwaysUse', { ext })}</span>
            </label>
          </div>
        )}

        {/* Footer */}
        <div className="border-xp-border flex justify-end gap-2 border-t px-5 py-3">
          <button
            onClick={handleClose}
            className="text-xp-text hover:bg-xp-surface-light rounded-md px-4 py-2 text-sm transition-colors"
          >
            {t('openWith.cancel')}
          </button>
          <button
            onClick={handleOpen}
            className="bg-xp-accent hover:bg-xp-accent/80 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            {t('openWith.open')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpenWithDialog;
