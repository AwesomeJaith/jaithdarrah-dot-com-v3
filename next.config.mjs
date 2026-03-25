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
}

export default nextConfig
