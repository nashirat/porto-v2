import { ReactNode, memo } from 'react';

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
  return (
    <div
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
    >
      {children}
    </div>
  );
}

export default memo(GridItemContainer);
