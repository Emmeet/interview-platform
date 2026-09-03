const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  ...(BASE_PATH ? { basePath: BASE_PATH } : {}),
  async redirects() {
    return [
      { source: '/dashboard.html', destination: '/dashboard', permanent: false },
      { source: '/student-info.html', destination: '/student-info', permanent: false },
      { source: '/data-dashboard.html', destination: '/dd', permanent: false },
    ];
  },
};

export default nextConfig;
