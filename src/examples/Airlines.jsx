import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { XR, createXRStore, useXR } from '@react-three/xr'
import R3fGlobe from 'r3f-globe'
import { useState, useRef, useEffect, useCallback } from 'react'
import { patchThreeGlobeForXR } from '../utils/patch-three-globe-for-xr'
import { csvParseRows } from 'd3-dsv'
import indexBy from 'index-array-by'

// IMPORTANT: Apply XR patch BEFORE creating any Globe instances!
const xrPatch = patchThreeGlobeForXR()

const store = createXRStore({
  foveation: 1 // Enable for airlines example
})

const COUNTRY = 'United States'
const OPACITY = 0.22

const airportParse = ([airportId, name, city, country, iata, icao, lat, lng, alt, timezone, dst, tz, type, source]) =>
  ({ airportId, name, city, country, iata, icao, lat: +lat, lng: +lng, alt, timezone, dst, tz, type, source })

const routeParse = ([airline, airlineId, srcIata, srcAirportId, dstIata, dstAirportId, codeshare, stops, equipment]) =>
  ({ airline, airlineId, srcIata, srcAirportId, dstIata, dstAirportId, codeshare, stops, equipment })

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

  const [airports, setAirports] = useState([])
  const [routes, setRoutes] = useState([])

  // Load airport and route data
  useEffect(() => {
    Promise.all([
      fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat')
        .then(res => res.text())
        .then(d => csvParseRows(d, airportParse)),
      fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/routes.dat')
        .then(res => res.text())
        .then(d => csvParseRows(d, routeParse))
    ]).then(([airports, routes]) => {
      const byIata = indexBy(airports, 'iata', false)

      const filteredRoutes = routes
        .filter(d => byIata.hasOwnProperty(d.srcIata) && byIata.hasOwnProperty(d.dstIata)) // exclude unknown airports
        .filter(d => d.stops === '0') // non-stop flights only
        .map(d => Object.assign(d, {
          srcAirport: byIata[d.srcIata],
          dstAirport: byIata[d.dstIata]
        }))
        .filter(d => d.srcAirport.country === COUNTRY && d.dstAirport.country !== COUNTRY) // international routes from country

      setAirports(airports)
      setRoutes(filteredRoutes)
    })
  }, [])

  // Drive XR animations
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
        globeImageUrl="//cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg"

        arcsData={routes}
        arcLabel={useCallback(d => `${d.airline}: ${d.srcIata} → ${d.dstIata}`, [])}
        arcStartLat={useCallback(d => d.srcAirport.lat, [])}
        arcStartLng={useCallback(d => d.srcAirport.lng, [])}
        arcEndLat={useCallback(d => d.dstAirport.lat, [])}
        arcEndLng={useCallback(d => d.dstAirport.lng, [])}
        arcDashLength={0.25}
        arcDashGap={1}
        arcDashInitialGap={useCallback(() => Math.random(), [])}
        arcDashAnimateTime={4000}
        arcColor={useCallback(() => [`rgba(0, 255, 0, ${OPACITY})`, `rgba(255, 0, 0, ${OPACITY})`], [])}
        arcsTransitionDuration={0}

        pointsData={airports}
        pointColor={useCallback(() => 'orange', [])}
        pointAltitude={0}
        pointRadius={0.02}
        pointsMerge={true}
      />
    </group>
  )
}

function AirlinesApp() {
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

export default AirlinesApp
