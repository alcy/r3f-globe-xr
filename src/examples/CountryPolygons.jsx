import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useState, useRef, useEffect } from 'react'
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
  const [countries, setCountries] = useState([])

  // Load country data
  useEffect(() => {
    fetch('/ne_110m_admin_0_countries.geojson')
      .then(res => res.json())
      .then(data => {
        // Filter out Antarctica
        const filteredCountries = data.features.filter(d => d.properties.ISO_A2 !== 'AQ')
        setCountries(filteredCountries)

        // After 4 seconds, animate polygons to random altitudes
        setTimeout(() => {
          if (globeRef.current && globeRef.current.children[0]) {
            const globe = globeRef.current.children[0]
            // Trigger polygon altitude animation
            globe.polygonAltitude(() => Math.random())
          }
        }, 4000)
      })
  }, [])

  // Enable manual mode on mount (for XR compatibility)
  useEffect(() => {
    // Enable manual mode for all FrameTicker instances
    // This stops automatic RAF and lets us drive animations via useFrame
    xrPatch.enableManualMode()
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
      scale={0.007}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
    >
      <R3fGlobe
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg"
        polygonsData={countries}
        polygonCapColor={() => 'rgba(200, 0, 0, 0.7)'}
        polygonSideColor={() => 'rgba(0, 200, 0, 0.1)'}
        polygonStrokeColor={() => '#111'}
      />
    </group>
  )
}

function CountryPolygonsApp() {
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

export default CountryPolygonsApp
