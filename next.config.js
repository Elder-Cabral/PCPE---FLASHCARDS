/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "font-src 'self' fonts.gstatic.com data:",
              "style-src 'self' 'unsafe-inline' fonts.googleapis.com",
              "img-src 'self' data:",
              "connect-src 'self' https://qywadtazswulvzklzfdu.supabase.co wss://qywadtazswulvzklzfdu.supabase.co",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig
