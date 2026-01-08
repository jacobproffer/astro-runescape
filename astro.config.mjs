// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://www.example.com",
  integrations: [sitemap()],
  // Image optimization configuration
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    },
  },
  // Security and performance optimizations
  security: {
    checkOrigin: true,
  },
  vite: {
    plugins: [tailwindcss()], build: {
      // Improve build performance
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['astro'],
          },
        },
      },
    },
  },
});