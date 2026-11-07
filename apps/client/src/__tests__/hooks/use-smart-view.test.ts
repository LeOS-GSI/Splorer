import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartView } from '@/hooks/use-smart-view';
import { STORAGE_KEYS } from '@/lib/storage-keys';
import type { FileEntry } from '@/lib/tauri-api';

const file = (name: string): FileEntry => ({
  name,
  path: `/photos/${name}`,
  size: 1,
  modified: 0,
  is_dir: false,
  file_type: name.split('.').pop() || '',
  is_readonly: false,
});

const PHOTOS = ['a.jpg', 'b.jpg', 'c.png', 'd.jpg'].map(file);

const setDefaultView = (value: string) =>
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({ defaultView: value }));

describe('useSmartView — global default view', () => {
  beforeEach(() => localStorage.clear());

  it('uses the Default View setting instead of auto-detecting gallery', () => {
    setDefaultView('list');
    const { result } = renderHook(() => useSmartView(PHOTOS, '/photos'));
    expect(result.current.suggestedView).toBe('list');
  });

  it('maps "grid" to the medium icon view', () => {
    setDefaultView('grid');
    const { result } = renderHook(() => useSmartView(PHOTOS, '/photos'));
    expect(result.current.suggestedView).toBe('medium');
  });

  it('auto-detects by folder content only when set to "auto"', () => {
    setDefaultView('auto');
    const { result } = renderHook(() => useSmartView(PHOTOS, '/photos'));
    expect(result.current.suggestedView).toBe('gallery');
  });

  it('falls back to the medium view when no settings are stored', () => {
    const { result } = renderHook(() => useSmartView(PHOTOS, '/photos'));
    expect(result.current.suggestedView).toBe('medium');
  });

  it('keeps a view saved for a specific folder over the global default', () => {
    setDefaultView('list');
    localStorage.setItem(STORAGE_KEYS.SMART_VIEW, JSON.stringify({ '/photos': 'gallery' }));
    const { result } = renderHook(() => useSmartView(PHOTOS, '/photos'));
    expect(result.current.suggestedView).toBe('gallery');
  });
});
