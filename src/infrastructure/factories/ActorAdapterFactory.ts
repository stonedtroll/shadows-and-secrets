import { DnD5eActorAdapter } from "../adapters/DnD5eActorAdapter.js";
import { AbstractActorAdapter } from "../../application/adapters/AbstractActorAdapter.js";
import { CONSTANTS } from "../../config.js";

type ActorAdapterConstructor = new (actor: Actor) => AbstractActorAdapter;

export class ActorAdapterFactory {
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
 
      return this.create(token?.actor);
    }

    const actor = actorOrId;

    return this.createAdapter(actor);
  }

  /**
   * Create an adapter from a token.
   */
  static createFromToken(tokenOrId: Token | string): AbstractActorAdapter | null {
    const token = typeof tokenOrId === 'string' 
      ? canvas.tokens?.get(tokenOrId) 
      : tokenOrId;
      
    if (!token?.actor) {
      console.warn(`[${CONSTANTS.MODULE_NAME}] Token has no actor: ${typeof tokenOrId === 'string' ? tokenOrId : tokenOrId.id}`);
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
      console.warn(`[${CONSTANTS.MODULE_NAME}] Token document has no actor: ${tokenDocument.id}`);
      return null;
    }
    
    return this.create(actor);
  }

  /**
   * Find all tokens for a given actor ID on the current canvas.
   */
  static findTokensForActor(actorId: string): Token[] {
    if (!canvas.tokens?.placeables) return [];
    
    return canvas.tokens.placeables
      .filter((placeable): placeable is Token => {
        return placeable instanceof Token && placeable.actor?.id === actorId;
      });
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
      throw new Error(
        `[${CONSTANTS.MODULE_NAME}] Unsupported game system: ${systemId}. ` +
        `Supported systems: ${Array.from(this.supportedSystems.keys()).join(', ')}`
      );
    }

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
        console.error(`[${CONSTANTS.MODULE_NAME}] Failed to create adapter for actor ${actor.name}:`, error);
      }
    }

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
        console.error(`[${CONSTANTS.MODULE_NAME}] Failed to create adapter for token ${token.name}:`, error);
      }
    }

    return adapters;
  }
}