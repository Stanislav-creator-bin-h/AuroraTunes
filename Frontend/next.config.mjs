/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return []
    return [
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:5000/:path*",
      },
    ]
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i1.sndcdn.com" },
      { protocol: "https", hostname: "via.placeholder.com" },
    ],
  },
}

export default nextConfig
