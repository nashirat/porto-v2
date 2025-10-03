/**
 * Application Configuration Constants
 *
 * ⚙️ Easy toggles for testing vs production behavior
 */

// ══════════════════════════════════════════════════════════════
// LOADING BEHAVIOR
// ══════════════════════════════════════════════════════════════

/**
 * Loading Mode Toggle
 *
 * - `true`:  Fast simulated loading (2 seconds) - Use for development/testing
 * - `false`: Real image preloading with progress - Use for production
 *
 * @default false (production mode)
 */
export const USE_SIMULATED_LOADING = false;
