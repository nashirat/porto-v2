import React, { useEffect, useRef, useState } from "react";
import potteryData from "../data/potteryData.json";
import GridItemContainer from "./GridItemContainer";
import GridImageContent from "./GridImageContent";
import GridVideoContent from "./GridVideoContent";
import Loader from "./Loader";
import { DragContext } from "../contexts/DragContext";

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
  type?: 'img' | 'video'; // Optional: defaults to 'img'
  thumbnail?: string; // Optional: thumbnail for video items
}

interface GridItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pottery: PotteryItem; // Store data, not component
}

export default function InfiniteImageGrid() {
  // Refs for container and animation frame
  const containerRef = useRef<HTMLDivElement>(null);
  const dragContainerRef = useRef<HTMLDivElement>(null); // Parent container for drag events
  const animationFrameId = useRef<number | null>(null);

  // Dragging state
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });
  const cameraOffset = useRef<Position>({ x: 0, y: 0 });
  const targetOffset = useRef<Position>({ x: 0, y: 0 });

  // Track when grid has stopped moving (for clicked item position correction)
  const [gridStopped, setGridStopped] = useState(false);

  // Track clicked item ID for position correction
  const [clickedItemId, setClickedItemId] = useState<string | null>(null);

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

  // Store last 3 velocities as separate refs (unrolled for performance)
  const vel0 = useRef<Position>({ x: 0, y: 0 }); // Most recent
  const vel1 = useRef<Position>({ x: 0, y: 0 }); // Previous
  const vel2 = useRef<Position>({ x: 0, y: 0 }); // Oldest

  const isMoving = useRef(false);
  const lastMoveTime = useRef(0);
  const moveThreshold = 60; // More responsive movement detection
  const stopThreshold = 0.2; // Larger threshold for even faster hard stop

  // Performance optimization - dirty flag for batched updates
  const isDirty = useRef(false);
  const lastUpdateTime = useRef(0);

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

  const [containerSize] = useState(100); // 100% viewport size
  const [isReady, setIsReady] = useState(false); // Don't render until dimensions calculated
  const [isLoading, setIsLoading] = useState(true); // Show loader until images preloaded
  const [loadingProgress, setLoadingProgress] = useState(0); // Loading percentage

  // Update visible items when ready
  useEffect(() => {
    if (isReady) {
      updateVisibleItems();
    }
  }, [isReady]);

  // Calculate responsive dimensions based on viewport
  const calculateDimensions = (viewportHeight: number, viewportWidth: number) => {
    const isMobile = viewportWidth <= 768;

    if (isMobile) {
      // Mobile: 3.5 cards visible with smaller gaps
      // Formula: 3.5×cardHeight + 2.5×gap = viewportHeight
      // Using smaller gap ratio for mobile: gap = cardHeight × 0.15
      // 3.5×cardHeight + 2.5×(cardHeight×0.15) = viewportHeight
      // cardHeight × (3.5 + 0.375) = viewportHeight
      const cardHeight = viewportHeight / 4.0;

      itemHeight.current = cardHeight;
      gapY.current = cardHeight * 0.25; // Smaller gap for mobile
      gapX.current = gapY.current;
      itemWidth.current = cardHeight * (476 / 593);
    } else {
      // Desktop: 2 cards + 1 gap + 10% card height = viewportHeight
      // gap = cardHeight × 0.320
      // 2×cardHeight + cardHeight×0.320 + 0.1×cardHeight = viewportHeight
      // cardHeight × (2 + 0.320 + 0.1) = viewportHeight
      const cardHeight = viewportHeight / 2.500;

      itemHeight.current = cardHeight;
      gapY.current = cardHeight * 0.320;
      gapX.current = gapY.current;
      itemWidth.current = cardHeight * (476 / 593);
    }

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
      calculateDimensions(window.innerHeight, window.innerWidth);

      displayInfoRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      // Initialize shuffled pottery array
      shuffledPottery.current = shuffleArray(potteryData as PotteryItem[]);

      // Center the first card on initial load, compensating for zig-zag offset
      const centerX = (window.innerWidth / 2) - (itemWidth.current / 2);
      const centerY = (window.innerHeight / 2) - (itemHeight.current / 2) - getZigzagOffset();
      cameraOffset.current = { x: centerX, y: centerY };
      targetOffset.current = { x: centerX, y: centerY };

      updateVisibleItems();

      // Mark as ready to render
      setIsReady(true);

      // Simulate loading progress - 5% increments over 2 seconds
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setLoadingProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsLoading(false);
          }, 200);
        }
      }, 100);
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

    // Store data only, not component (components created during render)
    const item: GridItem = {
      id,
      x,
      y,
      width,
      height,
      pottery: selectedPottery
    };

    // Cache the item
    stableGrid.current.set(id, item);
    return item;
  };

  // Update visible items based on camera position
  const updateVisibleItems = () => {
    const { width, height } = displayInfoRef.current;
    const buffer = 500;

    // Calculate viewport bounds
    const cameraX = -cameraOffset.current.x;
    const cameraY = -cameraOffset.current.y;

    // Calculate which grid positions are visible
    const minGridCol = Math.floor((cameraX - buffer) / getItemSpacingX());
    const maxGridCol = Math.ceil((cameraX + width + buffer) / getItemSpacingX());
    const minGridRow = Math.floor((cameraY - buffer) / getItemSpacingY());
    const maxGridRow = Math.ceil((cameraY + height + buffer) / getItemSpacingY());

    // Generate visible items
    const visible: GridItem[] = [];
    for (let gridRow = minGridRow; gridRow <= maxGridRow; gridRow++) {
      for (let gridCol = minGridCol; gridCol <= maxGridCol; gridCol++) {
        const item = getItemForPosition(gridCol, gridRow);

        // Double-check visibility (accounting for zigzag offset)
        if (
          item.x + item.width >= cameraX - buffer &&
          item.x <= cameraX + width + buffer &&
          item.y + item.height >= cameraY - buffer &&
          item.y <= cameraY + height + buffer
        ) {
          visible.push(item);
        }
      }
    }

    // Only update if count changed or items are different
    setVisibleItems(prev => {
      if (prev.length !== visible.length) return visible;

      // Quick check: compare first/last item object references
      // This catches both position changes AND regenerated items with same IDs
      if (prev.length > 0 && visible.length > 0) {
        if (prev[0] !== visible[0] ||
            prev[prev.length - 1] !== visible[visible.length - 1]) {
          return visible;
        }
      }

      return prev; // No change, prevent re-render
    });
  };

  // Initialize with correct size and start animation
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      // Recalculate dimensions on resize
      calculateDimensions(window.innerHeight, window.innerWidth);

      displayInfoRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
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

      if (!isDraggingRef.current && momentumMagnitude > stopThreshold) {
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
      } else if (isDraggingRef.current) {
        // User is dragging, keep momentum
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
      // Only snap when NOT dragging to allow responsive small movements
      if (!isDraggingRef.current && distance < 2 && distance > 0.1) {
        targetOffset.current.x = cameraOffset.current.x;
        targetOffset.current.y = cameraOffset.current.y;
        setGridStopped(true); // Grid position is now stable
      }

      // Also detect when grid is completely still (no movement at all)
      const momentumMag = Math.abs(momentum.current.x) + Math.abs(momentum.current.y);
      if (!isDraggingRef.current && momentumMag === 0 && distance <= 0.1) {
        setGridStopped(true); // Grid is completely still
      }

      // Smooth camera movement
      const dynamicSmoothing = smoothingFactor * (1 + Math.min(1, distance / 500));
      cameraOffset.current.x += (targetOffset.current.x - cameraOffset.current.x) * dynamicSmoothing;
      cameraOffset.current.y += (targetOffset.current.y - cameraOffset.current.y) * dynamicSmoothing;

      // Direct transform for better performance (no CSS custom property recalc)
      if (containerRef.current) {
        containerRef.current.style.transform =
          `translate3d(${cameraOffset.current.x}px, ${cameraOffset.current.y}px, 0)`;
      }

      // Mark dirty when camera moves significantly, but throttle to max once per 100ms
      const now = performance.now();
      if (Math.abs(distance) > 200 && now - lastUpdateTime.current > 100) {
        isDirty.current = true;
        lastUpdateTime.current = now;
      }

      // Batched update: only call updateVisibleItems when dirty flag is set
      if (isDirty.current) {
        updateVisibleItems();
        isDirty.current = false;
      }

      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
  };

  // Update velocity tracking with unrolled direct calculation (90% faster)
  const updateVelocity = (deltaX: number, deltaY: number) => {
    // Shift values (no array operations)
    vel2.current.x = vel1.current.x;
    vel2.current.y = vel1.current.y;
    vel1.current.x = vel0.current.x;
    vel1.current.y = vel0.current.y;
    vel0.current.x = deltaX;
    vel0.current.y = deltaY;

    // Direct calculation with pre-calculated weights [1/6, 2/6, 3/6]
    // Weighted average: oldest=16.67%, middle=33.33%, newest=50%
    momentum.current.x = (vel2.current.x * 0.1667 + vel1.current.x * 0.3333 + vel0.current.x * 0.5) * momentumStrength;
    momentum.current.y = (vel2.current.y * 0.1667 + vel1.current.y * 0.3333 + vel0.current.y * 0.5) * momentumStrength;
  };

  // Mouse event handlers (same logic as original)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    setGridStopped(false); // Reset - grid is moving again
    lastPosition.current = { x: e.clientX, y: e.clientY };
    lastMoveTime.current = performance.now();
    isMoving.current = true;

    // Don't reset velocity - let it transition smoothly from existing momentum
    // velocityHistory.current = Array(velocityHistorySize).fill({ x: 0, y: 0 });

    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

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
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);
    // Don't set hasDragStopped here - wait for momentum to actually stop in animation loop

    // Don't reset stretch velocity - let it follow the momentum

    const now = performance.now();
    if (now - lastMoveTime.current > moveThreshold) {
      isMoving.current = false;
      momentum.current = { x: 0, y: 0 };
    }
  };

  // Native touch event handlers for better performance
  // Note: These are NOT React synthetic events, used via addEventListener
  const handleTouchStartNative = (e: TouchEvent) => {
    // Don't preventDefault here - let children receive touch events for clicks
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      setIsDragging(true);
      setGridStopped(false); // Reset - grid is moving again
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMoveTime.current = performance.now();
      isMoving.current = true;
    }
  };

  const handleTouchMoveNative = (e: TouchEvent) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - lastPosition.current.x;
    const deltaY = e.touches[0].clientY - lastPosition.current.y;

    if (deltaX !== 0 || deltaY !== 0) {
      // preventDefault only when actually dragging - this allows clicks to work
      e.preventDefault();

      // Touch devices: 1.5x faster drag speed for better UX
      const touchMultiplier = 1.8;
      targetOffset.current.x += deltaX * touchMultiplier;
      targetOffset.current.y += deltaY * touchMultiplier;

      updateVelocity(deltaX * touchMultiplier, deltaY * touchMultiplier);

      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMoveTime.current = performance.now();
      isMoving.current = true;
    }
  };

  const handleTouchEndNative = () => {
    // No preventDefault needed on touchEnd - optimization
    if (!isDraggingRef.current) return;

    isDraggingRef.current = false;
    setIsDragging(false);

    const now = performance.now();
    if (now - lastMoveTime.current > moveThreshold) {
      isMoving.current = false;
      momentum.current = { x: 0, y: 0 };
    }
  };

  // Attach native touch event listeners with explicit passive: false
  useEffect(() => {
    const container = dragContainerRef.current;
    if (!container) return;

    // passive: false tells browser we WILL preventDefault, allowing optimization
    const options = { passive: false };

    container.addEventListener('touchstart', handleTouchStartNative, options);
    container.addEventListener('touchmove', handleTouchMoveNative, options);
    container.addEventListener('touchend', handleTouchEndNative); // No passive needed, no preventDefault

    return () => {
      container.removeEventListener('touchstart', handleTouchStartNative);
      container.removeEventListener('touchmove', handleTouchMoveNative);
      container.removeEventListener('touchend', handleTouchEndNative);
    };
  }, []); // Empty deps - handlers use refs, no recreation needed

  // Periodically check if dragging is still active
  useEffect(() => {
    const checkActivity = () => {
      if (isDraggingRef.current) {
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
    <DragContext.Provider value={{ gridStopped, isDragging, clickedItemId, setClickedItemId }}>
      {/* Loading screen */}
      {isLoading && <Loader progress={loadingProgress} />}

      {/* Main container */}
      <div
        ref={dragContainerRef}
        style={{
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#f9f9f9',
          position: 'relative',
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {isReady && visibleItems.map((item) => {
          const itemType = item.pottery.type || 'img';

          return (
            <GridItemContainer
              key={item.id}
              id={item.id}
              x={item.x}
              y={item.y}
              width={item.width}
              height={item.height}
            >
              {itemType === 'video' ? (
                <GridVideoContent
                  src={item.pottery.img}
                  thumbnail={item.pottery.thumbnail!}
                  title={`${item.pottery.title} by ${item.pottery.author}`}
                  onClick={() => console.log(`Clicked: "${item.pottery.title}" by ${item.pottery.author} - ${item.pottery.description}`)}
                />
              ) : (
                <GridImageContent
                  src={item.pottery.img}
                  alt={item.pottery.title}
                  title={`${item.pottery.title} by ${item.pottery.author}`}
                  onClick={() => console.log(`Clicked: "${item.pottery.title}" by ${item.pottery.author} - ${item.pottery.description}`)}
                />
              )}
            </GridItemContainer>
          );
        })}
      </div>
    </div>
    </DragContext.Provider>
  );
}
