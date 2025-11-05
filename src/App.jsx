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

  // Generate random arcs data
  const N = 20
  const arcsData = useMemo(() => [...Array(N).keys()].map(() => ({
    startLat: (Math.random() - 0.5) * 180,
    startLng: (Math.random() - 0.5) * 360,
    endLat: (Math.random() - 0.5) * 180,
    endLng: (Math.random() - 0.5) * 360,
    color: ['red', 'white', 'blue', 'green'][Math.round(Math.random() * 3)]
  })), [])

  // Debug: Look into Child 2 which has 20 children (= our 20 arcs!)
  useEffect(() => {
    if (globeRef.current && globeRef.current.children[0]) {
      const globe = globeRef.current.children[0]
      const arcsLayerGroup = globe.children[2] // Child 2 had 20 children

      console.log('Arcs Layer Group (Child 2):', arcsLayerGroup)
      console.log('Arcs Layer Group children:', arcsLayerGroup?.children?.length)

      if (arcsLayerGroup && arcsLayerGroup.children.length > 0) {
        const firstArc = arcsLayerGroup.children[0]
        console.log('First arc:', firstArc)
        console.log('First arc type:', firstArc.type)
        console.log('First arc __globeObjType:', firstArc.__globeObjType)
        console.log('First arc children:', firstArc.children)

        if (firstArc.children.length > 0) {
          const arcMesh = firstArc.children[0]
          console.log('Arc mesh:', arcMesh)
          console.log('Arc mesh material:', arcMesh.material)
          console.log('Arc mesh __dashAnimateStep:', arcMesh.__dashAnimateStep)
        }
      }

      // Try to find ticker by searching the kapsule
      const kapsule = globe.__kapsuleInstance
      console.log('Trying to access kapsule internal state...')
      console.log('kapsule._state:', kapsule._state)
      // Access hidden properties
      for (let key in kapsule) {
        if (key.includes('arcs') || key.includes('ticker') || key.includes('state')) {
          console.log(`Found key: ${key}`, kapsule[key])
        }
      }
    }
  }, [arcsData])

  // Manually update arc animations in useFrame (works in VR!)
  useFrame((state, delta) => {
    if (globeRef.current && globeRef.current.children[0]) {
      const globe = globeRef.current.children[0]
      const arcsLayerGroup = globe.children[2] // The group with arcs

      if (arcsLayerGroup && arcsLayerGroup.children) {
        // Update each arc's dash animation
        // delta is in seconds, convert to milliseconds for the step calculation
        const timeDeltaMs = delta * 1000

        arcsLayerGroup.children.forEach(arcGroup => {
          if (arcGroup.children && arcGroup.children.length > 0) {
            const arcMesh = arcGroup.children[0]

            if (arcMesh.material && arcMesh.material.uniforms && arcMesh.__dashAnimateStep) {
              // __dashAnimateStep is "per second", so multiply by delta (in seconds)
              const step = arcMesh.__dashAnimateStep * delta
              const curTranslate = arcMesh.material.uniforms.dashTranslate?.value || 0
              arcMesh.material.uniforms.dashTranslate.value = (curTranslate + step) % 1e9
            }
          }
        })
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
