import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColumnResize } from './useColumnResize';
import { COLUMNS } from '../columns';

describe('useColumnResize', () => {
  it('initializes widths for all columns', () => {
    const { result } = renderHook(() => useColumnResize());
    for (const col of COLUMNS) {
      expect(result.current.widths[col.key]).toBeGreaterThanOrEqual(40);
    }
  });

  it('all initial widths are equal', () => {
    const { result } = renderHook(() => useColumnResize());
    const values = Object.values(result.current.widths);
    const first = values[0];
    for (const v of values) {
      expect(v).toBe(first);
    }
  });

  it('provides a tableRef', () => {
    const { result } = renderHook(() => useColumnResize());
    expect(result.current.tableRef).toBeDefined();
    expect(result.current.tableRef.current).toBeNull();
  });

  it('isResizingRef starts as false', () => {
    const { result } = renderHook(() => useColumnResize());
    expect(result.current.isResizingRef.current).toBe(false);
  });

  it('onResizeStart is a function', () => {
    const { result } = renderHook(() => useColumnResize());
    expect(typeof result.current.onResizeStart).toBe('function');
  });

  it('onAutoFit is a function', () => {
    const { result } = renderHook(() => useColumnResize());
    expect(typeof result.current.onAutoFit).toBe('function');
  });

  it('onAutoFit does nothing when tableRef is null', () => {
    const { result } = renderHook(() => useColumnResize());
    // Should not throw
    act(() => {
      result.current.onAutoFit('ticker');
    });
    // Width should remain unchanged
    expect(result.current.widths.ticker).toBeGreaterThanOrEqual(40);
  });
});
