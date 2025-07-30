/**
 * Repository for accessing and transforming actor data from Foundry VTT.
 */

import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import type { AbstractActorAdapter } from '../../application/adapters/AbstractActorAdapter.js';

import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';
import { ActorAdapterFactory } from '../factories/ActorAdapterFactory.js';
import { TokenRepository } from './TokenRepository.js';

export class ActorRepository {
  private readonly logger: FoundryLogger;
  private readonly tokenRepository: TokenRepository;

  constructor(tokenRepository?: TokenRepository) {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.ActorRepository`);
    this.tokenRepository = tokenRepository ?? new TokenRepository();
  }

  /**
   * Retrieves actors from controlled tokens.
   */
  getFromControlledTokens(): Actor[] {
    const controlledTokens = this.tokenRepository.getControlled();

    if (controlledTokens.length === 0) {
      this.logger.debug('No controlled tokens found');
      return [];
    }

    return controlledTokens
      .map(token => token.actor)
      .filter((actor): actor is Actor => actor !== null);
  }

  /**
   * Retrieves actors from controlled tokens as adapters.
   */
  getFromControlledTokensAsAdapters(): AbstractActorAdapter[] {
    const actors = this.getFromControlledTokens();
    const adapters = ActorAdapterFactory.createBatch(actors);

    this.logger.debug('Created actor adapters from controlled tokens', {
      actorCount: actors.length,
      adapterCount: adapters.length
    });

    return adapters;
  }

  /**
   * Retrieves actors from tokens owned by the current user.
   */
  getFromOwnedTokens(): Actor[] {
    const ownedTokens = this.tokenRepository.getOwnedByCurrentUser();

    if (ownedTokens.length === 0) {
      this.logger.debug('No owned tokens found');
      return [];
    }

    return ownedTokens
      .map(token => token.actor)
      .filter((actor): actor is Actor => actor !== null);
  }

  /**
   * Retrieves actors from owned tokens as adapters.
   */
  getFromOwnedTokensAsAdapters(): AbstractActorAdapter[] {
    const actors = this.getFromOwnedTokens();
    const adapters = ActorAdapterFactory.createBatch(actors)
      .filter((adapter): adapter is AbstractActorAdapter => adapter !== undefined);

    this.logger.debug('Created actor adapters from owned tokens', {
      actorCount: actors.length,
      adapterCount: adapters.length
    });

    return adapters;
  }

  /**
   * Retrieves all actors from the game's actors collection.
   */
  getAll(): Actor[] {
    if (!game?.actors) {
      this.logger.debug('Game actors collection not ready');
      return [];
    }

    return game.actors.contents as Actor[];
  }

  /**
   * Retrieves actors owned by the current user.
   */
  getOwnedByCurrentUser(): Actor[] {
    return this.getAll().filter(actor => actor.isOwner);
  }

  /**
   * Retrieves a specific actor by ID.
   */
  getById(actorId: string): Actor | undefined {
    if (!game?.actors) {
      return undefined;
    }

    return game.actors.get(actorId) as Actor | undefined;
  }

  /**
   * Retrieves actors by type (e.g., 'character', 'npc').
   */
  getByType(type: string): Actor[] {
    return this.getAll().filter(actor => actor.type === type);
  }

  /**
   * Checks if an actor has a specific token on the canvas.
   */
  hasTokenOnCanvas(actorId: string): boolean {
    const tokens = this.tokenRepository.getByActorId(actorId);
    return tokens.length > 0;
  }
}