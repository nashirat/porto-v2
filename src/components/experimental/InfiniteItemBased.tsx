import { useState, useEffect, useRef } from "react";
import potteryData from "../../data/potteryData.json";

interface Position {
  x: number;
  y: number;
}

interface PotteryItem {
  id: number;
  title: string;
  description: string;
  author: string;
  img: string;
}

interface ItemData {
  id: number;
  key: string;
  pottery: PotteryItem;
  gridX: number;
  gridY: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}

export default function InfiniteItemBased() {
  // Grid settings
  const itemSize = 400; // 400px items
  const itemGap = 200; // 200px gaps
  const gridSpacing = itemSize + itemGap; // 600px total spacing

  // Generate items dynamically based on grid position
  const getItemForPosition = (gridCol: number, gridRow: number): ItemData => {
    // Create unique key from grid position (string format for React key)
    const uniqueKey = `item_${gridCol}_${gridRow}`;

    // Select pottery item deterministically based on grid position
    const potteryIndex = Math.abs(gridCol * 7 + gridRow * 13) % potteryData.length;
    const selectedPottery = potteryData[potteryIndex] as PotteryItem;

    const baseX = gridCol * gridSpacing;
    const baseY = gridRow * gridSpacing;

    return {
      id: gridCol * 10000 + gridRow, // Numeric ID for display
      key: uniqueKey, // Unique string key for React
      pottery: selectedPottery,
      gridX: baseX,
      gridY: baseY,
      currentX: baseX, // Current animated position
      currentY: baseY,
      targetX: baseX, // Target position for animation
      targetY: baseY,
    };
  };

  // Individual item animation system
  const [visibleItems, setVisibleItems] = useState<ItemData[]>([]);
  const itemsMap = useRef<Map<string, ItemData>>(new Map());
  const animationFrameId = useRef<number | null>(null);

  // Camera state for viewport calculation
  const cameraOffset = useRef<Position>({ x: 0, y: 0 });

  // Dragging state
  const isDragging = useRef(false);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });
  const dragDirection = useRef<'left' | 'right' | null>(null);
  const dragStartX = useRef(0);

  // Animation parameters
  const baseLerpSpeed = 0.15;
  const staggerStrength = 0.7;
  const maxStaggerDistance = 1200;

  // Calculate visible items based on viewport - generate infinitely in all directions
  const updateVisibleItems = () => {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const buffer = 600; // Buffer zone

    const viewportBounds = {
      left: -cameraOffset.current.x - buffer,
      right: -cameraOffset.current.x + windowWidth + buffer,
      top: -cameraOffset.current.y - buffer,
      bottom: -cameraOffset.current.y + windowHeight + buffer,
    };

    // Calculate which grid positions are visible
    const minGridCol = Math.floor(viewportBounds.left / gridSpacing);
    const maxGridCol = Math.ceil(viewportBounds.right / gridSpacing);
    const minGridRow = Math.floor(viewportBounds.top / gridSpacing);
    const maxGridRow = Math.ceil(viewportBounds.bottom / gridSpacing);

    // Generate items for all visible grid positions
    const visible: ItemData[] = [];
    for (let gridRow = minGridRow; gridRow <= maxGridRow; gridRow++) {
      for (let gridCol = minGridCol; gridCol <= maxGridCol; gridCol++) {
        const item = getItemForPosition(gridCol, gridRow);

        // Double-check if item is actually visible
        if (
          item.gridX < viewportBounds.right &&
          item.gridX + itemSize > viewportBounds.left &&
          item.gridY < viewportBounds.bottom &&
          item.gridY + itemSize > viewportBounds.top
        ) {
          visible.push(item);
        }
      }
    }

    setVisibleItems(visible);
  };

  // Animation loop for individual item movements
  const startAnimation = () => {
    const animate = () => {
      let hasChanges = false;

      // Update all visible items with stagger effect
      const updatedItems = visibleItems.map(item => {
        const currentItem = itemsMap.current.get(item.key) || item;

        // Calculate stagger lerp speed based on distance from drag start
        let lerpSpeed = baseLerpSpeed;

        if (isDragging.current && dragDirection.current) {
          const itemCenterX = currentItem.gridX + itemSize / 2;
          let distance = 0;

          if (dragDirection.current === 'right') {
            distance = Math.max(0, dragStartX.current - itemCenterX);
          } else {
            distance = Math.max(0, itemCenterX - dragStartX.current);
          }

          const lagFactor = Math.min(distance / maxStaggerDistance, 1);
          lerpSpeed = baseLerpSpeed * (1 - lagFactor * staggerStrength);
        }

        // Lerp to target position
        const newCurrentX = currentItem.currentX + (currentItem.targetX - currentItem.currentX) * lerpSpeed;
        const newCurrentY = currentItem.currentY + (currentItem.targetY - currentItem.currentY) * lerpSpeed;

        if (Math.abs(newCurrentX - currentItem.currentX) > 0.1 || Math.abs(newCurrentY - currentItem.currentY) > 0.1) {
          hasChanges = true;
        }

        const updatedItem = {
          ...currentItem,
          currentX: newCurrentX,
          currentY: newCurrentY,
        };

        itemsMap.current.set(item.key, updatedItem);
        return updatedItem;
      });

      if (hasChanges) {
        setVisibleItems(updatedItems);
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
  };

  // Mouse/Touch handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPosition.current = { x: e.clientX, y: e.clientY };
    dragStartX.current = e.clientX;
    dragDirection.current = null;
    e.preventDefault();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPosition.current.x;
    const deltaY = e.clientY - lastPosition.current.y;

    // Update camera offset for viewport calculation
    cameraOffset.current.x += deltaX;
    cameraOffset.current.y += deltaY;

    // Determine drag direction on first significant movement
    if (!dragDirection.current && Math.abs(deltaX) > 5) {
      dragDirection.current = deltaX > 0 ? 'right' : 'left';
    }

    // Update all item targets
    visibleItems.forEach(item => {
      const currentItem = itemsMap.current.get(item.key) || item;
      const updatedItem = {
        ...currentItem,
        targetX: currentItem.gridX + cameraOffset.current.x,
        targetY: currentItem.gridY + cameraOffset.current.y,
      };
      itemsMap.current.set(item.key, updatedItem);
    });

    // Update visible items after moving
    updateVisibleItems();

    lastPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => {
    isDragging.current = false;
    dragDirection.current = null;
  };

  // Initialize visible items and start animation
  useEffect(() => {
    updateVisibleItems();
    startAnimation();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#000000',
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {visibleItems.map((item) => (
        <div
          key={item.key}
          style={{
            position: 'absolute',
            left: `${item.currentX}px`,
            top: `${item.currentY}px`,
            width: `${itemSize}px`,
            height: `${itemSize}px`,
            border: '3px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            userSelect: 'none',
            willChange: 'transform',
            overflow: 'hidden',
            backgroundColor: '#111',
          }}
        >
          <img
            src={item.pottery.img}
            alt={item.pottery.title}
            title={`${item.pottery.title} by ${item.pottery.author}`}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            draggable={false}
          />
        </div>
      ))}
    </div>
  );
}