// Type declaration for next-pwa
declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  interface PWAConfig {
    dest?: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: Array<{
      urlPattern: RegExp;
      handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate';
      options: {
        cacheName: string;
        expiration?: {
          maxEntries?: number;
          maxAgeSeconds?: number;
        };
        cacheableResponse?: {
          statuses?: number[];
        };
        networkTimeoutSeconds?: number;
      };
    }>;
    buildExcludes?: string[];
    fallbacks?: {
      document?: string;
      image?: string;
      font?: string;
      audio?: string;
      video?: string;
    };
    maximumFileSizeToCacheInBytes?: number;
    manifestTransforms?: Array<(manifest: any) => any>;
    additionalManifestEntries?: Array<{ url: string; revision?: string }>;
  }
  
  function withPWA(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;
  
  export default withPWA;
}