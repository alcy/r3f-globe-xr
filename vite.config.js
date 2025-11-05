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
      // Use our locally patched three-globe with XR support
      'three-globe': path.resolve(__dirname, './three-globe-master/dist/three-globe.mjs')
    }
  }
})
