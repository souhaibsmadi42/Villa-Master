/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The repo has no ESLint config yet; type errors still fail the build.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
};
export default nextConfig;
