/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  // react-pdf uses Node APIs and ESM-only internals; load it at runtime instead of bundling it.
  serverExternalPackages: ['@react-pdf/renderer'],
  // pdfkit loads its built-in font metrics dynamically, so standalone tracing misses them.
  outputFileTracingIncludes: {
    '/api/report/[id]': ['./node_modules/pdfkit/js/**/*'],
    '/api/responses/[id]': ['./node_modules/pdfkit/js/**/*'],
  },
};
export default nextConfig;
