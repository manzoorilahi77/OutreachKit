import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Two copies of the app can run from one folder (the two-laptop e2e): each gets its own build folder.
  distDir: process.env.OKIT_DIST_DIR || ".next",
};

export default config;
