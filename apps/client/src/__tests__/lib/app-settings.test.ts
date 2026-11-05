import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  applyDocumentSettings,
  getDisplayName,
  loadAppSettings,
  saveAppSettings,
  useAppSettings,
} from '@/lib/app-settings';
import { toast, useToast } from '@/hooks/use-toast';
import { useNotificationHistory } from '@/hooks/use-notification-history';

describe('app-settings', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
  });

  it('merges stored values over the defaults', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ showHiddenFiles: true }));
    const s = loadAppSettings();
    expect(s.showHiddenFiles).toBe(true);
    expect(s.enableMarkdownPreview).toBe(DEFAULT_SETTINGS.enableMarkdownPreview);
  });

  it('notifies the hook immediately when settings are saved', () => {
    const { result } = renderHook(() => useAppSettings());
    expect(result.current.showFileExtensions).toBe(true);
    act(() => saveAppSettings({ ...DEFAULT_SETTINGS, showFileExtensions: false }));
    expect(result.current.showFileExtensions).toBe(false);
  });

  it('applies accessibility and animation classes to <html>', () => {
    applyDocumentSettings({
      ...DEFAULT_SETTINGS,
      reducedMotion: true,
      highContrast: true,
      enableAnimations: false,
    });
    const cls = document.documentElement.classList;
    expect(cls.contains('reduce-motion')).toBe(true);
    expect(cls.contains('high-contrast')).toBe(true);
    expect(cls.contains('no-animations')).toBe(true);
    expect(cls.contains('enhanced-focus')).toBe(false);
  });

  it('hides extensions only for files, keeping dotfiles and folders intact', () => {
    expect(getDisplayName('report.pdf', false, false)).toBe('report');
    expect(getDisplayName('archive.tar.gz', false, false)).toBe('archive.tar');
    expect(getDisplayName('.bashrc', false, false)).toBe('.bashrc');
    expect(getDisplayName('my.folder', true, false)).toBe('my.folder');
    expect(getDisplayName('report.pdf', false, true)).toBe('report.pdf');
  });
});

describe('notifications setting', () => {
  beforeEach(() => localStorage.clear());

  it('suppresses info pop-ups but keeps them in the history', () => {
    saveAppSettings({ ...DEFAULT_SETTINGS, enableNotifications: false });
    const toasts = renderHook(() => useToast());
    const history = renderHook(() => useNotificationHistory());
    const before = JSON.stringify(history.result.current).length;
    act(() => {
      toast({ title: 'Copied-quietly' });
    });
    expect(toasts.result.current.toasts.some((t) => t.title === 'Copied-quietly')).toBe(false);
    expect(JSON.stringify(history.result.current)).toContain('Copied-quietly');
    expect(JSON.stringify(history.result.current).length).toBeGreaterThan(before);
  });

  it('always shows error pop-ups', () => {
    saveAppSettings({ ...DEFAULT_SETTINGS, enableNotifications: false });
    const toasts = renderHook(() => useToast());
    act(() => {
      toast({ title: 'Disk-full', variant: 'destructive' });
    });
    expect(toasts.result.current.toasts.some((t) => t.title === 'Disk-full')).toBe(true);
  });
});
