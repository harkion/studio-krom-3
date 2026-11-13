import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* config options here */
    turbopack: {
        rules: {
            "*.css": {
                loaders: ["@tailwindcss/turbopack"],
                as: "*.css",
            },
        },
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "20mb", // Increase the limit for audio files
        },
    },
};

export default nextConfig;