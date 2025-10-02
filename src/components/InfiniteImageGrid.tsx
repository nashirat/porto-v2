import { useEffect, useRef, useState } from "react";
import potteryData from "../data/potteryData.json";

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

interface GridItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  potteryData: PotteryItem;
}

export default function InfiniteImageGrid() {
  // Refs for container and animation frame
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);

  // Dragging state
  const isDragging = useRef(false);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });
  const cameraOffset = useRef<Position>({ x: 0, y: 0 });
  const targetOffset = useRef<Position>({ x: 0, y: 0 });

  // Grid settings - Dynamic sizing based on viewport
  const itemWidth = useRef(476);
  const itemHeight = useRef(593);
  const gapX = useRef(220);
  const gapY = useRef(220);

  // Animation and physics - very fast stopping behavior
  const momentum = useRef<Position>({ x: 0, y: 0 });
  const damping = 0.92; // Much stronger damping for very fast stop
  const momentumStrength = 0.10; // Much less momentum
  const smoothingFactor = 0.02;
  const velocityHistory = useRef<Position[]>([]);
  const velocityHistorySize = 3; // Shorter velocity history for quicker stop
  const isMoving = useRef(false);
  const lastMoveTime = useRef(0);
  const moveThreshold = 60; // More responsive movement detection
  const stopThreshold = 0.2; // Larger threshold for even faster hard stop


  // Store display info
  const displayInfoRef = useRef({
    width: 0,
    height: 0,
  });

  // Pure infinite grid - no areas, just positions
  const stableGrid = useRef<Map<string, GridItem>>(new Map());
  const [visibleItems, setVisibleItems] = useState<GridItem[]>([]);

  // Randomized pottery array and index counter
  const shuffledPottery = useRef<PotteryItem[]>([]);
  const potteryIndex = useRef(0);

  // Entrance animation zoom
  const [scale, setScale] = useState(0.7);
  const [containerSize] = useState(160); // 160% to ensure coverage when zoomed out
  const [isReady, setIsReady] = useState(false); // Don't render until dimensions calculated
  const [isLoading, setIsLoading] = useState(true); // Show loader until images preloaded

  // Update visible items when scale changes
  useEffect(() => {
    if (isReady) {
      updateVisibleItems();
    }
  }, [scale, isReady]);

  // Calculate responsive dimensions based on viewport
  const calculateDimensions = (viewportHeight: number) => {
    // Formula: 2 cards + 1 gap = viewportHeight
    // Since gap = cardHeight × 0.371 (220/593 ratio)
    // 2×cardHeight + cardHeight×0.371 = viewportHeight
    const cardHeight = viewportHeight / 2.371;

    itemHeight.current = cardHeight;
    gapY.current = cardHeight * 0.371;
    gapX.current = gapY.current; // Keep square gaps
    itemWidth.current = cardHeight * (476 / 593); // Maintain aspect ratio

    // Clear cached grid items since dimensions changed
    stableGrid.current.clear();
  };

  // Grid layout settings (calculated dynamically)
  const getItemSpacingX = () => itemWidth.current + gapX.current;
  const getItemSpacingY = () => itemHeight.current + gapY.current;
  const getZigzagOffset = () => getItemSpacingY() * 0.5;

  // Shuffle array using Fisher-Yates algorithm
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Get next pottery item from shuffled array
  const getNextPottery = (): PotteryItem => {
    // Re-shuffle when we've used all items
    if (potteryIndex.current >= shuffledPottery.current.length) {
      shuffledPottery.current = shuffleArray(potteryData as PotteryItem[]);
      potteryIndex.current = 0;
    }

    const item = shuffledPottery.current[potteryIndex.current];
    potteryIndex.current++;
    return item;
  };

  // Initialize display info and velocity history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Disable body scroll
      document.body.style.overflow = 'hidden';

      // Calculate dimensions FIRST before any rendering
      calculateDimensions(window.innerHeight);

      displayInfoRef.current = {
        width: window.innerWidth * (containerSize / 100),
        height: window.innerHeight * (containerSize / 100),
      };

      // Initialize shuffled pottery array
      shuffledPottery.current = shuffleArray(potteryData as PotteryItem[]);

      // Center the first card on initial load, compensating for zig-zag offset
      const actualWidth = window.innerWidth * (containerSize / 100);
      const actualHeight = window.innerHeight * (containerSize / 100);
      const centerX = (actualWidth/2) - (itemWidth.current / 2);
      const centerY = (actualHeight/2) - (itemHeight.current / 2) - getZigzagOffset();
      cameraOffset.current = { x: centerX, y: centerY };
      targetOffset.current = { x: centerX, y: centerY };

      for (let i = 0; i < velocityHistorySize; i++) {
        velocityHistory.current.push({ x: 0, y: 0 });
      }

      updateVisibleItems();

      // Mark as ready to render
      setIsReady(true);

      // Preload initial images before showing
      const imagesToPreload = shuffledPottery.current.slice(0, 10); // First 10 images
      let loadedCount = 0;

      const preloadImage = (src: string) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            loadedCount++;
            resolve(true);
          };
          img.onerror = () => {
            loadedCount++;
            resolve(false);
          };
          img.src = src;
        });
      };

      Promise.all(imagesToPreload.map(item => preloadImage(item.img))).then(() => {
        setIsLoading(false);

        // Entrance animation: zoom in from 0.7 to 1.0
        setTimeout(() => {
          setScale(1);
        }, 100);
      });
    }

    return () => {
      // Re-enable body scroll on unmount
      document.body.style.overflow = '';
    };
  }, []);

  // Generate item for a specific grid position (simple zig-zag)
  const getItemForPosition = (gridCol: number, gridRow: number): GridItem => {
    const id = `${gridCol}-${gridRow}`;

    // Return existing item if already generated
    if (stableGrid.current.has(id)) {
      return stableGrid.current.get(id)!;
    }

    // All items same size
    const width = itemWidth.current;
    const height = itemHeight.current;

    // Horizontal zig-zag pattern: alternate every column vertically
    // For seamless pattern: ...-2(offset), -1(no), 0(offset), 1(no), 2(offset)...
    const isStaggeredCol = Math.abs(gridCol) % 2 === 0;
    const colOffsetY = isStaggeredCol ? getZigzagOffset() : 0;

    // Calculate absolute world position
    const x = gridCol * getItemSpacingX();
    const y = gridRow * getItemSpacingY() + colOffsetY;

    // Get next pottery from shuffled array
    const selectedPottery = getNextPottery();

    const item: GridItem = {
      id,
      x,
      y,
      width,
      height,
      potteryData: selectedPottery
    };

    // Cache the item
    stableGrid.current.set(id, item);
    return item;
  };

  // Update visible items based on camera position
  const updateVisibleItems = () => {
    const { width, height } = displayInfoRef.current;
    const buffer = 500;

    // Account for scale - when zoomed out, we see more area
    const effectiveWidth = width / scale;
    const effectiveHeight = height / scale;

    // Calculate viewport bounds
    const cameraX = -cameraOffset.current.x;
    const cameraY = -cameraOffset.current.y;

    // Calculate which grid positions are visible
    const minGridCol = Math.floor((cameraX - buffer) / getItemSpacingX());
    const maxGridCol = Math.ceil((cameraX + effectiveWidth + buffer) / getItemSpacingX());
    const minGridRow = Math.floor((cameraY - buffer) / getItemSpacingY());
    const maxGridRow = Math.ceil((cameraY + effectiveHeight + buffer) / getItemSpacingY());

    // Generate visible items
    const visible: GridItem[] = [];
    for (let gridRow = minGridRow; gridRow <= maxGridRow; gridRow++) {
      for (let gridCol = minGridCol; gridCol <= maxGridCol; gridCol++) {
        const item = getItemForPosition(gridCol, gridRow);

        // Double-check visibility (accounting for zigzag offset and scale)
        if (
          item.x + item.width >= cameraX - buffer &&
          item.x <= cameraX + effectiveWidth + buffer &&
          item.y + item.height >= cameraY - buffer &&
          item.y <= cameraY + effectiveHeight + buffer
        ) {
          visible.push(item);
        }
      }
    }

    setVisibleItems(visible);
  };

  // Initialize with correct size and start animation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      // Recalculate dimensions on resize
      calculateDimensions(window.innerHeight);

      displayInfoRef.current = {
        width: window.innerWidth * (containerSize / 100),
        height: window.innerHeight * (containerSize / 100),
      };
      updateVisibleItems();
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    startAnimation();

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Animation loop
  const startAnimation = () => {
    const animate = () => {

      // Apply momentum with hard stopping
      const momentumMagnitude = Math.abs(momentum.current.x) + Math.abs(momentum.current.y);

      if (!isDragging.current && momentumMagnitude > stopThreshold) {
        if (isMoving.current) {
          targetOffset.current.x += momentum.current.x;
          targetOffset.current.y += momentum.current.y;

          // Apply damping
          momentum.current.x *= damping;
          momentum.current.y *= damping;
        } else {
          // Very aggressive stopping when not actively moving
          momentum.current.x *= 0.5;
          momentum.current.y *= 0.5;
        }

        // Hard stop when momentum gets very small
        if (momentumMagnitude < stopThreshold) {
          momentum.current.x = 0;
          momentum.current.y = 0;
        }
      } else {
        // Force complete stop
        momentum.current.x = 0;
        momentum.current.y = 0;
      }

      // Smooth camera movement with hard stopping
      const distance = Math.hypot(
        targetOffset.current.x - cameraOffset.current.x,
        targetOffset.current.y - cameraOffset.current.y
      );

      // Reduce target offset when within 2px to eliminate slow tail-end easing
      if (distance < 10 && distance > 0.1) {
        targetOffset.current.x = cameraOffset.current.x;
        targetOffset.current.y = cameraOffset.current.y;
      }

      // Smooth camera movement
      const dynamicSmoothing = smoothingFactor * (1 + Math.min(1, distance / 500));
      cameraOffset.current.x += (targetOffset.current.x - cameraOffset.current.x) * dynamicSmoothing;
      cameraOffset.current.y += (targetOffset.current.y - cameraOffset.current.y) * dynamicSmoothing;

      // Update all item transforms
      if (containerRef.current) {
        const items = containerRef.current.querySelectorAll('[data-item-x]');
        items.forEach((item) => {
          const htmlItem = item as HTMLElement;
          const x = parseFloat(htmlItem.dataset.itemX || '0');
          const y = parseFloat(htmlItem.dataset.itemY || '0');
          htmlItem.style.transform = `translate3d(${x + cameraOffset.current.x}px, ${y + cameraOffset.current.y}px, 0)`;
        });
      }

      // Update visible items when camera moves significantly
      if (Math.abs(distance) > 200) {
        updateVisibleItems();
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
  };

  // Update velocity tracking (same as original)
  const updateVelocity = (deltaX: number, deltaY: number) => {
    velocityHistory.current.push({ x: deltaX, y: deltaY });

    if (velocityHistory.current.length > velocityHistorySize) {
      velocityHistory.current.shift();
    }

    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;

    velocityHistory.current.forEach((velocity, index) => {
      const weight = (index + 1) / velocityHistorySize;
      totalX += velocity.x * weight;
      totalY += velocity.y * weight;
      totalWeight += weight;
    });

    momentum.current.x = totalX / totalWeight * momentumStrength;
    momentum.current.y = totalY / totalWeight * momentumStrength;
  };

  // Mouse event handlers (same logic as original)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPosition.current = { x: e.clientX, y: e.clientY };
    lastMoveTime.current = performance.now();
    isMoving.current = true;

    // Don't reset momentum on mouse down - let it continue
    velocityHistory.current = Array(velocityHistorySize).fill({ x: 0, y: 0 });

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;

    const deltaX = e.clientX - lastPosition.current.x;
    const deltaY = e.clientY - lastPosition.current.y;

    if (deltaX !== 0 || deltaY !== 0) {
      targetOffset.current.x += deltaX;
      targetOffset.current.y += deltaY;


      updateVelocity(deltaX, deltaY);

      lastPosition.current = { x: e.clientX, y: e.clientY };
      lastMoveTime.current = performance.now();
      isMoving.current = true;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    // Don't reset stretch velocity - let it follow the momentum

    const now = performance.now();
    if (now - lastMoveTime.current > moveThreshold) {
      isMoving.current = false;
      momentum.current = { x: 0, y: 0 };
    }
  };

  // Touch event handlers (same logic as original)
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMoveTime.current = performance.now();
      isMoving.current = true;

      // Don't reset momentum on touch start - let it continue
      velocityHistory.current = Array(velocityHistorySize).fill({ x: 0, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - lastPosition.current.x;
    const deltaY = e.touches[0].clientY - lastPosition.current.y;

    if (deltaX !== 0 || deltaY !== 0) {
      targetOffset.current.x += deltaX;
      targetOffset.current.y += deltaY;


      updateVelocity(deltaX, deltaY);

      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMoveTime.current = performance.now();
      isMoving.current = true;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current) return;

    isDragging.current = false;

    // Don't reset stretch velocity - let it follow the momentum

    const now = performance.now();
    if (now - lastMoveTime.current > moveThreshold) {
      isMoving.current = false;
      momentum.current = { x: 0, y: 0 };
    }
  };

  // Periodically check if dragging is still active
  useEffect(() => {
    const checkActivity = () => {
      if (isDragging.current) {
        const now = performance.now();
        if (now - lastMoveTime.current > moveThreshold) {
          isMoving.current = false;
        }
      }
    };

    const activityInterval = setInterval(checkActivity, 50);

    return () => {
      clearInterval(activityInterval);
    };
  }, []);


  return (
    <>
      {/* Loading screen */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100vh',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div style={{ color: '#ffffff', fontSize: '18px', fontFamily: 'system-ui, sans-serif' }}>
            Loading...
          </div>
        </div>
      )}

      {/* Main container */}
      <div
        style={{
          width: `${containerSize}%`,
          height: `${containerSize}vh`,
          overflow: 'hidden',
          backgroundColor: '#f9f9f9',
          position: 'relative',
          touchAction: 'none',
          transform: `scale(${scale})`,
          transformOrigin: '50% 50%',
          transition: 'transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
          left: `${-(containerSize - 100) / 2}%`,
          top: `${-(containerSize - 100) / 2}vh`,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {isReady && visibleItems.map((item) => (
          <img
            key={item.id}
            data-item-x={item.x}
            data-item-y={item.y}
            src={item.potteryData.img}
            alt={item.potteryData.title}
            title={`${item.potteryData.title} by ${item.potteryData.author}`}
            style={{
              position: 'absolute',
              transform: `translate3d(${item.x + cameraOffset.current.x}px, ${item.y + cameraOffset.current.y}px, 0)`,
              width: `${item.width}px`,
              height: `${item.height}px`,
              objectFit: 'cover',
              display: 'block',
              userSelect: 'none',
              pointerEvents: 'auto',
              cursor: 'pointer',
              willChange: 'transform',
            }}
            draggable={false}
            onClick={() => console.log(`Clicked: "${item.potteryData.title}" by ${item.potteryData.author} - ${item.potteryData.description}`)}
          />
        ))}
      </div>
    </div>
    </>
  );
}
