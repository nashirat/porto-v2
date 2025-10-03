import { memo, useState, useEffect } from 'react';
import { useDragContext } from '../contexts/DragContext';

interface GridVideoContentProps {
  src: string;
  thumbnail: string;
  title: string;
  onClick?: () => void;
}

function GridVideoContent({ src, thumbnail, title, onClick }: GridVideoContentProps) {
  const { gridStopped, isDragging } = useDragContext();
  const [showVideo, setShowVideo] = useState(false);
  const [hideImage, setHideImage] = useState(false);

  useEffect(() => {
    // When grid stops, wait 1s before upgrading to video
    // Cancel if dragging starts again during the delay
    if (gridStopped && !showVideo && !isDragging) {
      const upgradeTimer = setTimeout(() => {
        setShowVideo(true);
      }, 1000);

      return () => clearTimeout(upgradeTimer);
    }
  }, [gridStopped, showVideo, isDragging]);

  useEffect(() => {
    // When video starts showing, wait 100ms before hiding the image
    // This prevents flashing during the transition
    if (showVideo && !hideImage) {
      const hideTimer = setTimeout(() => {
        setHideImage(true);
      }, 200);

      return () => clearTimeout(hideTimer);
    }
  }, [showVideo, hideImage]);

  const handleTouch = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (onClick) onClick();
  };

  const commonStyles = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
    userSelect: 'none' as const,
    pointerEvents: 'auto' as const,
    cursor: 'pointer',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!hideImage && (
        <img
          src={thumbnail}
          alt={title}
          title={title}
          style={{
            ...commonStyles,
            position: 'absolute' as const,
            top: 0,
            left: 0,
          }}
          draggable={false}
          onClick={onClick}
          onTouchEnd={handleTouch}
        />
      )}
      {showVideo && (
        <video
          src={src}
          title={title}
          style={{
            ...commonStyles,
            position: 'absolute' as const,
            top: 0,
            left: 0,
            backfaceVisibility: 'hidden' as const,
            transform: 'translateZ(0)',
            willChange: 'transform',
          }}
          autoPlay
          muted
          loop
          playsInline
          onClick={onClick}
          onTouchEnd={handleTouch}
        />
      )}
    </div>
  );
}

export default memo(GridVideoContent);
