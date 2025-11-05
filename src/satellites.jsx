import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useState, useRef, useEffect } from 'react'
import { patchThreeGlobeForXR } from './utils/patch-three-globe-for-xr'
import * as satellite from 'satellite.js'
import { TextureLoader, SRGBColorSpace } from 'three'

// Initialize XR patch - this will make frame-ticker replacement available
const xrPatch = patchThreeGlobeForXR()

const store = createXRStore({
  foveation: 0 // Disable FFR to eliminate rectangular artifact (may reduce performance)
})

const EARTH_RADIUS_KM = 6371 // km
const TIME_STEP = 1.5 * 1000 // per frame

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
  const [satData, setSatData] = useState([])
  const [particlesData, setParticlesData] = useState([])
  const [satTexture, setSatTexture] = useState(null)
  const timeRef = useRef(new Date())

  // Load satellite data and texture
  useEffect(() => {
    // Load satellite icon texture
    const loader = new TextureLoader()
    loader.load('/sat-icon.png', texture => {
      texture.colorSpace = SRGBColorSpace
      setSatTexture(texture)
    })

    // Load TLE data
    fetch('/space-track-leo.txt')
      .then(r => r.text())
      .then(rawData => {
        const tleData = rawData.replace(/\r/g, '').split(/\n(?=[^12])/).map(tle => tle.split('\n'))
        const satellites = tleData.map(([name, ...tle]) => ({
          satrec: satellite.twoline2satrec(...tle),
          name: name.trim().replace(/^0 /, '')
        }))
        // exclude those that can't be propagated
        .filter(d => !!satellite.propagate(d.satrec, new Date())?.position)

        setSatData(satellites)
      })
  }, [])

  // Enable manual mode on mount (for XR compatibility)
  useEffect(() => {
    // Enable manual mode for all FrameTicker instances
    // This stops automatic RAF and lets us drive animations via useFrame
    xrPatch.enableManualMode()
    console.log('[XR] Manual animation mode enabled')
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

    // System 3: Update satellite positions
    if (satData.length > 0) {
      // Advance time
      timeRef.current = new Date(+timeRef.current + TIME_STEP)
      const time = timeRef.current

      // Calculate new positions
      const gmst = satellite.gstime(time)
      const updatedSats = satData.map(d => {
        const eci = satellite.propagate(d.satrec, time)
        if (eci?.position) {
          const gdPos = satellite.eciToGeodetic(eci.position, gmst)
          return {
            ...d,
            lat: satellite.radiansToDegrees(gdPos.latitude),
            lng: satellite.radiansToDegrees(gdPos.longitude),
            alt: gdPos.height / EARTH_RADIUS_KM
          }
        }
        return { ...d, lat: NaN, lng: NaN, alt: NaN }
      })

      // Filter out invalid positions and update
      const validSats = updatedSats.filter(d => !isNaN(d.lat) && !isNaN(d.lng) && !isNaN(d.alt))
      setParticlesData(validSats)
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
        particlesData={particlesData}
        particleLat="lat"
        particleLng="lng"
        particleAltitude="alt"
        particlesSize={2}
        particlesTexture={satTexture}
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
