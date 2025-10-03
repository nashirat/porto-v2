import { ReactNode, memo, useState, useRef, useEffect } from 'react';
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

  const handleClick = () => {
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
  };

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

  const handleOverlayClick = () => {
    // User wants to close - either do it now or wait for grid to stop
    if (gridStopped) {
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
  };

  const handleOverlayTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    handleOverlayClick();
  };

  const preventDrag = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (isFixed && fixedRect) {
    const isMobile = window.innerWidth <= 768;

    // Add 25% offset to compensate for the grid container's left: -25%
    const offsetX = window.innerWidth * 0.25;
    const offsetY = window.innerHeight * 0.25;

    // Calculate position based on animation state
    let itemLeft, itemTop, itemWidth, itemHeight;

    if (isAnimating) {
      // Centered and scaled to 160%
      const targetWidth = fixedRect.width * 1.6;
      const targetHeight = fixedRect.height * 1.6;
      itemLeft = (window.innerWidth - targetWidth) / 2 + offsetX;
      itemTop = (window.innerHeight - targetHeight) / 2 + offsetY;
      itemWidth = targetWidth;
      itemHeight = targetHeight;
    } else {
      // At original clicked position (or closing back to it)
      itemLeft = fixedRect.left + offsetX;
      itemTop = fixedRect.top + offsetY;
      itemWidth = fixedRect.width;
      itemHeight = fixedRect.height;
    }

    return (
      <>
        {/* Ghost element to track grid position */}
        <div
          ref={ghostRef}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: `${width}px`,
            height: `${height}px`,
            transform: `translate(calc(var(--camera-x) + ${x}px), calc(var(--camera-y) + ${y}px))`,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        />
        {/* Overlay - Full-screen for mobile, offset for desktop */}
        <div
          style={{
            position: 'fixed',
            top: isMobile ? `${offsetY}px` : `${offsetY - window.innerHeight * 0.02}px`,
            left: `${offsetX}px`,
            width: isMobile ? '100vw' : '110vw',
            height: isMobile ? '100vh' : '110vh',
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
        transform: 'translate3d(var(--camera-x, 0px), var(--camera-y, 0px), 0)',
        width: `${width}px`,
        height: `${height}px`,
        willChange: 'transform',
      }}
      onClick={handleClick}
    >
      {children}
    </div>
  );
}

export default memo(GridItemContainer);
