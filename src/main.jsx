import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ArcsApp from './examples/Arcs.jsx'
import AirlinesApp from './examples/Airlines.jsx'
import CloudsApp from './examples/Clouds.jsx'
import CountryPolygonsApp from './examples/CountryPolygons.jsx'
import PathsApp from './examples/Paths.jsx'
import RipplesApp from './examples/Ripples.jsx'
import SatellitesApp from './examples/Satellites.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ArcsApp />
  </StrictMode>,
)
