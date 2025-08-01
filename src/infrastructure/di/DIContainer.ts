/**
 * Infrastructure layer component responsible for wiring up all services.
 */

import type { InitialisableService } from '../../domain/interfaces/InitialisableService.js';

import { EventBus } from '../events/EventBus.js';
import { KeyboardHandler } from '../input/KeyboardHandler.js';
import { OverlayRegistry } from '../../application/registries/OverlayRegistry.js';
import { OverlayRenderingService } from '../../presentation/services/OverlayRenderingService.js';
import { KeyboardCoordinator } from '../../application/coordinators/KeyboardCoordinator.js';
import { ShadowsAndSecretsApplication } from '../../application/ShadowsAndSecretsApplication.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { SystemEventAdapter } from '../adapters/SystemEventAdapter.js';
import { TokenMeshAdapter } from '../adapters/TokenMeshAdapter.js';
import { OverlayContextBuilderRegistry } from '../../application/registries/OverlayContextBuilderRegistry.js';
import { HealthDisplayManager } from '../../presentation/ui/HealthDisplayManager.js';
import { TokenRepository } from '../repositories/TokenRepository.js';
import { HealthMonitor } from '../../domain/services/HealthMonitor.js';

export class DIContainer {
  private readonly services = new Map<string, any>();
  private readonly logger: FoundryLogger;
  private initialised = false;

  constructor() {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.DIContainer`);
  }

  /**
   * Initialise all services and wire dependencies
   */
  async initialise(): Promise<void> {
    if (this.initialised) {
      this.logger.warn('DIContainer already initialised');
      return;
    }

    this.logger.info('Initialising dependency container');

    try {
      // Infrastructure layer
      const eventBus = new EventBus();
      const keyboardHandler = new KeyboardHandler(eventBus);
      const systemEventAdapter = new SystemEventAdapter(eventBus);
      const tokenMeshAdapter = new TokenMeshAdapter();

      // Repositories
      const tokenRepository = new TokenRepository();

      // Application services
      const overlayRegistry = new OverlayRegistry();

      // Registry
      const overlayContextBuilderRegistry = new OverlayContextBuilderRegistry();

      // Presentation services
      const overlayRenderer = new OverlayRenderingService(
        overlayRegistry,
        tokenMeshAdapter
      );

      const keyboardCoordinator = new KeyboardCoordinator(
        overlayRenderer,
        overlayRegistry,
        overlayContextBuilderRegistry,
        eventBus
      );

      const healthDisplayManager = new HealthDisplayManager();

      const actorHealthMonitor = new HealthMonitor(
        eventBus,
        // actorRepository,
        tokenRepository,
        healthDisplayManager
      );

      // Store all services
      this.services.set('eventBus', eventBus);
      this.services.set('keyboardHandler', keyboardHandler);
      this.services.set('overlayRegistry', overlayRegistry);
      this.services.set('overlayContextBuilderRegistry', overlayContextBuilderRegistry);
      this.services.set('overlayRenderer', overlayRenderer);
      this.services.set('keyboardCoordinator', keyboardCoordinator);
      this.services.set('systemEventAdapter', systemEventAdapter);
      this.services.set('tokenRepository', tokenRepository);
      this.services.set('healthDisplayManager', healthDisplayManager);
      this.services.set('actorHealthMonitor', actorHealthMonitor);

      // Initialise services that need it
      await this.initialiseServices();

      this.initialised = true;
      this.logger.info('Dependency container initialised successfully');
    } catch (error) {
      this.logger.error('Failed to initialise dependency container', error);
      throw error;
    }
  }

  /**
   * Initialise all services that implement InitialisableService
   */
  private async initialiseServices(): Promise<void> {
    const initialisableServices = Array.from(this.services.entries())
      .filter((entry): entry is [string, InitialisableService] => {
        const [_, service] = entry;
        return service && typeof service === 'object' && 'initialise' in service;
      });

    for (const [name, service] of initialisableServices) {
      try {
        this.logger.debug(`Initialising service: ${name}`);
        await service.initialise();
      } catch (error) {
        this.logger.error(`Failed to initialise service: ${name}`, error);
        throw error;
      }
    }
  }

  /**
   * Get a service by key with type safety
   */
  get<T>(key: string): T {
    if (!this.initialised) {
      throw new Error('DIContainer not initialised. Call initialise() first.');
    }

    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service '${key}' not found in container`);
    }
    return service as T;
  }

  /**
   * Check if a service exists
   */
  has(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * Get all registered service keys
   */
  getServiceKeys(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Create the main application instance
   */
  createApplication(): ShadowsAndSecretsApplication {
    return new ShadowsAndSecretsApplication(
      this.get<EventBus>('eventBus'),
      this.get<OverlayRegistry>('overlayRegistry')
    );
  }

  /**
   * Shutdown and cleanup all services
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down dependency container');

    // Shutdown services in reverse order
    const services = Array.from(this.services.entries()).reverse();

    for (const [name, service] of services) {
      if (service && typeof service === 'object' && 'shutdown' in service) {
        try {
          this.logger.debug(`Shutting down service: ${name}`);
          await service.shutdown();
        } catch (error) {
          this.logger.error(`Error shutting down service: ${name}`, error);
        }
      }
    }

    this.services.clear();
    this.initialised = false;
  }
}