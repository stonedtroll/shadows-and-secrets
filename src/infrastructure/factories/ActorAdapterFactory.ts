import { DnD5eActorAdapter } from "../adapters/DnD5eActorAdapter.js";
import { AbstractActorAdapter } from "../../application/adapters/AbstractActorAdapter.js";
import { MODULE_ID } from "../../config.js";
import { LoggerFactory, type FoundryLogger } from "../../../lib/log4foundry/log4foundry.js";

type ActorAdapterConstructor = new (actor: Actor) => AbstractActorAdapter;

export class ActorAdapterFactory {
  private static readonly logger: FoundryLogger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.ActorAdapterFactory`);
  
  private static readonly supportedSystems = new Map<string, ActorAdapterConstructor>([
    ['dnd5e', DnD5eActorAdapter]
  ]);

  /**
   * Create an adapter for the given actor or actor ID.
   */
  static create(actorOrId: Actor): AbstractActorAdapter;
  static create(actorOrId: string): AbstractActorAdapter | null;
  static create(actorOrId: Actor | string): AbstractActorAdapter | null {
    if (typeof actorOrId === 'string') {
      const token = canvas.tokens?.placeables.find(t => t.actor?.id === actorOrId);
      if (token?.actor) {
        this.logger.debug(`Found synthetic actor for ID: ${actorOrId}`);
        return this.createAdapter(token.actor);
      }
      
      const worldActor = game.actors.get(actorOrId);
      if (worldActor) {
        this.logger.debug(`Found world actor for ID: ${actorOrId}`);
        return this.createAdapter(worldActor);
      }
      
      this.logger.warn(`Actor not found: ${actorOrId}`);
      return null;
    }

    return this.createAdapter(actorOrId);
  }

  /**
   * Create an adapter from a token.
   */
  static createFromToken(tokenOrId: Token | string): AbstractActorAdapter | null {
    const token = typeof tokenOrId === 'string' 
      ? canvas.tokens?.get(tokenOrId) 
      : tokenOrId;
      
    if (!token?.actor) {
      this.logger.warn(`Token has no actor: ${typeof tokenOrId === 'string' ? tokenOrId : tokenOrId.id}`);
      return null;
    }
    
    return this.create(token.actor);
  }

  /**
   * Create an adapter from a token document.
   */
  static createFromTokenDocument(tokenDocument: TokenDocument): AbstractActorAdapter | null {
    const actor = tokenDocument.actor;
    if (!actor) {
      this.logger.warn(`Token document has no actor: ${tokenDocument.id}`);
      return null;
    }
    
    return this.create(actor);
  }

  /**
   * Find all tokens for a given actor ID on the current canvas.
   */
  static findTokensForActor(actorId: string): Token[] {
    if (!canvas.tokens?.placeables) {
      this.logger.debug('No canvas tokens available');
      return [];
    }
    
    const tokens = canvas.tokens.placeables
      .filter((placeable): placeable is Token => {
        return placeable instanceof Token && placeable.actor?.id === actorId;
      });
    
    this.logger.debug(`Found ${tokens.length} tokens for actor ${actorId}`);

    return tokens;
  }

  /**
   * Create adapters for all tokens of a given actor on the canvas.
   */
  static createFromAllTokensOfActor(actorId: string): AbstractActorAdapter[] {
    const tokens = this.findTokensForActor(actorId);
    return tokens
      .map(token => token.actor ? this.create(token.actor) : null)
      .filter((adapter): adapter is AbstractActorAdapter => adapter !== null);
  }

  /**
   * Create a new adapter instance based on the game system.
   */
  private static createAdapter(actor: Actor): AbstractActorAdapter {
    const systemId = game.system.id;
    const AdapterClass = this.supportedSystems.get(systemId);

    if (!AdapterClass) {
      const supportedSystems = Array.from(this.supportedSystems.keys()).join(', ');
      this.logger.error(`Unsupported game system: ${systemId}. Supported systems: ${supportedSystems}`);
      throw new Error(
        `Unsupported game system: ${systemId}. ` +
        `Supported systems: ${supportedSystems}`
      );
    }

    this.logger.debug(`Creating ${systemId} adapter for actor ${actor.name}`);

    return new AdapterClass(actor);
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
   * Batch create adapters for multiple actors.
   */
  static createBatch(actors: (Actor | null | undefined)[]): AbstractActorAdapter[] {
    const adapters: AbstractActorAdapter[] = [];

    for (const actor of actors) {
      if (!actor) continue;

      try {
        adapters.push(this.create(actor));
      } catch (error) {
        this.logger.error(`Failed to create adapter for actor ${actor.name}`, error);
      }
    }

    this.logger.debug(`Created ${adapters.length} adapters from ${actors.length} actors`);

    return adapters;
  }

  /**
   * Batch create adapters from tokens.
   */
  static createBatchFromTokens(tokens: (Token | null | undefined)[]): AbstractActorAdapter[] {
    const adapters: AbstractActorAdapter[] = [];

    for (const token of tokens) {
      if (!token?.actor) continue;

      try {
        adapters.push(this.create(token.actor));
      } catch (error) {
        this.logger.error(`Failed to create adapter for token ${token.name}`, error);
      }
    }

    this.logger.debug(`Created ${adapters.length} adapters from ${tokens.length} tokens`);

    return adapters;
  }
}