import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/plus-one",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
