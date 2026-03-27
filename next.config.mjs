/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  serverExternalPackages: [
    "pipemagic",
    "@huggingface/transformers",
    "onnxruntime-web",
    "onnxruntime-node",
  ],
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
