import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Permite abrir el dev server desde otros dispositivos de la red local (celular).
  allowedDevOrigins: ["192.168.1.*"],
};

export default nextConfig;
