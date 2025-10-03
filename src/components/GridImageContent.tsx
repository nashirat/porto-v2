import { memo } from 'react';

interface GridImageContentProps {
  src: string;
  alt: string;
  title: string;
  onClick?: () => void;
}

function GridImageContent({ src, alt, title, onClick }: GridImageContentProps) {
  return (
    <img
      src={src}
      alt={alt}
      title={title}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
        userSelect: 'none',
        pointerEvents: 'auto',
        cursor: 'pointer',
      }}
      draggable={false}
      onClick={onClick}
    />
  );
}

export default memo(GridImageContent);
