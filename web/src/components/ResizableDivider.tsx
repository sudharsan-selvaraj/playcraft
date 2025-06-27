import React, { useRef, useState } from 'react';
import { useComputedColorScheme } from '@mantine/core';
import { customColors } from '../theme';


export function ResizableDivider({
  left,
  right,
  initialLeftWidth = 600,
  minLeftWidth = 600,
  minRightWidth = 600,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  initialLeftWidth?: number;
  minLeftWidth?: number;
  minRightWidth?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [dragging, setDragging] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const frame = useRef<number | null>(null);
  const colorScheme = useComputedColorScheme();

  const onPointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    setShowOverlay(true);
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const containerRect = containerRef.current!.getBoundingClientRect();
      let newLeftWidth = e.clientX - containerRect.left;
      const maxLeftWidth = containerRect.width - minRightWidth;
      if (newLeftWidth < minLeftWidth) newLeftWidth = minLeftWidth;
      if (newLeftWidth > maxLeftWidth) newLeftWidth = maxLeftWidth;
      setLeftWidth(newLeftWidth);
    });
  };

  const stopDragging = () => {
    setDragging(false);
    setShowOverlay(false);
    if (frame.current) cancelAnimationFrame(frame.current);
  };

  React.useEffect(() => {
    if (dragging) {
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', stopDragging);
      window.addEventListener('pointerleave', stopDragging);
      document.body.style.cursor = 'col-resize';
    } else {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointerleave', stopDragging);
      document.body.style.cursor = '';
    }
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', stopDragging);
      window.removeEventListener('pointerleave', stopDragging);
      document.body.style.cursor = '';
      if (frame.current) cancelAnimationFrame(frame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  return (
    <>
      {showOverlay && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            cursor: 'col-resize',
            background: 'transparent',
            pointerEvents: 'all',
          }}
        />
      )}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          position: 'relative',
          minHeight: 200,
          userSelect: dragging ? 'none' : 'auto',
        }}
      >
        <div
          style={{
            width: leftWidth,
            minWidth: minLeftWidth,
            overflow: 'auto',
            transition: 'none',
          }}
        >
          {left}
        </div>
        <div
          style={{
            width: 16,
            margin: '0 -8px',
            cursor: 'col-resize',
            zIndex: 1,
            borderRadius: 4,
            transition: 'background 0.15s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            // background: customColors.border[colorScheme],
          }}
          onPointerDown={onPointerDown}
          onDoubleClick={() => setLeftWidth(initialLeftWidth)}
        >
          <div
            style={{
              width: 2,
              height: '100%',
              background: customColors.border[colorScheme],
              borderRadius: 2,
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            minWidth: minRightWidth,
            overflow: 'auto',
            background: customColors.secondaryBg[colorScheme],
          }}
        >
          {right}
        </div>
      </div>
    </>
  );
}