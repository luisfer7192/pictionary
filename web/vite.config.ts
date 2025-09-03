import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // lets vite proxy socket.io ws in dev if you prefer using relative URLs
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true }
    }
  }
})
