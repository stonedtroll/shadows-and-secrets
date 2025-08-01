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

import { Token } from '../../domain/entities/Token.js';
import { OverlayCoordinatorHelper } from './helpers/OverlayCoordinatorHelper.js';
import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

export class KeyboardCoordinator {

  private static readonly KEY_M = 'm';
  private static readonly KEY_K = 'k';

  private readonly logger: FoundryLogger;
  private readonly overlayHelper: OverlayCoordinatorHelper;

  private readonly activeKeys = new Set<string>();
  private readonly mKeyOverlaysCache = new Map<string, Set<string>>();
  private readonly kKeyOverlaysCache = new Map<string, Set<string>>(); // Add K key cache

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

    if (normalisedKey !== KeyboardCoordinator.KEY_M && normalisedKey !== KeyboardCoordinator.KEY_K) {
      return;
    }

    // Prevent repeated key down events while key is held
    if (this.activeKeys.has(normalisedKey)) {
      return;
    }

    this.activeKeys.add(normalisedKey);
    this.logger.debug(`Key pressed`, { key: normalisedKey, activeKeys: Array.from(this.activeKeys) });

    await this.updateOverlays();
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

    // Hide K-key overlays if K key was released
    if (normalisedKey === KeyboardCoordinator.KEY_K && this.kKeyOverlaysCache.size > 0) {
      await this.hideAllKKeyOverlays();
    }
  }

  /**
   * Clears all active key states and overlay caches.
   */
  clearAllKeys(): void {
    const previousCount = this.activeKeys.size;
    this.activeKeys.clear();
    this.mKeyOverlaysCache.clear();
    this.kKeyOverlaysCache.clear();

    this.logger.debug('Cleared all key states and overlay caches', { previousCount });
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
  private async updateOverlays(): Promise<void> {
    const isMKeyPressed = this.activeKeys.has(KeyboardCoordinator.KEY_M);
    const isKKeyPressed = this.activeKeys.has(KeyboardCoordinator.KEY_K);

    // Handle M key overlays
    if (!isMKeyPressed && this.mKeyOverlaysCache.size > 0) {
      await this.hideAllMKeyOverlays();
    }

    // Handle K key overlays
    if (!isKKeyPressed && this.kKeyOverlaysCache.size > 0) {
      await this.hideAllKKeyOverlays();
    }

    if (this.activeKeys.size === 0) {
      return;
    }

    // Process M key overlays
    if (isMKeyPressed) {
      await this.processMKeyOverlays();
    }

    // Process K key overlays
    if (isKKeyPressed) {
      await this.processKKeyOverlays();
    }
  }

  /**
   * Processes M key overlays.
   */
  private async processMKeyOverlays(): Promise<void> {
    const mKeyOverlays = this.overlayRegistry.filterByKeyTrigger(KeyboardCoordinator.KEY_M);

    if (mKeyOverlays.length === 0) {
      return;
    }

    // Clear cache when M key is first pressed
    this.mKeyOverlaysCache.clear();

    // Process overlays by scope and render them
    const overlayGroups = await this.overlayHelper.processOverlaysByScope(mKeyOverlays, this.contextBuilderRegistry, 'keyPress');

    // Track M-key overlays for cleanup
    for (const { targetTokens, overlays } of overlayGroups) {
      this.trackMKeyOverlays(targetTokens, overlays);
    }
  }

  /**
   * Processes K key overlays.
   */
  private async processKKeyOverlays(): Promise<void> {
    const kKeyOverlays = this.overlayRegistry.filterByKeyTrigger(KeyboardCoordinator.KEY_K);

    if (kKeyOverlays.length === 0) {
      return;
    }

    // Clear cache when K key is first pressed
    this.kKeyOverlaysCache.clear();

    // Process overlays by scope and render them
    const overlayGroups = await this.overlayHelper.processOverlaysByScope(kKeyOverlays, this.contextBuilderRegistry, 'keyPress');

    // Track K-key overlays for cleanup
    for (const { targetTokens, overlays } of overlayGroups) {
      this.trackKKeyOverlays(targetTokens, overlays);
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
   * Tracks K-key overlays for efficient cleanup when key is released.
   */
  private trackKKeyOverlays(
    targetTokens: Token[],
    overlays: OverlayDefinition[]
  ): void {
    const overlayIds = new Set(overlays.map(overlay => overlay.id));

    for (const token of targetTokens) {
      if (overlayIds.size === 0) continue;

      // Merge with existing tracked overlays for this token
      const existingOverlays = this.kKeyOverlaysCache.get(token.id) ?? new Set<string>();
      const combinedOverlays = new Set([...existingOverlays, ...overlayIds]);

      this.kKeyOverlaysCache.set(token.id, combinedOverlays);
    }

    this.logger.debug('K key overlays tracked', {
      kKeyOverlaysSize: this.kKeyOverlaysCache.size,
      kKeyOverlaysEntries: Array.from(this.kKeyOverlaysCache.entries()).map(
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
   * Hides all K-key overlays and clears tracking cache.
   */
  private async hideAllKKeyOverlays(): Promise<void> {
    this.logger.debug('Hiding K key overlays', {
      tokenCount: this.kKeyOverlaysCache.size
    });

    const overlayTypesToHide = this.collectUniqueKKeyOverlayTypes();

    this.logger.debug('K key overlay types to hide', {
      overlayTypes: Array.from(overlayTypesToHide),
      kKeyOverlaysSize: this.kKeyOverlaysCache.size,
      kKeyOverlaysEntries: Array.from(this.kKeyOverlaysCache.entries()).map(
        ([tokenId, overlayIds]) => ({
          tokenId,
          overlayIds: Array.from(overlayIds)
        })
      )
    });

    for (const overlayTypeId of overlayTypesToHide) {
      this.overlayRenderer.hideAllOverlaysOfType(overlayTypeId);
    }

    this.kKeyOverlaysCache.clear();
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

  /**
   * Collects all unique overlay type IDs from the K key tracking cache.
   */
  private collectUniqueKKeyOverlayTypes(): Set<string> {
    const uniqueTypes = new Set<string>();

    for (const overlayIds of this.kKeyOverlaysCache.values()) {
      overlayIds.forEach(id => uniqueTypes.add(id));
    }

    return uniqueTypes;
  }
}