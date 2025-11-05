/**
 * XR-Compatible FrameTicker Replacement
 *
 * Drop-in replacement for the 'frame-ticker' npm package that works in WebXR.
 *
 * This module exports a FrameTicker class that can be controlled manually
 * instead of relying on window.requestAnimationFrame (which doesn't fire in XR).
 */

export class FrameTickerXR {
  constructor(maxFPS, minFPS, startOnInit = true) {
    this._maxFPS = maxFPS
    this._minFPS = minFPS
    this._isRunning = startOnInit
    this._manualMode = false
    this._callbacks = []
    this._currentTime = 0
    this._currentTick = 0
    this._rafId = null

    console.log('[FrameTickerXR] Created new ticker instance')

    // Register globally so we can control all tickers
    if (!window.__xrTickers) {
      window.__xrTickers = new Set()
    }
    window.__xrTickers.add(this)

    // Start automatic RAF loop if requested (and not in manual mode)
    if (startOnInit && !this._manualMode) {
      this._startRAF()
    }
  }

  /**
   * Start automatic RAF loop
   */
  _startRAF() {
    if (this._rafId) return // Already running

    const tick = (timestamp) => {
      if (!this._isRunning || this._manualMode) return

      const delta = this._lastTimestamp ? timestamp - this._lastTimestamp : 16
      this._lastTimestamp = timestamp

      this._currentTime += delta
      this._currentTick++

      const timeSeconds = this._currentTime / 1000
      const deltaSeconds = delta / 1000

      // Fire all registered callbacks
      this._callbacks.forEach(callback => {
        callback(timeSeconds, deltaSeconds, this._currentTick)
      })

      this._rafId = requestAnimationFrame(tick)
    }

    this._rafId = requestAnimationFrame(tick)
  }

  /**
   * Stop automatic RAF loop
   */
  _stopRAF() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
  }

  /**
   * Enable manual mode - stops automatic RAF, allows manual ticks
   */
  enableManualMode() {
    console.log('[FrameTickerXR] Enabling manual mode')
    console.log('[FrameTickerXR] Time before:', this._currentTime)

    // If time is very low (< 2 seconds), boost it
    // This ensures rings have enough time to initialize
    if (this._currentTime < 2000) {
      console.log('[FrameTickerXR] Time too low, boosting to 2000ms')
      this._currentTime = 2000
    }

    console.log('[FrameTickerXR] Time after:', this._currentTime)
    this._manualMode = true
    this._stopRAF()
  }

  /**
   * Disable manual mode - resumes automatic RAF
   */
  disableManualMode() {
    console.log('[FrameTickerXR] Disabling manual mode')
    this._manualMode = false
    if (this._isRunning) {
      this._startRAF()
    }
  }

  /**
   * Manually tick the animation
   * Call this from useFrame in XR contexts
   */
  tick(timeDeltaMs) {
    // ALWAYS allow manual ticks, even if not in manual mode
    // This allows us to drive animations in XR while RAF handles desktop
    if (!this._isRunning) return

    // Only update time if in manual mode (otherwise RAF updates it)
    if (this._manualMode) {
      this._currentTime += timeDeltaMs
      this._currentTick++
    }

    const timeSeconds = this._currentTime / 1000
    const deltaSeconds = timeDeltaMs / 1000

    // Fire all registered callbacks
    this._callbacks.forEach(callback => {
      callback(timeSeconds, deltaSeconds, this._currentTick)
    })
  }

  /**
   * Public API - matches FrameTicker interface
   */
  get onTick() {
    return {
      add: (callback) => {
        this._callbacks.push(callback)
      },
      remove: (callback) => {
        const index = this._callbacks.indexOf(callback)
        if (index > -1) {
          this._callbacks.splice(index, 1)
        }
      }
    }
  }

  get onPause() {
    // Not implemented in original, just provide stub
    return { add: () => {}, remove: () => {} }
  }

  get onResume() {
    // Not implemented in original, just provide stub
    return { add: () => {}, remove: () => {} }
  }

  get isRunning() {
    return this._isRunning
  }

  get currentTick() {
    return this._currentTick
  }

  pause() {
    this._isRunning = false
    this._stopRAF()
  }

  resume() {
    this._isRunning = true
    if (!this._manualMode) {
      this._startRAF()
    }
  }

  dispose() {
    this._callbacks = []
    this._stopRAF()

    // Remove from global registry
    if (window.__xrTickers) {
      window.__xrTickers.delete(this)
    }
  }
}

// Default export to match frame-ticker package
export default FrameTickerXR

// Global helpers for controlling all tickers
export function getAllXRTickers() {
  return Array.from(window.__xrTickers || [])
}

export function enableManualModeForAll() {
  const tickers = getAllXRTickers()
  console.log('[FrameTickerXR] Enabling manual mode for', tickers.length, 'tickers')
  tickers.forEach(ticker => ticker.enableManualMode())
}

export function disableManualModeForAll() {
  const tickers = getAllXRTickers()
  console.log('[FrameTickerXR] Disabling manual mode for', tickers.length, 'tickers')
  tickers.forEach(ticker => ticker.disableManualMode())
}

export function tickAllManually(timeDeltaMs) {
  const tickers = getAllXRTickers()
  tickers.forEach(ticker => ticker.tick(timeDeltaMs))
}
