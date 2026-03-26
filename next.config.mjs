/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  serverExternalPackages: [
    "pipemagic",
    "@huggingface/transformers",
    "onnxruntime-web",
    "onnxruntime-node",
  ],
  experimental: {
    optimizePackageImports: ["react-icons", "lucide-react", "date-fns"],
  },
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
