import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// 🟥 UPDATED: Import from deprecated file
import { useUnsavedChanges } from '../_deprecated_useUnsavedChanges';

// Mock window.alert
const mockAlert = vi.fn();
global.alert = mockAlert;

describe('useUnsavedChanges', () => {
  beforeEach(() => {
    mockAlert.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with no unsaved changes', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.showWarning).toBe(false);
    expect(result.current.showSaveConfirm).toBe(false);
  });

  it('should mark as dirty when markDirty is called', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    act(() => {
      result.current.markDirty();
    });
    
    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.isDirty).toBe(true);
  });

  it('should mark as clean when markClean is called', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    act(() => {
      result.current.markDirty();
    });
    
    expect(result.current.hasUnsavedChanges).toBe(true);
    
    act(() => {
      result.current.markClean();
    });
    
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('should initialize with initial data', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    const initialData = { name: 'Test', value: 123 };
    
    act(() => {
      result.current.initialize(initialData);
    });
    
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('should detect changes in data', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    const initialData = { name: 'Test', value: 123 };
    const changedData = { name: 'Test', value: 456 };
    
    act(() => {
      result.current.initialize(initialData);
    });
    
    expect(result.current.hasChanges(changedData)).toBe(true);
    expect(result.current.hasChanges(initialData)).toBe(false);
  });

  it('should show warning when handleNavigation is called with unsaved changes', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    act(() => {
      result.current.markDirty();
    });
    
    let navigationAllowed: boolean;
    act(() => {
      navigationAllowed = result.current.handleNavigation();
    });
    
    expect(navigationAllowed!).toBe(false);
    expect(result.current.showWarning).toBe(true);
  });

  it('should allow navigation when no unsaved changes', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    let navigationAllowed: boolean;
    act(() => {
      navigationAllowed = result.current.handleNavigation();
    });
    
    expect(navigationAllowed!).toBe(true);
    expect(result.current.showWarning).toBe(false);
  });

  it('should call onSave callback and show success message when handleSave is called', async () => {
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const saveMessage = 'Changes saved!';
    
    const { result } = renderHook(() => useUnsavedChanges({
      onSave: mockOnSave,
      saveMessage
    }));
    
    act(() => {
      result.current.markDirty();
    });
    
    await act(async () => {
      await result.current.handleSave();
    });
    
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(mockAlert).toHaveBeenCalledWith(saveMessage);
  });

  it('should handle save errors properly', async () => {
    const mockError = new Error('Save failed');
    const mockOnSave = vi.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useUnsavedChanges({
      onSave: mockOnSave
    }));
    
    act(() => {
      result.current.markDirty();
    });
    
    await expect(async () => {
      await act(async () => {
        await result.current.handleSave();
      });
    }).rejects.toThrow('Save failed');
    
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(result.current.showSaveConfirm).toBe(false);
  });

  it('should call onDiscard callback and show cancel message when handleDiscard is called', () => {
    const mockOnDiscard = vi.fn();
    const cancelMessage = 'Changes discarded!';
    
    const { result } = renderHook(() => useUnsavedChanges({
      onDiscard: mockOnDiscard,
      cancelMessage
    }));
    
    act(() => {
      result.current.markDirty();
    });
    
    act(() => {
      result.current.handleDiscard();
    });
    
    expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.isDirty).toBe(false);
    expect(result.current.showWarning).toBe(false);
    expect(mockAlert).toHaveBeenCalledWith(cancelMessage);
  });

  it('should hide warning when handleStay is called', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    act(() => {
      result.current.markDirty();
    });
    
    act(() => {
      result.current.handleNavigation();
    });
    
    expect(result.current.showWarning).toBe(true);
    
    act(() => {
      result.current.handleStay();
    });
    
    expect(result.current.showWarning).toBe(false);
    expect(result.current.hasUnsavedChanges).toBe(true); // Still has unsaved changes
  });

  it('should use custom messages from options', async () => {
    const customMessage = 'Custom warning message';
    const customSaveMessage = 'Custom save message';
    const customCancelMessage = 'Custom cancel message';
    const mockOnSave = vi.fn().mockResolvedValue(undefined);
    const mockOnDiscard = vi.fn();
    
    const { result } = renderHook(() => useUnsavedChanges({
      message: customMessage,
      saveMessage: customSaveMessage,
      cancelMessage: customCancelMessage,
      onSave: mockOnSave,
      onDiscard: mockOnDiscard
    }));
    
    act(() => {
      result.current.markDirty();
    });
    
    // Test save message
    await act(async () => {
      await result.current.handleSave();
    });
    expect(mockAlert).toHaveBeenCalledWith(customSaveMessage);
    
    mockAlert.mockClear();
    
    // Test discard message
    act(() => {
      result.current.markDirty();
    });
    
    act(() => {
      result.current.handleDiscard();
    });
    expect(mockAlert).toHaveBeenCalledWith(customCancelMessage);
  });

  it('should handle beforeunload event when there are unsaved changes', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    act(() => {
      result.current.markDirty();
    });
    
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    event.preventDefault = vi.fn();
    
    window.dispatchEvent(event);
    
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('should not handle beforeunload event when there are no unsaved changes', () => {
    const { result } = renderHook(() => useUnsavedChanges());
    
    const event = new Event('beforeunload') as BeforeUnloadEvent;
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    
    window.dispatchEvent(event);
    
    // Event handler should not be added when no unsaved changes
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
