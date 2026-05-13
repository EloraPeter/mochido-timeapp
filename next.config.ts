// next.config.ts - UPDATE with PWA config

import type { NextConfig } from "next";

const nextConfig: NextConfig = {

    allowedDevOrigins: ["*.ngrok-free.app"],

  /* config options here */
  // Enable PWA features
  headers: async () => {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
          {
            key: 'Content-Type',
            value: 'application/javascript',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
          },
        ],
      },
    ];
  },
};

export default nextConfig;