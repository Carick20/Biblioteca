import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Recargar en cualquier ruta sin romper el enrutador de React
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // En build de producción, el servidor debe servir index.html para toda ruta.
  // Con Vite preview esto ya está incluido por defecto.
  preview: {
    port: 5173,
  },
});
