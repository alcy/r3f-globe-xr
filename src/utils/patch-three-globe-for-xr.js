/**
 * Patch three-globe for WebXR Compatibility
 *
 * Makes three-globe work in WebXR contexts by intercepting FrameTicker
 * and allowing manual animation updates via R3F's useFrame.
 *
 * Usage:
 *   // At the top of your App.jsx, BEFORE creating any Globe instances
 *   import { patchThreeGlobeForXR } from './utils/patch-three-globe-for-xr'
 *   const xrPatch = patchThreeGlobeForXR()
 *
 *   // In your component, enable manual mode and drive animations
 *   useEffect(() => {
 *     xrPatch.enableManualMode()
 *   }, [])
 *
 *   useFrame((state, delta) => {
 *     xrPatch.tick(delta * 1000)
 *   })
 *
 * How it works:
 *   1. Patches FrameTicker globally before three-globe loads
 *   2. When three-globe creates tickers for layers (arcs, paths, etc.),
 *      it gets our XR-aware proxy instead
 *   3. You control when animations update via tick()
 *
 * Benefits:
 *   - ALL three-globe layers work automatically (arcs, paths, rings, particles)
 *   - No need to manually update each layer
 *   - No direct manipulation of three-globe internals
 *   - Future three-globe layers automatically work
 */

import {
  getAllXRTickers,
  enableManualModeForAll,
  disableManualModeForAll,
  tickAllManually
} from './frame-ticker-xr-replacement'

/**
 * Get the XR patch API
 *
 * Since we're using Vite alias to replace frame-ticker globally,
 * there's no need for runtime patching. Just return the API.
 *
 * @returns {Object} API for controlling XR animations
 */
export function patchThreeGlobeForXR() {
  console.log('[XR Patch] three-globe will use XR-compatible FrameTicker')
  console.log('[XR Patch] All animation layers (arcs, paths, rings, particles) will work in VR/AR')

  return getXRPatchAPI()
}

/**
 * Get the XR patch API
 * @returns {Object} API for controlling animations
 */
function getXRPatchAPI() {
  return {
    /**
     * Enable manual mode - stops automatic RAF, you control updates via tick()
     * Call this when entering XR or at app start if always in XR
     */
    enableManualMode: () => {
      console.log('[XR Patch] Enabling manual animation mode')
      enableManualModeForAll()
    },

    /**
     * Disable manual mode - resumes automatic RAF
     * Call this when exiting XR (if you want desktop to use automatic)
     */
    disableManualMode: () => {
      console.log('[XR Patch] Disabling manual animation mode')
      disableManualModeForAll()
    },

    /**
     * Manually tick all animations
     * Call this from useFrame in your render loop
     *
     * @param {number} timeDeltaMs - Time since last frame in milliseconds
     *
     * Example:
     *   useFrame((state, delta) => {
     *     xrPatch.tick(delta * 1000)
     *   })
     */
    tick: (timeDeltaMs) => {
      tickAllManually(timeDeltaMs)
    },

    /**
     * Get all active ticker instances (for debugging)
     */
    getTickers: () => {
      return getAllXRTickers()
    }
  }
}

/**
 * Convenience hook-like API for React components
 * (Not an actual React hook, just a convenient pattern)
 */
export function useThreeGlobeXR() {
  return getXRPatchAPI()
}
