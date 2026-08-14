import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: "autoUpdate",
            includeAssets: ["favicon.svg", "robots.txt"],
            manifest: {
                name: "Exhibition Invoicing",
                short_name: "ExpoInvoice",
                description: "Capture customer purchases at exhibition booths and send invoices instantly.",
                theme_color: "#4f46e5",
                background_color: "#ffffff",
                display: "standalone",
                start_url: "/",
                icons: [
                    { src: "icon-192.png", sizes: "192x192", type: "image/png" },
                    { src: "icon-512.png", sizes: "512x512", type: "image/png" },
                    { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
                ],
            },
            workbox: {
                // App shell + static assets are cached automatically by Workbox.
                // API calls are handled separately by our own offline queue (see
                // src/db/offlineDb.ts) rather than being cached here, since invoice
                // creation needs custom conflict/idempotency handling.
                globPatterns: ["**/*.{js,css,html,svg,png,ico}"],
                navigateFallbackDenylist: [/^\/api/, /^\/files/],
            },
        }),
    ],
    server: {
        host: true,
        port: 5173,
    },
});
