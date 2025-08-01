/**
 * Central orchestrator for the SShadows & Secrets module, managing the
 * high-level application lifecycle and coordinating core services.
 */

import type { EventBus } from '../infrastructure/events/EventBus.js';
import type { OverlayRegistry } from './registries/OverlayRegistry.js';
import type { FoundryLogger } from '../../lib/log4foundry/log4foundry.js';
import type { OverlayDefinition } from '../domain/interfaces/OverlayDefinition.js';

import { LoggerFactory } from '../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../config.js';
import { HealthArcDefinition } from '../infrastructure/overlays/definitions/HealthArcDefinition.js';
import { TokenInfoDefinition } from '../infrastructure/overlays/definitions/TokenInfoDefinition.js';

export class ShadowsAndSecretsApplication {
  private readonly logger: FoundryLogger;
  private initialised = false;

  constructor(
    private readonly eventBus: EventBus,
    private readonly overlayRegistry: OverlayRegistry
  ) {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.ManoeuvreApplication`);
  }

  /**
   * Initialise the application and all core services
   * Idempotent - safe to call multiple times
   */
  async initialise(): Promise<void> {
    if (this.initialised) {
      this.logger.warn('ManoeuvreApplication already initialised');
      return;
    }

    this.logger.info('Initialising ManoeuvreApplication');

    try {
      // Register built-in overlays. TODO: Decide whether this should go to the registry directly
      await this.registerDefaultOverlays();

      // Notify all services that application is ready
      await this.eventBus.emit('application.ready', {
        timestamp: Date.now()
      });

      this.initialised = true;
      this.logger.info('ManoeuvreApplication initialised successfully');

    } catch (error) {
      this.logger.error('Failed to initialise application', error);
      throw error;
    }
  }

  /**
   * Clean shutdown of application and all services
   * Ensures proper resource cleanup
   */
  async tearDown(): Promise<void> {
    if (!this.initialised) {
      this.logger.warn('ManoeuvreApplication not initialised, skipping teardown');
      return;
    }

    this.logger.info('Tearing down ManoeuvreApplication');

    try {
      // Notify all services to clean up
      await this.eventBus.emit('application.teardown', {
        timestamp: Date.now()
      });

      // Clear application state
      this.initialised = false;

      this.logger.info('ManoeuvreApplication teardown complete');

    } catch (error) {
      this.logger.error('Error during application teardown', error);
    }
  }

  /**
   * Check if the application is initialised and ready
   */
  isInitialised(): boolean {
    return this.initialised;
  }

  /**
   * Register built-in overlay definitions
   * These are the core overlays provided by the module
   */
  private async registerDefaultOverlays(): Promise<void> {
    this.logger.info('Registering default overlays');

    const overlayDefinitions: OverlayDefinition[] = [
      HealthArcDefinition,
      TokenInfoDefinition
    ];

    let successCount = 0;
    const errors: Array<{ id: string; error: unknown }> = [];

    for (const definition of overlayDefinitions) {
      try {
        this.overlayRegistry.register(definition);
        this.logger.debug(`Registered overlay: ${definition.id}`);
        successCount++;
      } catch (error) {
        this.logger.error(`Failed to register overlay ${definition.id}`, error);
        errors.push({ id: definition.id, error });
      }
    }

    // Verify registration
    const registeredOverlays = this.overlayRegistry.getAll();
    this.logger.info(`Successfully registered ${successCount}/${overlayDefinitions.length} overlays`, {
      total: overlayDefinitions.length,
      success: successCount,
      failed: errors.length,
      registered: registeredOverlays.map(o => o.id)
    });
  }
}