/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    // Route navigations run React <ViewTransition> animations (see
    // components/PageTransition.tsx and the view-transition CSS in globals.css).
    viewTransition: true,
  },
}

export default nextConfig
