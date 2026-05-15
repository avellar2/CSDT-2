const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS
  },
  webpack: (config) => {
    // Force CJS version of @reduxjs/toolkit to avoid ESM bundling issues on Vercel
    config.resolve.alias['@reduxjs/toolkit'] = path.resolve(__dirname, 'node_modules/@reduxjs/toolkit/dist/cjs/index.js');
    return config;
  }
};

module.exports = nextConfig;
