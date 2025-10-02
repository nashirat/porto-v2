# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Porto V2 is an interactive infinite canvas visualization built with React, TypeScript, and Vite. The application features a draggable infinite grid with advanced physics animations, optional visual distortion effects, and real-time performance monitoring.

## Development Commands

- **Start development server**: `npm run dev` (starts Vite dev server on http://localhost:5173)
- **Build for production**: `npm run build` (TypeScript compilation + Vite build)
- **Preview production build**: `npm run preview`

Note: According to .cursor/rules/devrun.mdc, avoid running `npm run dev` automatically - the user prefers to run development commands themselves.

## Tech Stack & Dependencies

- **Vite**: Build tool and development server with React plugin
- **React 18**: Uses hooks pattern exclusively (no class components)
- **TypeScript**: Strict typing throughout the codebase
- **Canvas API**: High-performance 2D rendering with HiDPI support

## Architecture

### Core Components

- **App.tsx**: Root component that provides full-screen container
- **InfiniteCanvas.tsx**: Main canvas component containing all visualization logic
- **main.tsx**: React application entry point with StrictMode

### Key Technical Features

1. **Performance Optimizations**:
   - HiDPI display support with proper pixel ratio scaling
   - `requestAnimationFrame` animation loop for 60fps
   - Canvas context optimization with `alpha: false` and `desynchronized: true`
   - Efficient event handling with ref-based state management

2. **Physics System**:
   - Momentum-based scrolling with velocity tracking
   - Weighted velocity averaging over 5 frame history
   - Dynamic damping and easing with cubic curves
   - Frame-rate independent animations

3. **State Management Pattern**:
   - Uses `useRef` for performance-critical state (no re-renders)
   - All animation state stored in refs: `cameraOffset`, `targetOffset`, `momentum`
   - Dragging state managed through `isDragging`, `isMoving` refs

### Canvas Rendering Architecture

The infinite grid is rendered using modulo mathematics:
- Grid size: 600px
- Grid offset calculated as `cameraOffset % gridSize`
- Draws lines in both directions to fill viewport
- Background color: `#000000`, grid lines: `rgba(255, 255, 255, 0.2)`

### Event Handling

- Supports both mouse and touch interactions
- Prevents default behaviors for smooth dragging
- Activity checking system to distinguish active vs. idle states
- Move threshold: 80ms to determine if user is actively dragging

## Development Guidelines

- The codebase uses inline styles with CSS-in-JS pattern
- All TypeScript interfaces are defined inline where used
- No external state management libraries - uses React hooks + refs
- Canvas operations are wrapped in safety checks for SSR compatibility
- Uses `@` alias for `/src` directory (configured in vite.config.ts)

## File Organization

```
src/
├── App.tsx              # Root component with full-screen layout
├── main.tsx             # React application entry point
├── index.css            # Global styles
└── components/
    └── InfiniteCanvas.tsx   # Main canvas component with physics
```

## Performance Considerations

- Canvas is sized with proper pixel ratio for crisp rendering on HiDPI displays
- Animation loop uses `requestAnimationFrame` for optimal performance
- Velocity calculations use weighted averaging to smooth momentum
- Context is pre-configured with performance hints
- Window resize handling updates display info ref for immediate access
