import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'puppeteer-extra', 
    'puppeteer-extra-plugin-stealth', 
    'puppeteer', 
    'better-sqlite3',
    '@xenova/transformers',
    'tesseract.js'
  ],
};

export default nextConfig;
