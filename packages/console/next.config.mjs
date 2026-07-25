/** @type {import('next').NextConfig} */
let rawGatewayUrl = (
  process.env.GATEWAY_URL ||
  process.env.NEXT_PUBLIC_GATEWAY_URL ||
  "http://localhost:3001"
)
  .trim()
  .replace(/\/+$/, "");

if (!/^https?:\/\//i.test(rawGatewayUrl) && !rawGatewayUrl.startsWith("/")) {
  rawGatewayUrl = `https://${rawGatewayUrl}`;
}

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
