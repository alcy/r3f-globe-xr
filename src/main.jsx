import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import AirlinesApp from './airlines.jsx'
import CountryPolygonsApp from './country-polygons.jsx'
import PathsApp from './paths.jsx'
import RipplesApp from './ripples.jsx'
import SatellitesApp from './satellites.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
