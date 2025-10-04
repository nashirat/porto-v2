// Grid Configuration
// All magic numbers and tunable parameters for the infinite grid

export const GRID_CONFIG = {
  // Grid Layout - Desktop
  desktop: {
    cardHeightDivisor: 2.750, // viewportHeight / this = cardHeight
    gapRatio: 0.295, // gap = cardHeight × this
    aspectRatio: 476 / 593, // width/height ratio for cards
  },

  // Grid Layout - Mobile
  mobile: {
    cardHeightDivisor: 4.0, // viewportHeight / this = cardHeight
    gapRatio: 0.25, // gap = cardHeight × this
    breakpoint: 768, // px - mobile viewport width threshold
  },

  // Grid Pattern
  pattern: {
    zigzagOffsetRatio: 0.5, // Vertical offset for alternating columns (× itemSpacingY)
  },

  // Viewport & Rendering
  rendering: {
    visibleBuffer: 500, // px - how far outside viewport to render items
    initialBuffer: 1500, // px - initial preload buffer to prevent pop-ins
    updateThrottleDistance: 200, // px - min camera distance to trigger update
    updateThrottleTime: 100, // ms - min time between visible item updates
  },

  // Physics & Animation
  physics: {
    damping: 0.92, // Momentum decay rate (higher = slower stop)
    momentumStrength: 0.10, // How much velocity affects momentum
    smoothingFactor: 0.02, // Camera smoothing base factor
    stopThreshold: 0.2, // Momentum magnitude for hard stop
    snapDistance: 2, // px - distance to snap camera to target
    snapMinDistance: 0.1, // px - minimum distance before considering stopped
  },

  // Velocity Tracking
  velocity: {
    // Weighted average: oldest=16.67%, middle=33.33%, newest=50%
    weight0: 0.5, // Most recent velocity weight
    weight1: 0.3333, // Previous velocity weight
    weight2: 0.1667, // Oldest velocity weight
  },

  // Interaction
  interaction: {
    moveThreshold: 60, // ms - time to determine if actively dragging
    activityCheckInterval: 50, // ms - how often to check drag activity
    touchMultiplier: 1.8, // Touch drag speed multiplier for better UX
  },

  // Loading
  loading: {
    useSimulated: false, // Use simulated loading (for testing)
    simulatedIncrement: 5, // % - progress increment for simulated loading
    simulatedInterval: 100, // ms - interval between progress updates
    fadeOutDelay: 200, // ms - delay before hiding loader after 100%
    backgroundLoadStagger: 100, // ms - delay between background image loads
  },

  // UI Elements
  ui: {
    about: {
      top: 32, // px
      right: 64, // px
      fontSize: 24, // px
      fontWeight: 600,
      color: '#ffffff',
    },
    backgroundColor: '#f9f9f9',
  },
} as const;
