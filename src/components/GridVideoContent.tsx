import { memo, useState, useEffect } from 'react';
import { useDragContext } from '../contexts/DragContext';

interface GridVideoContentProps {
  src: string;
  title: string;
  onClick: () => void;
}

const PLACEHOLDER_IMG = '/1.png';

function GridVideoContent({ src, title, onClick }: GridVideoContentProps) {
  const { hasDragStopped, isDragging } = useDragContext();
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    // When drag stops, wait 250ms before upgrading to video
    // Cancel if dragging starts again during the delay
    if (hasDragStopped && !showVideo && !isDragging) {
      const upgradeTimer = setTimeout(() => {
        setShowVideo(true);
      }, 1000);

      return () => clearTimeout(upgradeTimer);
    }
  }, [hasDragStopped, showVideo, isDragging]);

  const commonStyles = {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    display: 'block',
    userSelect: 'none' as const,
    pointerEvents: 'auto' as const,
    cursor: 'pointer',
  };

  if (!showVideo) {
    // Show placeholder image while dragging or before first upgrade
    return (
      <img
        src={PLACEHOLDER_IMG}
        alt={title}
        title={title}
        style={commonStyles}
        draggable={false}
        onClick={onClick}
      />
    );
  }

  return (
    <video
      src={src}
      title={title}
      style={{
        ...commonStyles,
        backfaceVisibility: 'hidden' as const,
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
      autoPlay
      muted
      loop
      playsInline
      onClick={onClick}
    />
  );
}

export default memo(GridVideoContent);
