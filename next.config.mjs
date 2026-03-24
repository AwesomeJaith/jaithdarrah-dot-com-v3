/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  experimental: {
    optimizePackageImports: ["react-icons", "lucide-react", "date-fns"],
  },
}

export default nextConfig
