# Porto V2 - Infinite Canvas

An interactive infinite canvas visualization built with **Vite**, **React**, and **TypeScript**.

## Features

- **Infinite Grid Canvas**: Draggable infinite grid with smooth panning
- **Advanced Physics & Animation**:
  - Momentum-based scrolling with realistic physics
  - Velocity tracking and weighted averaging
  - Frame-rate independent animation
  - Damping and easing effects
- **Visual Distortion Effects**:
  - Optional fish-eye/spherical distortion (toggle with 'D' key)
  - Adjustable distortion strength ('+' and '-' keys)
  - Curved grid lines for 3D spherical appearance
- **Performance Monitoring**: Real-time FPS counter
- **Responsive Design**: Full-screen canvas with touch support
- **Modern Tech Stack**: Vite + React + TypeScript + CSS-in-JS

## Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd porto-v2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Controls

- **Mouse/Touch**: Drag to pan around the infinite canvas
- **D Key**: Toggle distortion effect on/off
- **+ Key**: Increase distortion strength
- **- Key**: Decrease distortion strength

## Project Structure

```
porto-v2/
├── src/
│   ├── components/
│   │   ├── InfiniteCanvas.tsx    # Main canvas component
│   │   └── FpsCounter.tsx        # Performance monitor
│   ├── App.tsx                   # Root component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
├── public/
│   └── favicon.ico               # App icon
├── index.html                    # HTML template
├── vite.config.ts               # Vite configuration
└── package.json                 # Dependencies and scripts
```

## Technical Details

- **Vite**: Fast build tool and dev server
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **CSS-in-JS**: Component-scoped styling
- **Canvas API**: High-performance 2D rendering
- **RequestAnimationFrame**: Smooth 60fps animations

## Performance Features

- HiDPI display support with proper pixel ratio scaling
- Optimized canvas rendering with minimal redraws
- Efficient event handling for smooth interactions
- Memory-conscious animation loops
- Real-time FPS monitoring

This project demonstrates advanced frontend development techniques including canvas graphics programming, complex animation systems, performance optimization, and modern React patterns.
