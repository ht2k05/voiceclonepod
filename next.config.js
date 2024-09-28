/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_CLOUD_STORAGE_BUCKET: process.env.GOOGLE_CLOUD_STORAGE_BUCKET,
    ELEVENLABS_VOICE_ID_HUMZA: process.env.ELEVENLABS_VOICE_ID_HUMZA,
    ELEVENLABS_VOICE_ID_KEITH: process.env.ELEVENLABS_VOICE_ID_KEITH,
    GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig