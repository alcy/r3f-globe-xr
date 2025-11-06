import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useMemo, useRef, useEffect } from 'react'
import { patchThreeGlobeForXR } from '../utils/patch-three-globe-for-xr'

// Initialize XR patch - this will make frame-ticker replacement available
const xrPatch = patchThreeGlobeForXR()

const store = createXRStore({
  foveation: 0 // Disable FFR to eliminate rectangular artifact (may reduce performance)
})

function Controls() {
  const { isPresenting } = useXR()
  return !isPresenting ? (
    <OrbitControls
      minDistance={101}
      maxDistance={1e4}
      dampingFactor={0.1}
      zoomSpeed={0.3}
      rotateSpeed={0.3}
    />
  ) : null
}

function GlobeViz() {
  const globeRef = useRef()
  const isDragging = useRef(false)
  const previousPointer = useRef(null)
  const { isPresenting } = useXR()

  // Generate random paths data
  const N_PATHS = 10
  const MAX_POINTS_PER_LINE = 10000
  const MAX_STEP_DEG = 1
  const MAX_STEP_ALT = 0.015

  const pathsData = useMemo(() => {
    return [...Array(N_PATHS).keys()].map(() => {
      let lat = (Math.random() - 0.5) * 90
      let lng = (Math.random() - 0.5) * 360
      let alt = 0

      return [[lat, lng, alt], ...[...Array(Math.round(Math.random() * MAX_POINTS_PER_LINE)).keys()].map(() => {
        lat += (Math.random() * 2 - 1) * MAX_STEP_DEG
        lng += (Math.random() * 2 - 1) * MAX_STEP_DEG
        alt += (Math.random() * 2 - 1) * MAX_STEP_ALT
        alt = Math.max(0, alt)

        return [lat, lng, alt]
      })]
    })
  }, [])

  // Enable manual mode on mount (for XR compatibility)
  useEffect(() => {
    // Enable manual mode for all FrameTicker instances
    // This stops automatic RAF and lets us drive animations via useFrame
    xrPatch.enableManualMode()

    // After 6 seconds, animate paths to use altitude values
    setTimeout(() => {
      if (globeRef.current && globeRef.current.children[0]) {
        const globe = globeRef.current.children[0]
        // Set altitude accessor and trigger transition
        globe.pathPointAlt(pnt => pnt[2])
        globe.pathTransitionDuration(4000)
      }
    }, 6000)
  }, [])

  // Drive BOTH animation systems manually via useFrame
  // This works in both desktop and XR modes
  useFrame((state, delta) => {
    const timeDeltaMs = delta * 1000

    // System 1: Layer tickers (arcs, paths, rings, particles)
    // Handled by our FrameTicker replacement
    xrPatch.tick(timeDeltaMs)

    // System 2: Globe's tweenGroup (polygon transitions, etc.)
    // Handled by our new tickManually method in globe-kapsule
    if (globeRef.current && globeRef.current.children[0]) {
      const globe = globeRef.current.children[0]
      globe.__kapsuleInstance?.tickManually(timeDeltaMs)
    }
  })

  const handlePointerDown = (e) => {
    e.stopPropagation()
    isDragging.current = true
    previousPointer.current = e.point.clone()
  }

  const handlePointerUp = () => {
    isDragging.current = false
    previousPointer.current = null
  }

  const handlePointerMove = (e) => {
    if (isDragging.current && previousPointer.current && globeRef.current) {
      const current = e.point
      const delta = current.clone().sub(previousPointer.current)

      globeRef.current.rotation.y += delta.x * 5
      globeRef.current.rotation.x += delta.y * 5

      previousPointer.current = current.clone()
    }
  }

  return (
    <group
      ref={globeRef}
      position={[0, 1.5, -2.5]}
      scale={0.01}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <R3fGlobe
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
        pathsData={pathsData}
        pathColor={() => ['rgba(0,0,255,0.8)', 'rgba(255,0,0,0.8)']}
        pathDashLength={0.01}
        pathDashGap={0.004}
        pathDashAnimateTime={100000}
        animateIn={false}
      />
    </group>
  )
}

function PathsApp() {
  return (
    <>
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '10px',
        zIndex: 1000
      }}>
        <button
          onClick={() => store.enterVR()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#1a73e8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Enter VR
        </button>
        <button
          onClick={() => store.enterAR()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            backgroundColor: '#34a853',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Enter AR
        </button>
      </div>

      <div style={{ width: '100vw', height: '100vh' }}>
        <Canvas
          camera={{ fov: 50, position: [0, 0, 0] }}
          frameloop="always"
        >
          <XR store={store}>
            <Controls />
            <color attach="background" args={['#000000']} />
            <ambientLight intensity={Math.PI} />
            <directionalLight intensity={0.6 * Math.PI} />
            <GlobeViz />
          </XR>
        </Canvas>
      </div>
    </>
  )
}

export default PathsApp
