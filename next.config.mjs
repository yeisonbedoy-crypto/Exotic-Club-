import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  // Esta estrategia cachea por defecto recursos estáticos y rutinas comunes.
  // Para bases de datos en tiempo real (Supabase), se recomienda NetworkFirst
  workboxOptions: {
    runtimeCaching: [
      {
        // Cachear peticiones a la API REST de Supabase de lectura
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'supabase-api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 24 * 60 * 60, // 24 horas
          },
          networkTimeoutSeconds: 5, // Si falla el internet, a los 5s muestra caché
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default withPWA(nextConfig);
