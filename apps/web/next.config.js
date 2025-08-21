/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@easbase/core', '@easbase/ui', '@easbase/sdk'],
}

module.exports = nextConfig