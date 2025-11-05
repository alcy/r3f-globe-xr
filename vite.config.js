import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {'host': true},
  resolve: {
    alias: {
      // Replace frame-ticker with our XR-compatible version
      // This makes ALL three-globe layers (arcs, paths, rings, particles) work in XR
      'frame-ticker': path.resolve(__dirname, './src/utils/frame-ticker-xr-replacement.js'),

      // Use our locally patched three-globe with XR support (adds tickManually for tweenGroup)
      'three-globe': path.resolve(__dirname, './three-globe-master/dist/three-globe.mjs')
    }
  }
})
