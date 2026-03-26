import { useState, useCallback } from 'react';

export interface PopoverPosition {
  x: number;
  y: number;
  /** Top edge of the trigger element — useful for flipping the popover above. */
  triggerTop: number;
}

/**
 * Manages popover position state driven by mouse enter/leave events.
 * Anchors the popover to the top or bottom edge of the hovered element.
 */
export function usePopover(anchor: 'top' | 'bottom' = 'top') {
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const onMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setPosition({
        x: rect.left + rect.width / 2,
        y: anchor === 'top' ? rect.top : rect.bottom,
        triggerTop: rect.top,
      });
    },
    [anchor],
  );

  const onMouseLeave = useCallback(() => setPosition(null), []);

  return { position, onMouseEnter, onMouseLeave };
}
