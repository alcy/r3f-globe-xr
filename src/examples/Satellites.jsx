import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useMemo, useCallback, useState, useRef, useEffect } from 'react'
import { patchThreeGlobeForXR } from './utils/patch-three-globe-for-xr'
import * as satellite from 'satellite.js'

// IMPORTANT: Apply XR patch BEFORE creating any Globe instances!
const xrPatch = patchThreeGlobeForXR()

const store = createXRStore({
  foveation: 0 // Disable FFR to eliminate rectangular artifact (may reduce performance)
})

const EARTH_RADIUS_KM = 6371
const TIME_STEP = 3 * 1000 // 3 seconds per frame

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
  const manualModeEnabled = useRef(false)

  const [satData, setSatData] = useState()
  const [time, setTime] = useState(new Date())

  // Load satellite data
  useEffect(() => {
    fetch('//cdn.jsdelivr.net/npm/globe.gl/example/datasets/space-track-leo.txt')
      .then(r => r.text())
      .then(rawData => {
        const tleData = rawData.replace(/\r/g, '')
          .split(/\n(?=[^12])/)
          .filter(d => d)
          .map(tle => tle.split('\n'))

        const satData = tleData
          .map(([name, ...tle]) => ({
            satrec: satellite.twoline2satrec(...tle),
            name: name.trim().replace(/^0 /, '')
          }))
          .filter(d => !!satellite.propagate(d.satrec, new Date())?.position)

        setSatData(satData)
      })
  }, [])

  // Drive XR animations AND update satellite time
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
    // Handled by our FrameTicker replacement
    xrPatch.tick(timeDeltaMs)

    // System 2: Globe's tweenGroup (polygon transitions, etc.)
    // Handled by our new tickManually method in globe-kapsule
    if (globeRef.current && globeRef.current.children[0]) {
      const globe = globeRef.current.children[0]
      globe.__kapsuleInstance?.tickManually(timeDeltaMs)
    }

    // System 3: Update satellite time every frame
    setTime(time => new Date(+time + TIME_STEP))
  })

  // Calculate satellite positions
  const particlesData = useMemo(() => {
    if (!satData) return []

    const gmst = satellite.gstime(time)
    // Return array of arrays - each particle set is a group
    return [
      satData
        .map(d => {
          const eci = satellite.propagate(d.satrec, time)
          if (eci?.position) {
            const gdPos = satellite.eciToGeodetic(eci.position, gmst)
            const lat = satellite.radiansToDegrees(gdPos.latitude)
            const lng = satellite.radiansToDegrees(gdPos.longitude)
            const alt = gdPos.height / EARTH_RADIUS_KM
            return { ...d, lat, lng, alt }
          }
          return null
        })
        .filter(d => d && !isNaN(d.lat) && !isNaN(d.lng) && !isNaN(d.alt))
    ]
  }, [satData, time])

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
        particlesData={particlesData}
        particleLabel="name"
        particleLat="lat"
        particleLng="lng"
        particleAltitude="alt"
        particlesColor={useCallback(() => '#00ff00', [])}
        particlesSize={0.02}
        particlesSizeAttenuation={false}
        particlesTransitionDuration={0}
      />
    </group>
  )
}

function SatellitesApp() {
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

export default SatellitesApp
