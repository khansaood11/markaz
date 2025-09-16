/** @type {import('next').NextConfig} */

const nextConfig = {
  // This is to allow the Next.js dev server to accept requests from the
  // Firebase Studio development environment.
  allowedDevOrigins: [
    'https://6000-firebase-studio-1757513635112.cluster-mwsteha33jfdowtvzffztbjcj6.cloudworkstations.dev',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       {
        protocol: 'https' ,
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

module.exports = nextConfig;
