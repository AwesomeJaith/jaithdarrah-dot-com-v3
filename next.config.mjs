/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "puxggwd6wxhaqhlj.public.blob.vercel-storage.com",
      },
    ],
  },
}

export default nextConfig
