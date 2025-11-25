import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aces.fuel",
  appName: "ACES MSD Fuel Driver",
  webDir: "docs",
  server: {
    androidScheme: "https",
  },
};

export default config;
