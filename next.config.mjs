const isDev = process.env.NODE_ENV !== 'production';

// Next.js injects inline scripts and styles, so script-src/style-src need 'unsafe-inline' (dev also needs 'unsafe-eval').
// Everything is self-hosted (next/font, avatars), so no third-party origins are allowed.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

// Four Strands (the Money DNA board game, a static page in public/fourstrands) also needs Google Fonts
// and pdf.js from cdnjs, which reads an uploaded Money DNA report on the player's phone.
const gameCsp = [
  "default-src 'self'",
  // accounts.google.com/gsi: the "Continue with Google" button (Google Identity Services)
  `script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://accounts.google.com/gsi/client${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com/gsi/style",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' https://accounts.google.com/gsi/${isDev ? ' ws: wss:' : ''}`,
  "frame-src https://accounts.google.com/gsi/",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // react-pdf uses Node APIs and ESM-only internals; load it at runtime instead of bundling it.
  serverExternalPackages: ['@react-pdf/renderer'],
  // pdfkit loads its built-in font metrics dynamically, so standalone tracing misses them.
  outputFileTracingIncludes: {
    '/api/report/[id]': ['./node_modules/pdfkit/js/**/*'], // dev-only samples
    '/api/responses/[id]': ['./node_modules/pdfkit/js/**/*'],
    '/api/admin/report/[id]': ['./node_modules/pdfkit/js/**/*'],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/admin/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }, { key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
      // later entries override the same header, so the game's policy replaces the site-wide one on its paths
      { source: '/fourstrands', headers: [{ key: 'Content-Security-Policy', value: gameCsp }] },
      { source: '/fourstrands/:path*', headers: [{ key: 'Content-Security-Policy', value: gameCsp }] },
    ];
  },
  async rewrites() {
    return [{ source: '/fourstrands', destination: '/fourstrands/index.html' }];
  },
};
export default nextConfig;
