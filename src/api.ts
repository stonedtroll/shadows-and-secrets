/**
 * //TODO: I have big dreams for you, my son
 * Public API interface for Shadows & Secrets module
 * Provides external access to module functionality
 */
import { MODULE_ID } from './config.js';
import { Vector2 } from './domain/value-objects/Vector2.js';
import { createFoundryLogger, type FoundryLogger } from '../lib/log4foundry/log4foundry.js';
import type { ShadowsAndSecretsApplication } from './application/ShadowsAndSecretsApplication.js';
import type { EventBus } from './infrastructure/events/EventBus.js';
import type { OverlayRegistry } from './application/registries/OverlayRegistry.js';
import type { OverlayDefinition } from './domain/interfaces/OverlayDefinition.js';

const logger: FoundryLogger = createFoundryLogger(`${MODULE_ID}.API`);

export interface ShadowsAndSecretsAPI {
  application: ShadowsAndSecretsApplication;
  eventBus: EventBus;
  overlayRegistry: OverlayRegistry;
  
  // Utility methods
  moveToken(tokenId: string, position: { x: number, y: number }): Promise<boolean>;
  setTokenElevation(tokenId: string, elevation: number): Promise<void>;
  calculatePath(tokenId: string, destination: { x: number, y: number }): Promise<Vector2[]>;
  checkCollision(tokenId: string, position: { x: number, y: number }): Promise<boolean>;
  
  // Overlay permission methods
  registerOverlay(config: OverlayDefinition): void;
  unregisterOverlay(overlayId: string): void;
  refreshOverlayPermissions(): void;
  hasOverlayPermission(overlayId: string, tokenId: string): boolean;
}

/**
 * Register the module API for external access
 */
export function registerAPI(components: {
  application: ShadowsAndSecretsApplication;
  eventBus: EventBus;
  overlayRegistry: OverlayRegistry;
}): void {
  logger.debug('Registering API with components', { components: Object.keys(components) });
  
  // Register API on game object with safety checks
  if (typeof game !== 'undefined' && (game as any)?.modules) {
    const module = (game as any).modules.get(MODULE_ID);
    if (module) {
      (module as any).api = api;
      logger.info('API registered on game.modules');
    } else {
      logger.warn('Module not found in game.modules', { moduleId: MODULE_ID });
    }
  } else {
    logger.debug('Game object not available for API registration');
  }
  
  // Also make available globally for macros and console access
  (globalThis as any).ShadowsAndSecrets = api;
  logger.info('API registered globally as ShadowsAndSecrets');
}