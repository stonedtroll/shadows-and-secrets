import { DnD5eActorAdapter } from "../adapters/DnD5eActorAdapter.js";
import { AbstractActorAdapter } from "../../application/adapters/AbstractActorAdapter.js";
import { CONSTANTS } from "../../config.js";

// Type for concrete adapter classes that extend AbstractActorAdapter
type ActorAdapterConstructor = new (actor: Actor) => AbstractActorAdapter;

/**
 * Factory for creating and managing actor adapters.
 */
export class ActorAdapterFactory {
  private static readonly adapterCache = new Map<string, AbstractActorAdapter>();
  private static readonly supportedSystems = new Map<string, ActorAdapterConstructor>([
    ['dnd5e', DnD5eActorAdapter],
    // Add other system adapters here as they're implemented
    // ['pf2e', PF2eActorAdapter],
    // ['swade', SwadeActorAdapter],
  ]);

  /**
   * Create or retrieve an adapter for the given actor or actor ID.
   * Uses caching to avoid recreating adapters for the same actor.
   */
  static create(actorOrId: Actor): AbstractActorAdapter;
  static create(actorOrId: string): AbstractActorAdapter | null;
  static create(actorOrId: Actor | string): AbstractActorAdapter | null {
    // Handle actor ID string
    if (typeof actorOrId === 'string') {
      const actor = game.actors?.get(actorOrId);
      if (!actor) {
        console.warn(`[${CONSTANTS.MODULE_NAME}] Actor with ID ${actorOrId} not found`);
        return null;
      }
      return this.create(actor);
    }

    // Handle Actor object
    const actor = actorOrId;
    
    // Check cache first
    const cached = this.adapterCache.get(actor.id);
    if (cached) {
      return cached;
    }

    // Create new adapter based on game system
    const adapter = this.createAdapter(actor);
    this.adapterCache.set(actor.id, adapter);

    return adapter;
  }

  /**
   * Create a new adapter instance based on the game system.
   */
  private static createAdapter(actor: Actor): AbstractActorAdapter {
    const systemId = game.system.id;
    const AdapterClass = this.supportedSystems.get(systemId);

    if (!AdapterClass) {
      throw new Error(
        `[${CONSTANTS.MODULE_NAME}] Unsupported game system: ${systemId}. ` +
        `Supported systems: ${Array.from(this.supportedSystems.keys()).join(', ')}`
      );
    }

    return new AdapterClass(actor);
  }

  /**
   * Remove an adapter from the cache.
   * Should be called when an actor is deleted or no longer needed.
   */
  static remove(actorId: string): void {
    const adapter = this.adapterCache.get(actorId);
    if (adapter && 'destroy' in adapter && typeof adapter.destroy === 'function') {
      adapter.destroy();
    }
    this.adapterCache.delete(actorId);
  }

  /**
   * Clear all cached adapters.
   * Useful for cleanup or when switching scenes.
   */
  static clearCache(): void {
    // Destroy all adapters that have a destroy method
    for (const adapter of this.adapterCache.values()) {
      if ('destroy' in adapter && typeof adapter.destroy === 'function') {
        adapter.destroy();
      }
    }
    this.adapterCache.clear();
  }

  /**
   * Get the number of cached adapters.
   * Useful for monitoring memory usage.
   */
  static get cacheSize(): number {
    return this.adapterCache.size;
  }

  /**
   * Check if an adapter exists for the given actor ID.
   */
  static has(actorId: string): boolean {
    return this.adapterCache.has(actorId);
  }

  /**
   * Register a new adapter class for a game system.
   * Allows runtime registration of custom adapters.
   */
  static registerAdapter(systemId: string, adapterClass: ActorAdapterConstructor): void {
    this.supportedSystems.set(systemId, adapterClass);
  }

  /**
   * Check if a game system is supported.
   */
  static isSystemSupported(systemId: string): boolean {
    return this.supportedSystems.has(systemId);
  }

  /**
   * Get all supported game systems.
   */
  static get supportedGameSystems(): string[] {
    return Array.from(this.supportedSystems.keys());
  }

  /**
   * Invalidate cache for a specific actor.
   * Forces recreation on next access.
   */
  static invalidate(actorId: string): void {
    this.remove(actorId);
  }

  /**
   * Batch create adapters for multiple actors.
   */
  static createBatch(actors: (Actor | null | undefined)[]): AbstractActorAdapter[] {
    const adapters: AbstractActorAdapter[] = [];

    for (const actor of actors) {
      if (!actor) continue;

      try {
        adapters.push(this.create(actor));
      } catch (error) {
        console.error(`[${CONSTANTS.MODULE_NAME}] Failed to create adapter for actor ${actor.name}:`, error);
      }
    }

    return adapters;
  }
}

// Register hooks for automatic cache management
Hooks.once('ready', () => {
  // Clear cache when scene changes
  Hooks.on('canvasReady', () => {
    console.debug(`[${CONSTANTS.MODULE_NAME}] Clearing adapter cache for new scene`);
    ActorAdapterFactory.clearCache();
  });

  // Remove adapter when actor is deleted
  Hooks.on('deleteActor', (actor: Actor) => {
    console.debug(`[${CONSTANTS.MODULE_NAME}] Removing adapter for deleted actor: ${actor.name}`);
    ActorAdapterFactory.remove(actor.id);
  });

  // Invalidate cache when actor is updated
  Hooks.on('updateActor', (actor: Actor, changes: any) => {
    // Only invalidate if movement data changed
    if (changes.system?.attributes?.movement) {
      console.debug(`[${CONSTANTS.MODULE_NAME}] Invalidating adapter cache for actor: ${actor.name}`);
      ActorAdapterFactory.invalidate(actor.id);
    }
  });
});

// Clean up on game close
Hooks.once('closeGame', () => {
  ActorAdapterFactory.clearCache();
});