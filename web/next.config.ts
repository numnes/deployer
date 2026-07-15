import type { NextConfig } from 'next';

const isDemo = process.env.NEXT_PUBLIC_DEMO === '1';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/+$/, '') || '';

const nextConfig: NextConfig = {
  // Demo/GitHub Pages: static export. Production installer: standalone.
  output: isDemo ? 'export' : 'standalone',
  ...(basePath
    ? {
        basePath,
        assetPrefix: basePath,
      }
    : {}),
  ...(isDemo
    ? {
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
