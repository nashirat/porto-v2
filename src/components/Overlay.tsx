import { useRef, useEffect, memo } from 'react';
import { GRID_CONFIG } from '../config/gridConfig';

interface OverlayProps {
  isAnimating: boolean;
  onOverlayClick: () => void;
  onOverlayTouch: (e: React.TouchEvent) => void;
  preventDrag: (e: React.MouseEvent | React.TouchEvent) => void;
}

function Overlay({ isAnimating, onOverlayClick, onOverlayTouch, preventDrag }: OverlayProps) {
  const followerRef = useRef<HTMLDivElement>(null);
  const targetPosition = useRef({ x: 0, y: 0 });
  const currentPosition = useRef({ x: 0, y: 0 });
  const rotation = useRef(0);
  const targetRotation = useRef(0);
  const scale = useRef(1);
  const targetScale = useRef(1);
  const rafId = useRef<number | null>(null);

  // Detect if device is mobile/touch
  const isMobile = window.innerWidth <= GRID_CONFIG.mobile.breakpoint;

  useEffect(() => {
    // Skip follower setup on mobile
    if (isMobile) return;

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

      // Calculate distance from center for scaling
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const distanceFromCenter = Math.hypot(e.clientX - centerX, e.clientY - centerY);

      // Calculate image size based on grid config (when clicked, image is 2x original size)
      const isMobile = window.innerWidth <= GRID_CONFIG.mobile.breakpoint;
      const cardHeightDivisor = isMobile ? GRID_CONFIG.mobile.cardHeightDivisor : GRID_CONFIG.desktop.cardHeightDivisor;
      const cardHeight = window.innerHeight / cardHeightDivisor;
      const scaledImageHeight = cardHeight * 2; // Image is scaled to 2x when clicked
      const scaledImageWidth = scaledImageHeight * GRID_CONFIG.desktop.aspectRatio;

      // Use diagonal of image as threshold radius, plus some buffer
      const imageRadius = Math.hypot(scaledImageWidth / 2, scaledImageHeight / 2);
      const threshold = imageRadius + 100; // Start scaling 100px outside image edge

      // Scaling range
      const minScale = 0.1; // Minimum scale (20%)
      const maxScale = 1.0; // Maximum scale (100%)

      if (distanceFromCenter < threshold) {
        // Scale down from 100% to 20% as distance decreases from threshold to 0
        const scaleProgress = distanceFromCenter / threshold;
        targetScale.current = minScale + (maxScale - minScale) * scaleProgress;
      } else {
        // Full size when beyond threshold
        targetScale.current = maxScale;
      }

      targetPosition.current = { x: e.clientX, y: e.clientY };
    };

    const updateFollowerPosition = () => {
      // Even lower easing factor for smoother movement
      const ease = 0.05;
      const rotationEase = 0.06;
      const scaleEase = 0.1;

      // Lerp (linear interpolation) for smooth easing
      currentPosition.current.x += (targetPosition.current.x - currentPosition.current.x) * ease;
      currentPosition.current.y += (targetPosition.current.y - currentPosition.current.y) * ease;

      // Smooth rotation
      rotation.current += (targetRotation.current - rotation.current) * rotationEase;

      // Smooth scaling
      scale.current += (targetScale.current - scale.current) * scaleEase;

      // Update DOM directly for best performance
      if (followerRef.current) {
        followerRef.current.style.transform = `translate3d(${currentPosition.current.x - 40}px, ${currentPosition.current.y - 40}px, 0) rotate(${rotation.current}deg) scale(${scale.current})`;
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
  }, [isMobile]);

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
        onClick={isMobile ? onOverlayClick : undefined}
        onTouchEnd={isMobile ? onOverlayTouch : undefined}
        onMouseDown={preventDrag}
        onMouseUp={preventDrag}
        onTouchStart={preventDrag}
        onTouchMove={preventDrag}
      />

      {/* Cursor Follower - Desktop only */}
      {isAnimating && !isMobile && (
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
