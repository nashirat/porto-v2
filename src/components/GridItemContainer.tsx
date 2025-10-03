import { ReactNode, memo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useDragContext } from '../contexts/DragContext';

interface GridItemContainerProps {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: ReactNode;
}

function GridItemContainer({
  id,
  x,
  y,
  width,
  height,
  children
}: GridItemContainerProps) {
  const { gridStopped, clickedItemId, setClickedItemId } = useDragContext();
  const [isFixed, setIsFixed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [fixedRect, setFixedRect] = useState<DOMRect | null>(null);
  const [pendingClose, setPendingClose] = useState(false); // Track if user wants to close
  const containerRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null); // Ghost element to track grid position
  const isPointerDown = useRef(false); // Track if pointer is down
  const hasMoved = useRef(false); // Track if pointer moved during interaction
  const startPosition = useRef<{ x: number; y: number } | null>(null); // Initial pointer position

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isPointerDown.current = true;
    hasMoved.current = false;
    startPosition.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPointerDown.current && startPosition.current) {
      const distance = Math.hypot(
        e.clientX - startPosition.current.x,
        e.clientY - startPosition.current.y
      );
      if (distance > 5) {
        hasMoved.current = true;
      }
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPointerDown.current = false;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isPointerDown.current = true;
    hasMoved.current = false;
    startPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPointerDown.current && startPosition.current && e.touches.length > 0) {
      const distance = Math.hypot(
        e.touches[0].clientX - startPosition.current.x,
        e.touches[0].clientY - startPosition.current.y
      );
      if (distance > 5) {
        hasMoved.current = true;
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isPointerDown.current = false;
  }, []);

  const handleClick = useCallback(() => {
    // Don't allow click if dragged
    if (hasMoved.current) {
      hasMoved.current = false; // Reset for next interaction
      return;
    }

    // Don't allow click if pointer is still down (during drag)
    if (isPointerDown.current) {
      return;
    }

    if (!isFixed && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setFixedRect(rect);
      setIsFixed(true);
      setClickedItemId(id); // Track this item as clicked

      // Start animation on next frame
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    }
  }, [isFixed, id, setClickedItemId]);

  // Update position when grid stops moving (snap) for the clicked item
  useEffect(() => {
    if (gridStopped && clickedItemId === id && isFixed && ghostRef.current) {
      const updatedRect = ghostRef.current.getBoundingClientRect();
      setFixedRect(updatedRect);
    }
  }, [gridStopped, clickedItemId, id, isFixed]);

  // When grid stops and user wanted to close, execute the close animation
  useEffect(() => {
    if (pendingClose && gridStopped) {
      // Update to current ghost position before closing
      if (ghostRef.current) {
        const updatedRect = ghostRef.current.getBoundingClientRect();
        setFixedRect(updatedRect);
      }

      // Animate back to original position
      setIsAnimating(false);

      // After animation completes, reset everything
      setTimeout(() => {
        setIsFixed(false);
        setFixedRect(null);
        setClickedItemId(null);
        setPendingClose(false);
      }, 500);
    }
  }, [pendingClose, gridStopped, setClickedItemId]);

  const handleOverlayClick = useCallback(() => {
    // User wants to close - either do it now or wait for grid to stop
    if (gridStopped) {
      // Update to current ghost position before closing
      if (ghostRef.current) {
        const updatedRect = ghostRef.current.getBoundingClientRect();
        setFixedRect(updatedRect);
      }

      // Grid already stopped, close immediately
      setIsAnimating(false);

      setTimeout(() => {
        setIsFixed(false);
        setFixedRect(null);
        setClickedItemId(null);
      }, 500);
    } else {
      // Grid still moving, mark as pending close (will close when grid stops)
      setPendingClose(true);
    }
  }, [gridStopped, setClickedItemId]);

  const handleOverlayTouch = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    handleOverlayClick();
  }, [handleOverlayClick]);

  const preventDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  if (isFixed && fixedRect) {
    // Calculate position based on animation state
    let itemLeft, itemTop, itemWidth, itemHeight;

    if (isAnimating) {
      // Centered and scaled to 160%
      const targetWidth = fixedRect.width * 1.7;
      const targetHeight = fixedRect.height * 1.7;
      itemLeft = (window.innerWidth - targetWidth) / 2;
      itemTop = (window.innerHeight - targetHeight) / 2;
      itemWidth = targetWidth;
      itemHeight = targetHeight;
    } else {
      // At original clicked position (or closing back to it)
      itemLeft = fixedRect.left;
      itemTop = fixedRect.top;
      itemWidth = fixedRect.width;
      itemHeight = fixedRect.height;
    }

    return (
      <>
        {/* Ghost element to track grid position - inherits parent transform */}
        <div
          ref={ghostRef}
          style={{
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            width: `${width}px`,
            height: `${height}px`,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        />
        {/* Overlay and fixed item rendered at body level via portal */}
        {createPortal(
          <>
            {/* Overlay - Fullscreen */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: isAnimating ? 'rgba(172, 174, 177, 0.92)' : 'rgba(172, 174, 177, 0)',
                zIndex: 999,
                pointerEvents: 'auto',
                transition: 'background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onClick={handleOverlayClick}
              onTouchEnd={handleOverlayTouch}
              onMouseDown={preventDrag}
              onMouseMove={preventDrag}
              onMouseUp={preventDrag}
              onTouchStart={preventDrag}
              onTouchMove={preventDrag}
            />
            {/* Item */}
            <div
              style={{
                position: 'fixed',
                left: `${itemLeft}px`,
                top: `${itemTop}px`,
                width: `${itemWidth}px`,
                height: `${itemHeight}px`,
                zIndex: 1000,
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {children}
            </div>
          </>,
          document.body
        )}
      </>
    );
  }

  return (
    <div
      ref={containerRef}
      key={id}
      style={{
        position: 'absolute',
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

export default memo(GridItemContainer);
