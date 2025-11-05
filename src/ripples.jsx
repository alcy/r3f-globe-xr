import { useRef, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { XR, createXRStore } from '@react-three/xr';
import Globe from './Globe';

const store = createXRStore();

// Generate random ripples data
const N = 10;
const ripplesData = [...Array(N).keys()].map(() => ({
  lat: (Math.random() - 0.5) * 180,
  lng: (Math.random() - 0.5) * 360,
  maxR: Math.random() * 20 + 3,
  propagationSpeed: (Math.random() - 0.5) * 20 + 1,
  repeatPeriod: Math.random() * 2000 + 200
}));

const colorInterpolator = t => `rgba(255,100,50,${1-t})`;

function Scene() {
  const globeRef = useRef();

  const globeProps = useMemo(() => ({
    globeImageUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-dark.jpg',
    bumpImageUrl: '//cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png',
    ringsData: ripplesData,
    ringColor: () => colorInterpolator,
    ringMaxRadius: 'maxR',
    ringPropagationSpeed: 'propagationSpeed',
    ringRepeatPeriod: 'repeatPeriod'
  }), []);

  return (
    <>
      <ambientLight intensity={Math.PI} color="#cccccc" />
      <directionalLight intensity={0.6 * Math.PI} color="#ffffff" />
      <Globe ref={globeRef} {...globeProps} />
    </>
  );
}

export default function RipplesApp() {
  return (
    <>
      <button
        onClick={() => store.enterVR()}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          padding: '10px 20px',
          fontSize: '16px',
          cursor: 'pointer'
        }}
      >
        Enter VR
      </button>
      <Canvas
        camera={{ position: [0, 0, 500], fov: 75 }}
        gl={{ antialias: true, pixelRatio: Math.min(2, window.devicePixelRatio) }}
      >
        <XR store={store}>
          <Scene />
        </XR>
      </Canvas>
    </>
  );
}
