import { useRef, useEffect, useCallback } from 'react';

interface ResizableDividerProps {
  onResize: (deltaX: number) => void;
  className?: string;
}

export function ResizableDivider({ onResize, className = '' }: ResizableDividerProps) {
  const dividerRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);
  const startXRef = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startXRef.current = e.clientX;
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      
      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize]);

  return (
    <div
      ref={dividerRef}
      onMouseDown={handleMouseDown}
      className={`w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors ${className}`}
    />
  );
}
