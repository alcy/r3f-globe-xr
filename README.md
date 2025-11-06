# r3f-globe-xr

**EXPERIMENTAL** XR/VR support for [r3f-globe](https://github.com/vasturiano/r3f-globe) with [React Three Fiber XR](https://github.com/pmndrs/xr). Tested with **Meta Quest 3S**.

## What This Does

This project enables [three-globe](https://github.com/vasturiano/three-globe) to work  in WebXR (VR/AR) environments by monkey patching two animation systems that normally rely on `requestAnimationFrame`:

### 1. FrameTicker System (Layer Animations)
**Problem**: three-globe layers (arcs, paths, rings, particles) use `frame-ticker` which calls its own RAF loop, incompatible with XR.

**Solution**: Replace `frame-ticker` with our XR-compatible version that:
- Exposes a manual `tick(deltaMs)` method
- Gets driven by React Three Fiber's `useFrame` hook
- Works in both desktop and XR modes

**Implementation**: See `vite.config.js` alias:
```javascript
'frame-ticker': path.resolve(__dirname, './src/utils/frame-ticker-xr-replacement.js')
```

### 2. TweenGroup System (Globe Transitions)
**Problem**: three-globe uses `@tweenjs/tween.js` for smooth property transitions (e.g., polygon altitude changes). The TweenGroup starts its own RAF loop.

**Solution**: Patch `globe-kapsule.js` to add `tickManually(deltaMs)` method that manually updates the TweenGroup without starting RAF.

**Implementation**: See `three-globe-master/src/globe-kapsule.js` - added manual ticker control.

### Combined Approach
Both systems are driven by a single `useFrame` hook in the React components:
```javascript
useFrame((state, delta) => {
  const timeDeltaMs = delta * 1000
  xrPatch.tick(timeDeltaMs)                          // System 1: Layer animations
  globe.__kapsuleInstance?.tickManually(timeDeltaMs) // System 2: TweenGroup
})
```

## Setup & Installation

```bash
# Install dependencies
npm install

# Run development server (requires HTTPS for WebXR)
npm run dev
```

The app will start at `https://x.x.x.x:5173` (HTTPS required for WebXR). You can then access this URL on your headset's browser. 

## Usage

### Testing Examples
Switch between examples by modifying `src/main.jsx`:

```javascript
import ArcsApp from './examples/Arcs.jsx'
import AirlinesApp from './examples/Airlines.jsx'
import CountryPolygonsApp from './examples/CountryPolygons.jsx'
import PathsApp from './examples/Paths.jsx'
import RipplesApp from './examples/Ripples.jsx'
import SatellitesApp from './examples/Satellites.jsx'

// Change the component being rendered:
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SatellitesApp />  {/* Try different examples here */}
  </StrictMode>,
)
```

### Available Examples
- **Arcs**: Animated arcs between random points
- **Airlines**: US international flight routes
- **Satellites**: Real-time LEO satellite tracking
- **CountryPolygons**: Country borders with hover effects
- **Paths**: Animated paths across the globe
- **Ripples**: Ripple effects on globe surface

### VR/AR Controls
- VR controllers or hand tracking to grab and rotate globe
- Enter VR/AR via buttons at bottom of screen
  
### Desktop Controls
**Note**: The globe is scaled for VR viewing, making it very small/almost invisible in desktop mode. For the best experience, click **Enter VR** or **Enter AR** buttons at the bottom of the screen to enter immersive mode.


## Technical Details

### Vite Configuration
The project uses Vite aliases to redirect imports to our patched versions:

```javascript
resolve: {
  alias: {
    'frame-ticker': './src/utils/frame-ticker-xr-replacement.js',
    'three-globe': './three-globe-master/dist/three-globe.mjs'
  },
  dedupe: ['three']  // Prevent multiple Three.js instances
}
```

### Key Files
- `src/utils/patch-three-globe-for-xr.js` - Main XR patch coordinator
- `src/utils/frame-ticker-xr-replacement.js` - FrameTicker replacement
- `three-globe-master/src/globe-kapsule.js` - Patched with `tickManually()`
- `src/examples/` - All working examples

