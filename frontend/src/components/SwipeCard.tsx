import React, { useRef, useCallback, useEffect } from 'react';

interface SwipeCardProps {
  children: React.ReactNode;
  onSwipe?: (direction: 'left' | 'right') => void;
  preventSwipe?: ('up' | 'down' | 'left' | 'right')[];
  className?: string;
}

export const SwipeCard: React.FC<SwipeCardProps> = ({
  children,
  onSwipe,
  preventSwipe = ['up', 'down'],
  className = '',
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    startX: 0,
    startY: 0,
    curX: 0,
    curY: 0,
  });

  // Directly mutate DOM style — no React re-renders during drag
  const applyStyle = useCallback((x: number, y: number, dragging: boolean) => {
    const el = wrapperRef.current;
    if (!el) return;
    const rotation = x / 18;
    const scale = dragging ? 1.03 : 1;
    const opacity = Math.max(0, 1 - Math.abs(x) / 420);
    if (dragging) {
      el.style.transition = 'none';
    } else {
      el.style.transition =
        'transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out';
    }
    el.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg) scale(${scale})`;
    el.style.opacity = String(opacity);
  }, []);

  const onStart = useCallback((clientX: number, clientY: number) => {
    dragRef.current = { active: true, startX: clientX, startY: clientY, curX: 0, curY: 0 };
    if (wrapperRef.current) wrapperRef.current.style.transition = 'none';
  }, []);

  const onMove = useCallback((clientX: number, clientY: number) => {
    const d = dragRef.current;
    if (!d.active) return;
    const x = clientX - d.startX;
    const y = (clientY - d.startY) * 0.08;
    if (preventSwipe?.includes('left') && x < 0) return;
    if (preventSwipe?.includes('right') && x > 0) return;
    d.curX = x;
    d.curY = y;
    applyStyle(x, y, true);
  }, [applyStyle, preventSwipe]);

  const onEnd = useCallback(() => {
    const d = dragRef.current;
    if (!d.active) return;
    d.active = false;

    const THRESHOLD = 80;
    if (Math.abs(d.curX) > THRESHOLD) {
      const direction: 'left' | 'right' = d.curX > 0 ? 'right' : 'left';
      const exitX = d.curX > 0 ? window.innerWidth + 250 : -(window.innerWidth + 250);
      const exitRot = exitX / 18;
      const el = wrapperRef.current;
      if (el) {
        el.style.transition = 'transform 0.38s ease-out, opacity 0.28s ease-out';
        el.style.transform = `translate(${exitX}px, ${d.curY * 0.4}px) rotate(${exitRot}deg)`;
        el.style.opacity = '0';
      }
      setTimeout(() => {
        onSwipe?.(direction);
        applyStyle(0, 0, false);
      }, 380);
    } else {
      applyStyle(0, 0, false);
    }
  }, [applyStyle, onSwipe]);

  // Mouse handlers
  const handleMouseDown = (e: React.MouseEvent) => onStart(e.clientX, e.clientY);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    onStart(t.clientX, t.clientY);
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    onMove(t.clientX, t.clientY);
  };
  const handleTouchEnd = () => onEnd();

  // Global mouse move/up (so drag works even when cursor leaves element)
  useEffect(() => {
    const move = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const up = () => onEnd();
    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('mouseup', up);
    return () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
  }, [onMove, onEnd]);

  return (
    <div
      ref={wrapperRef}
      className={className}
      style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: 5,          // выше behind-1 (z:2) и behind-2 (z:1)
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        willChange: 'transform',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};
