/** @type {import('next').NextConfig} */
const nextConfig = {
  // @winelore/core ships TypeScript source; Next must compile it like app code.
  transpilePackages: ['@winelore/core'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/template/:id',
        destination: '/templates/:id',
        permanent: true,
      },
      {
        source: '/outcome-policy',
        destination: '/outcome-policies',
        permanent: true,
      },
      {
        source: '/outcome-policies/:id',
        destination: '/outcome-policy/:id',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
