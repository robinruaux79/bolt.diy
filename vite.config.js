import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svgr(), react()],
  build: {minify: true},
  server: {
    host: "127.0.0.1",
  },
  resolve: {
    dedupe: ["react", "react-dom"],
  },
})
