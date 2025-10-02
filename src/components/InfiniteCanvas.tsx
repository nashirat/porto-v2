import { useEffect, useRef } from "react";

interface Position {
  x: number;
  y: number;
}

export default function InfiniteCanvas() {
  // Refs for canvas and animation frame
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationFrameId = useRef<number | null>(null);

  // Dragging state
  const isDragging = useRef(false);
  const lastPosition = useRef<Position>({ x: 0, y: 0 });
  const cameraOffset = useRef<Position>({ x: 0, y: 0 });
  const targetOffset = useRef<Position>({ x: 0, y: 0 });

  // Grid settings
  const gridSize = 600;
  const gridLineColor = "rgba(255, 255, 255, 0.2)";
  const gridBackgroundColor = "#000000";

  // Animation and physics - heavy dragging with quick stop
  const momentum = useRef<Position>({ x: 0, y: 0 });
  const damping = 1; // Much more aggressive damping for quick stop
  const momentumStrength = 0.20; // Much lower for heavier feel
  const smoothingFactor = 0.02; // Much smaller for high frame rates
  const velocityHistory = useRef<Position[]>([]);
  const velocityHistorySize = 5; // Track last 5 velocity points for smoother averaging
  const isMoving = useRef(false);
  const lastMoveTime = useRef(0);
  const moveThreshold = 70; // Slightly reduced for more responsive feel

  // Store display info in a ref but initialize it safely
  const displayInfoRef = useRef({
    width: 0,
    height: 0,
    dpi: 1
  });

  // Initialize velocityHistory safely
  useEffect(() => {
    // Check if we're in the browser environment
    if (typeof window !== 'undefined') {
      // Update display info with actual window values
      displayInfoRef.current = {
        width: window.innerWidth,
        height: window.innerHeight,
        dpi: window.devicePixelRatio || 1
      };

      // Initialize velocity history
      for (let i = 0; i < velocityHistorySize; i++) {
        velocityHistory.current.push({ x: 0, y: 0 });
      }
    }
  }, []);

  // Initialize the canvas when component mounts
  useEffect(() => {
    // Exit early if we're not in browser or canvas isn't available
    if (typeof window === 'undefined' || !canvasRef.current) return;

    // Get the canvas context with improved rendering hints
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d", {
      alpha: false, // Optimization: No need for alpha channel
      desynchronized: true // Attempt to reduce latency if browser supports it
    });

    if (!context) return;
    contextRef.current = context;

    // Set canvas size to match the window with proper pixel ratio for HiDPI displays
    const handleResize = () => {
      const pixelRatio = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Update display info ref for immediate access
      displayInfoRef.current = {
        width,
        height,
        dpi: pixelRatio
      };

      canvas.width = width * pixelRatio;
      canvas.height = height * pixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      // Scale the context for HiDPI displays
      context.scale(pixelRatio, pixelRatio);

      draw(); // Redraw after resize
    };

    // Initialize with correct size
    handleResize();

    // Add resize listener
    window.addEventListener("resize", handleResize);

    // Start animation loop
    startAnimation();

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  // Animation loop at maximum speed
  const startAnimation = () => {
    const animate = () => {
      // Apply momentum
      if (!isDragging.current && (Math.abs(momentum.current.x) > 0.1 || Math.abs(momentum.current.y) > 0.1)) {
        // Only apply momentum if actively dragging recently
        if (isMoving.current) {
          targetOffset.current.x += momentum.current.x;
          targetOffset.current.y += momentum.current.y;

          // Apply damping
          momentum.current.x *= damping;
          momentum.current.y *= damping;

          // Apply cubic ease-out curve for more natural deceleration
          const progressFactor = Math.max(0, 1 - (Math.abs(momentum.current.x) + Math.abs(momentum.current.y)) / 20);
          const cubicEasing = 1 - Math.pow(progressFactor, 3);
          momentum.current.x *= (0.98 + cubicEasing * 0.02); // Heavy additional easing
          momentum.current.y *= (0.98 + cubicEasing * 0.02);
        } else {
          // If not actively moving, kill momentum very quickly
          momentum.current.x *= 0.8; // Very aggressive decay
          momentum.current.y *= 0.8;

          if (Math.abs(momentum.current.x) < 0.5 && Math.abs(momentum.current.y) < 0.5) {
            momentum.current.x = 0;
            momentum.current.y = 0;
          }
        }
      } else if (Math.abs(momentum.current.x) <= 0.2 && Math.abs(momentum.current.y) <= 0.2) {
        // Reset momentum when it gets small (higher threshold for quicker stop)
        momentum.current.x = 0;
        momentum.current.y = 0;
      }

      // Smooth camera movement
      const distance = Math.hypot(
        targetOffset.current.x - cameraOffset.current.x,
        targetOffset.current.y - cameraOffset.current.y
      );

      // Dynamic smoothing - faster for large movements, more precise for small ones
      const dynamicSmoothing = smoothingFactor * (1 + Math.min(1, distance / 500));

      cameraOffset.current.x += (targetOffset.current.x - cameraOffset.current.x) * dynamicSmoothing;
      cameraOffset.current.y += (targetOffset.current.y - cameraOffset.current.y) * dynamicSmoothing;

      // Draw the scene
      draw();

      // Continue animation loop
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    const { width, height } = displayInfoRef.current;

    // Clear the canvas with a dark background
    ctx.fillStyle = gridBackgroundColor;
    ctx.fillRect(0, 0, width, height);

    // Calculate grid offset based on camera position
    const offsetX = cameraOffset.current.x % gridSize;
    const offsetY = cameraOffset.current.y % gridSize;

    // Draw grid lines
    ctx.strokeStyle = gridLineColor;
    ctx.lineWidth = 1;
    ctx.beginPath();

    // Draw vertical lines
    for (let x = offsetX; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    for (let x = offsetX - gridSize; x >= 0; x -= gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }

    // Draw horizontal lines
    for (let y = offsetY; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    for (let y = offsetY - gridSize; y >= 0; y -= gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }

    ctx.stroke();
  };

  const updateVelocity = (deltaX: number, deltaY: number) => {
    // Add new velocity to history
    velocityHistory.current.push({ x: deltaX, y: deltaY });

    // Keep only the last N velocity measurements
    if (velocityHistory.current.length > velocityHistorySize) {
      velocityHistory.current.shift();
    }

    // Calculate weighted average velocity (more recent = higher weight)
    let totalX = 0;
    let totalY = 0;
    let totalWeight = 0;

    velocityHistory.current.forEach((velocity, index) => {
      const weight = (index + 1) / velocityHistorySize; // Linear weight increase
      totalX += velocity.x * weight;
      totalY += velocity.y * weight;
      totalWeight += weight;
    });

    // Set momentum based on weighted average
    momentum.current.x = totalX / totalWeight * momentumStrength;
    momentum.current.y = totalY / totalWeight * momentumStrength;
  };

  // Event handlers for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPosition.current = { x: e.clientX, y: e.clientY };
    lastMoveTime.current = performance.now();
    isMoving.current = true;

    // Reset momentum and velocity history
    momentum.current = { x: 0, y: 0 };
    velocityHistory.current = Array(velocityHistorySize).fill({ x: 0, y: 0 });

    // Prevent text selection during drag
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;

    // Calculate mouse movement
    const deltaX = e.clientX - lastPosition.current.x;
    const deltaY = e.clientY - lastPosition.current.y;

    // Only update if there's actual movement
    if (deltaX !== 0 || deltaY !== 0) {
      // Move the camera
      targetOffset.current.x += deltaX;
      targetOffset.current.y += deltaY;

      // Update velocity with smoother averaging
      updateVelocity(deltaX, deltaY);

      // Update last position
      lastPosition.current = { x: e.clientX, y: e.clientY };

      // Update last move time and active state
      lastMoveTime.current = performance.now();
      isMoving.current = true;
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;

    isDragging.current = false;

    // Check if still actively dragging
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

  // Mouse event handling for touch
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      isDragging.current = true;
      lastPosition.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      lastMoveTime.current = performance.now();
      isMoving.current = true;

      // Reset momentum and velocity history
      momentum.current = { x: 0, y: 0 };
      velocityHistory.current = Array(velocityHistorySize).fill({ x: 0, y: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    if (!isDragging.current || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - lastPosition.current.x;
    const deltaY = e.touches[0].clientY - lastPosition.current.y;

    // Only update if there's actual movement
    if (deltaX !== 0 || deltaY !== 0) {
      // Move the camera
      targetOffset.current.x += deltaX;
      targetOffset.current.y += deltaY;

      // Update velocity with smoother averaging
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

    const now = performance.now();
    if (now - lastMoveTime.current > moveThreshold) {
      isMoving.current = false;
      momentum.current = { x: 0, y: 0 };
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        touchAction: 'none',
        width: '100%',
        height: '100%'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    />
  );
}
