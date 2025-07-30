/**
 * Manages keyboard input events and coordinates the display of overlays
 * based on key presses.
 */

import type { EventBus } from '../../infrastructure/events/EventBus.js';
import type {
  KeyboardKeyDownEvent,
  KeyboardKeyUpEvent
} from '../../infrastructure/events/FoundryEvents.js';
import type { OverlayDefinition } from '../../domain/interfaces/OverlayDefinition.js';
import type { OverlayRenderingService } from '../../presentation/services/OverlayRenderingService.js';
import type { OverlayRegistry } from '../registries/OverlayRegistry.js';
import type { OverlayContextBuilderRegistry } from '../registries/OverlayContextBuilderRegistry.js';
import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

import { Actor } from '../../domain/entities/Actor.js';
import { Token } from '../../domain/entities/Token.js';
import { OverlayCoordinatorHelper } from './helpers/OverlayCoordinatorHelper.js';
import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

export class KeyboardCoordinator {

  private static readonly KEY_M = 'm';

  private readonly logger: FoundryLogger;
  private readonly overlayHelper: OverlayCoordinatorHelper;

  private readonly activeKeys = new Set<string>();
  private readonly mKeyOverlaysCache = new Map<string, Set<string>>();

  constructor(
    private readonly overlayRenderer: OverlayRenderingService,
    private readonly overlayRegistry: OverlayRegistry,
    private readonly contextBuilderRegistry: OverlayContextBuilderRegistry,
    private readonly eventBus: EventBus
  ) {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.KeyboardCoordinator`);
    this.overlayHelper = new OverlayCoordinatorHelper(overlayRenderer);

    this.initialise();
  }

  // Public Methods

  async handleKeyDown(event: KeyboardKeyDownEvent): Promise<void> {
    const normalisedKey = event.key.toLowerCase();

    if (normalisedKey !== KeyboardCoordinator.KEY_M) {
      return;
    }

    // Prevent repeated key down events while key is held
    if (this.activeKeys.has(normalisedKey)) {
      return;
    }

    this.activeKeys.add(normalisedKey);
    this.logger.debug(`Key pressed`, { key: normalisedKey, activeKeys: Array.from(this.activeKeys) });

    const allTokens = event.allTokenAdapters.map(adapter => new Token(adapter));
    const ownedActors = event.ownedByCurrentUserActorAdapters.map(adapter => new Actor(adapter));

    await this.updateOverlays(
      allTokens,
      ownedActors,
      event.user.isGM,
      event.user.colour
    );
  }

  async handleKeyUp(event: KeyboardKeyUpEvent): Promise<void> {
    const normalisedKey = event.key.toLowerCase();

    // Ignore if key wasn't tracked as active
    if (!this.activeKeys.has(normalisedKey)) {
      return;
    }

    this.activeKeys.delete(normalisedKey);
    this.logger.debug(`Key released`, { key: normalisedKey, activeKeys: Array.from(this.activeKeys) });

    // Hide M-key overlays if M key was released
    if (normalisedKey === KeyboardCoordinator.KEY_M && this.mKeyOverlaysCache.size > 0) {
      await this.hideAllMKeyOverlays();
    }
  }

  /**
   * Clears all active key states.
   */
  clearAllKeys(): void {
    const previousCount = this.activeKeys.size;
    this.activeKeys.clear();

    this.logger.debug('Cleared all key states', { previousCount });
  }

  /**
   * Gets a read-only copy of currently active keys.
   */
  getActiveKeys(): ReadonlySet<string> {
    return new Set(this.activeKeys);
  }

  // Private Methods - Initialisation

  /**
   * Initialises the coordinator by registering event handlers.
   */
  private initialise(): void {
    this.registerEventHandlers();
    this.logger.info('KeyboardCoordinator initialised');
  }

  /**
   * Registers event handlers for keyboard events.
   */
  private registerEventHandlers(): void {
    this.eventBus.on('keyboard:keyDown', this.handleKeyDown.bind(this));
    this.eventBus.on('keyboard:keyUp', this.handleKeyUp.bind(this));

    this.logger.debug('Keyboard event handlers registered');
  }

  // Private Methods - Overlay Management

  /**
   * Updates overlay visibility based on current key states.
   */
  private async updateOverlays(
    allTokens: Token[],
    ownedActors: Actor[],
    isGM: boolean,
    userColour: string,
  ): Promise<void> {
    const isMKeyPressed = this.activeKeys.has(KeyboardCoordinator.KEY_M);

    if (!isMKeyPressed && this.mKeyOverlaysCache.size > 0) {
      await this.hideAllMKeyOverlays();
      return;
    }

    if (this.activeKeys.size === 0) {
      return;
    }

    const mKeyOverlays = this.overlayRegistry.filterByKeyTrigger(
      KeyboardCoordinator.KEY_M
    );

    if (mKeyOverlays.length === 0) {
      return;
    }

    // Clear cache when M key is first pressed
    if (isMKeyPressed) {
      this.mKeyOverlaysCache.clear();
    }

    // Process overlays by scope and render them
    const overlayGroups = await this.overlayHelper.processOverlaysByScope(
      mKeyOverlays,
      allTokens,
      isGM,
      userColour,
      this.contextBuilderRegistry,
      'keyPress',
      ownedActors,
    );

    // Track M-key overlays for cleanup
    for (const { targetTokens, overlays } of overlayGroups) {
      this.trackMKeyOverlays(targetTokens, overlays);
    }
  }

  /**
   * Tracks M-key overlays for efficient cleanup when key is released.
   */
  private trackMKeyOverlays(
    targetTokens: Token[],
    overlays: OverlayDefinition[]
  ): void {
    const overlayIds = new Set(overlays.map(overlay => overlay.id));

    for (const token of targetTokens) {
      if (overlayIds.size === 0) continue;

      // Merge with existing tracked overlays for this token
      const existingOverlays = this.mKeyOverlaysCache.get(token.id) ?? new Set<string>();
      const combinedOverlays = new Set([...existingOverlays, ...overlayIds]);

      this.mKeyOverlaysCache.set(token.id, combinedOverlays);
    }

    this.logger.debug('M key overlays tracked', {
      mKeyOverlaysSize: this.mKeyOverlaysCache.size,
      mKeyOverlaysEntries: Array.from(this.mKeyOverlaysCache.entries()).map(
        ([tokenId, overlayIds]) => ({
          tokenId,
          overlayIds: Array.from(overlayIds)
        })
      )
    });
  }

  /**
   * Hides all M-key overlays and clears tracking cache.
   */
  private async hideAllMKeyOverlays(): Promise<void> {
    this.logger.debug('Hiding M key overlays', {
      tokenCount: this.mKeyOverlaysCache.size
    });

    const overlayTypesToHide = this.collectUniqueOverlayTypes();

    this.logger.debug('M key overlay types to hide', {
      overlayTypes: Array.from(overlayTypesToHide),
      mKeyOverlaysSize: this.mKeyOverlaysCache.size,
      mKeyOverlaysEntries: Array.from(this.mKeyOverlaysCache.entries()).map(
        ([tokenId, overlayIds]) => ({
          tokenId,
          overlayIds: Array.from(overlayIds)
        })
      )
    });

    for (const overlayTypeId of overlayTypesToHide) {
      this.overlayRenderer.hideAllOverlaysOfType(overlayTypeId);
    }

    this.mKeyOverlaysCache.clear();
  }

  /**
   * Collects all unique overlay type IDs from the tracking cache.
   */
  private collectUniqueOverlayTypes(): Set<string> {
    const uniqueTypes = new Set<string>();

    for (const overlayIds of this.mKeyOverlaysCache.values()) {
      overlayIds.forEach(id => uniqueTypes.add(id));
    }

    return uniqueTypes;
  }
}