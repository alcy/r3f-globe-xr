import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useMemo, useRef, useEffect } from 'react'

const store = createXRStore({
  // foveation: 0 // Optional: can improve quality but reduces performance
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
  const lastFrameTime = useRef(performance.now())
  const { isPresenting } = useXR()

  // Generate random arcs data
  const N = 20
  const arcsData = useMemo(() => [...Array(N).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 180,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 180,
    endLng: (Math.random() - 0.5) * 360,
    color: ['red', 'white', 'blue', 'green'][Math.round(Math.random() * 3)]
  })), [])

  // XR Mode: Pause RAF when entering XR, resume when exiting
  useEffect(() => {
    if (globeRef.current && globeRef.current.children[0]) {
      const globe = globeRef.current.children[0]
      const arcsLayer = globe.__kapsuleInstance?._state?.arcsLayer

      if (arcsLayer) {
        if (isPresenting) {
          // Entering XR: pause automatic RAF ticker
          arcsLayer.pauseAnimation()
          console.log('[XR Mode] Entered XR - arc animations paused, now driven by useFrame')
        } else {
          // Exiting XR: resume automatic RAF ticker
          arcsLayer.resumeAnimation()
          console.log('[Desktop Mode] Exited XR - arc animations resumed to RAF')
        }
      }
    }
  }, [isPresenting])

  // Manually drive arc animations via useFrame (only when in XR!)
  useFrame((state, delta) => {
    if (isPresenting && globeRef.current && globeRef.current.children[0]) {
      const globe = globeRef.current.children[0]
      const arcsLayer = globe.__kapsuleInstance?._state?.arcsLayer

      if (arcsLayer) {
        // Manually tick the animation system
        // delta is in seconds, convert to milliseconds
        const timeDeltaMs = delta * 1000
        arcsLayer.tickManually(timeDeltaMs)
      }
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
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png"
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashInitialGap={() => Math.random() * 5}
        arcDashAnimateTime={1000}
        arcStroke={0.5}
        arcsTransitionDuration={0}
      />
    </group>
  )
}

function App() {
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

export default App
