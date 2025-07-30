import type { ShadowsAndSecretsAPIAPI } from '../api';

declare global {
  // Module API on window for macro access
  interface Window {
    ShadowsAndSecrets?: ShadowsAndSecretsAPI;
  }
  
  // Module-specific globals for debugging
  interface GlobalThis {
    updateLoggerLevel?: (level: any) => any;
    shadowsAndSecrets?: any;
  }
}

export {};