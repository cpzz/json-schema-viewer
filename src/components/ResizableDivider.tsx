import { useRef, useEffect, useCallback, useState } from 'react';

interface ResizableDividerProps {
  onResize: (deltaX: number) => void;
  className?: string;
}

export function ResizableDivider({ onResize, className = '' }: ResizableDividerProps) {
  const isResizing = useRef(false);
  const startXRef = useRef(0);
  const onResizeRef = useRef(onResize);
  onResizeRef.current = onResize;
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startXRef.current = e.clientX;
    setDragging(true);
    e.preventDefault();
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;

      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResizeRef.current(deltaX);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        setDragging(false);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <>
      <div
        onMouseDown={handleMouseDown}
        className={`w-1 bg-gray-200 dark:bg-gray-700 hover:bg-blue-400 dark:hover:bg-blue-500 cursor-col-resize transition-colors ${className}`}
      />
      {dragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize" style={{ userSelect: 'none' }} />
      )}
    </>
  );
}
