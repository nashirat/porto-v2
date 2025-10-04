import { useRef, useEffect, memo } from 'react';

interface OverlayProps {
  isAnimating: boolean;
  onOverlayClick: () => void;
  onOverlayTouch: () => void;
  preventDrag: (e: React.MouseEvent | React.TouchEvent) => void;
}

function Overlay({ isAnimating, onOverlayClick, onOverlayTouch, preventDrag }: OverlayProps) {
  const followerRef = useRef<HTMLDivElement>(null);
  const targetPosition = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: 0, y: 0 });
  const rotation = useRef(0);
  const targetRotation = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    // Initialize position at current mouse position
    const initializePosition = (e: MouseEvent) => {
      targetPosition.current = { x: e.clientX, y: e.clientY };
      currentPosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Calculate velocity for rotation
      const deltaX = e.clientX - targetPosition.current.x;
      const deltaY = e.clientY - targetPosition.current.y;

      // Rotation based on both horizontal and vertical movement
      targetRotation.current = (deltaX * 1.5) + (deltaY * 1.5);

      targetPosition.current = { x: e.clientX, y: e.clientY };
    };

    const updateFollowerPosition = () => {
      // Even lower easing factor for smoother movement
      const ease = 0.05;
      const rotationEase = 0.06;

      // Lerp (linear interpolation) for smooth easing
      currentPosition.current.x += (targetPosition.current.x - currentPosition.current.x) * ease;
      currentPosition.current.y += (targetPosition.current.y - currentPosition.current.y) * ease;

      // Smooth rotation
      rotation.current += (targetRotation.current - rotation.current) * rotationEase;

      // Update DOM directly for best performance
      if (followerRef.current) {
        followerRef.current.style.transform = `translate3d(${currentPosition.current.x - 40}px, ${currentPosition.current.y - 40}px, 0) rotate(${rotation.current}deg)`;
      }

      rafId.current = requestAnimationFrame(updateFollowerPosition);
    };

    // Initialize at current mouse position
    window.addEventListener('mousemove', initializePosition, { once: true });
    window.addEventListener('mousemove', handleMouseMove);
    rafId.current = requestAnimationFrame(updateFollowerPosition);

    return () => {
      window.removeEventListener('mousemove', initializePosition);
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  return (
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
        onMouseDown={preventDrag}
        onMouseUp={preventDrag}
        onTouchStart={preventDrag}
        onTouchMove={preventDrag}
      />

      {/* Cursor Follower */}
      {isAnimating && (
        <div
          ref={followerRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: '80px',
            height: '80px',
            backgroundImage: 'url(/xfollower.png)',
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            zIndex: 999,
            pointerEvents: 'auto',
            cursor: 'pointer',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
          onClick={onOverlayClick}
          onTouchEnd={onOverlayTouch}
        />
      )}
    </>
  );
}

export default memo(Overlay);
