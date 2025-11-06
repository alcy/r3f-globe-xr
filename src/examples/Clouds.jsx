import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useRef, Suspense } from 'react'
import { TextureLoader } from 'three'
import { patchThreeGlobeForXR } from '../utils/patch-three-globe-for-xr'

// IMPORTANT: Apply XR patch BEFORE creating any Globe instances!
const xrPatch = patchThreeGlobeForXR()

const store = createXRStore({
  foveation: 0 // Disable FFR to eliminate rectangular artifact (may reduce performance)
})

const CLOUDS_ALT = 0.004
const CLOUDS_ROTATION_SPEED = -0.006 // deg/frame
// three-globe uses GLOBE_RADIUS = 100 internally
// But we're scaling the whole group by 0.01, so we need to match that
const GLOBE_RADIUS = 100

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

function CloudLayer() {
  const cloudsRef = useRef()

  // Load clouds texture from public folder
  const cloudsTexture = useLoader(TextureLoader, '/clouds.png')

  // Rotate clouds every frame
  useFrame(() => {
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += CLOUDS_ROTATION_SPEED * Math.PI / 180
    }
  })

  const radius = GLOBE_RADIUS * (1 + CLOUDS_ALT)

  return (
    <mesh ref={cloudsRef}>
      <sphereGeometry args={[radius, 75, 75]} />
      <meshPhongMaterial map={cloudsTexture} transparent={true} />
    </mesh>
  )
}

function GlobeViz() {
  const globeRef = useRef()
  const isDragging = useRef(false)
  const previousPointer = useRef(null)
  const manualModeEnabled = useRef(false)

  // Drive XR animations for any globe layers that need it
  useFrame((state, delta) => {
    const timeDeltaMs = delta * 1000

    // Enable manual mode once tickers exist
    if (!manualModeEnabled.current) {
      const tickers = xrPatch.getTickers()
      if (tickers.length > 0) {
        xrPatch.enableManualMode()
        manualModeEnabled.current = true
      }
    }

    // System 1: Layer tickers (arcs, paths, rings, particles)
    xrPatch.tick(timeDeltaMs)

    // System 2: Globe's tweenGroup (polygon transitions, etc.)
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
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
      />
      <Suspense fallback={null}>
        <CloudLayer />
      </Suspense>
    </group>
  )
}

function CloudsApp() {
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

export default CloudsApp
