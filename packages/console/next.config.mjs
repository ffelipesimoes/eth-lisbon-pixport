/** @type {import('next').NextConfig} */
const rawGatewayUrl = (
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:3001"
)
  .trim()
  .replace(/\/+$/, "");

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/gateway/:path*",
        destination: `${rawGatewayUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
