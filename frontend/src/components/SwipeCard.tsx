import React, { useState, useRef, useEffect } from 'react';

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
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const initialPos = useRef({ x: 0, y: 0 });

  const handleStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    setStartPos({ x: clientX, y: clientY });
    initialPos.current = { x: offset.x, y: offset.y };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;

    const deltaX = clientX - startPos.x;
    const deltaY = clientY - startPos.y;

    // Ограничиваем свайп только по горизонтали
    if (preventSwipe?.includes('left') && deltaX < 0) return;
    if (preventSwipe?.includes('right') && deltaX > 0) return;

    setOffset({
      x: initialPos.current.x + deltaX,
      y: initialPos.current.y + deltaY * 0.1, // Небольшой вертикальный эффект
    });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    
    const threshold = 80; // Порог для свайпа (уменьшен для более чувствительного свайпа)
    const currentOffsetX = offset.x;

    if (Math.abs(currentOffsetX) > threshold) {
      const direction: 'left' | 'right' = currentOffsetX > 0 ? 'right' : 'left';
      
      // Улучшенная анимация ухода карточки с более плавным движением
      const exitX = currentOffsetX > 0 
        ? window.innerWidth + 200 
        : -window.innerWidth - 200;
      const exitY = offset.y * 0.5; // Меньший вертикальный эффект
      
      setOffset({
        x: exitX,
        y: exitY,
      });

      setTimeout(() => {
        onSwipe?.(direction);
        setOffset({ x: 0, y: 0 });
      }, 300);
    } else {
      // Плавный возврат карточки на место с пружинящим эффектом
      setOffset({ x: 0, y: 0 });
    }
    
    setIsDragging(false);
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  // Глобальные обработчики для мыши
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX, e.clientY);
      };

      const handleGlobalMouseUp = () => {
        handleEnd();
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, startPos.x, startPos.y, initialPos.current.x, initialPos.current.y]);

  // Улучшенная формула вращения и прозрачности
  const rotation = offset.x / 15; // Более выраженное вращение
  const opacity = Math.max(0, 1 - Math.abs(offset.x) / 400);
  const scale = isDragging ? 1.05 : 1; // Легкое увеличение при перетаскивании
  
  // Цветовая индикация направления свайпа (закомментировано для будущего использования)
  // const likeOpacity = offset.x > 0 ? Math.min(1, offset.x / 150) : 0;
  // const dislikeOpacity = offset.x < 0 ? Math.min(1, Math.abs(offset.x) / 150) : 0;

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
        opacity: opacity < 0 ? 0 : opacity,
        transition: isDragging 
          ? 'none' 
          : 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease-out',
        cursor: isDragging ? 'grabbing' : 'grab',
        position: 'absolute',
        width: '100%',
        height: '100%',
        zIndex: isDragging ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};
