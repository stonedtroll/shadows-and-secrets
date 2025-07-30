/**
 * Manages the lifecycle and rendering of visual overlays using PixiJS v7.
 * Provides a centralised service for rendering token-based and world-based overlays
 * with support for rendering on different canvas layers.
 */
import type { OverlayRenderContext } from '../../domain/interfaces/OverlayRenderContext.js';
import type { InitialisableService } from '../../domain/interfaces/InitialisableService.js';
import type { TokenMeshAdapter } from '../../infrastructure/adapters/TokenMeshAdapter.js';

import { OverlayRegistry } from '../../application/registries/OverlayRegistry.js';
import { OverlayContainer } from '../overlays/OverlayContainer.js';
import { HealthArcRenderer } from '../renderers/HealthArcRenderer.js';
import { MODULE_ID } from '../../config.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

export class OverlayRenderingService implements InitialisableService {
  private readonly logger: FoundryLogger;
  private readonly layerContainers = new Map<string, OverlayContainer>();
  private readonly overlayTypeContainers = new Map<string, PIXI.Container>();
  private readonly overlayInstances = new Map<string, PIXI.Graphics>();
  private readonly renderers = new Map<string, any>();
  private isInitialised = false;

  // Configuration constants
  private static readonly CONFIG = {
    INSTANCE_KEY_SEPARATOR: '-',
    TYPE_CONTAINER_PREFIX: 'overlay-type-',
    LAYER_CONTAINER_PREFIX: 'overlay-layer-',
    // Layer-specific z-index values
    LAYER_Z_INDICES: {
      background: 100,
      grid: 200, 
      drawings: 300,
      walls: 400,
      tiles: 450,
      tokens: 500,
      lighting: 600,
      weather: 700,
      foreground: 800,
      interface: 900,
      controls: 1000
    },
    // Default z-index for unknown layers
    DEFAULT_Z_INDEX: 500
  } as const;

  constructor(
    private readonly overlayRegistry: OverlayRegistry,
    private readonly tokenMeshAdapter: TokenMeshAdapter
  ) {
    this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.OverlayRenderingService`);
    this.initialiseRenderers();
  }

  // Initialisation

  /**
   * Initialise the service and set up canvas integration
   */
  async initialise(): Promise<void> {
    try {
      this.logger.info('Initialising overlay rendering service');
      
      if (this.canInitialise()) {
        this.performInitialisation();
      } else {
        this.deferInitialisation();
      }
    } catch (error) {
      this.logger.error('Failed to initialise overlay rendering service', error);
      throw error;
    }
  }

  /**
   * Check if canvas is ready for initialisation
   */
  private canInitialise(): boolean {
    return !!(canvas && canvas.ready);
  }

  /**
   * Defer initialisation until canvas is ready
   */
  private deferInitialisation(): void {
    this.logger.warn('Canvas not ready, deferring initialisation');
    
    const performInit = () => {
      this.logger.info('Canvas ready, performing deferred initialisation');
      this.performInitialisation();
    };

    if (!canvas) {
      Hooks.once('ready', () => {
        if (canvas?.ready) {
          performInit();
        } else {
          Hooks.once('canvasReady', performInit);
        }
      });
    } else {
      Hooks.once('canvasReady', performInit);
    }
  }

  /**
   * Perform the actual initialisation steps
   */
  private performInitialisation(): void {
    try {
      this.validateCanvas();
      this.createLayerContainers();
      this.setupHooks();
      
      // Only mark as initialised if we actually created containers
      if (this.layerContainers.size > 0) {
        this.isInitialised = true;
        this.logger.info('Overlay rendering service initialised successfully', {
          layerContainers: this.layerContainers.size,
          layers: Array.from(this.layerContainers.keys())
        });
      } else {
        // Always create at least the tokens layer container as fallback
        this.createDefaultLayerContainer();
        this.isInitialised = true;
        this.logger.warn('No overlay layers configured, created default tokens layer container');
      }
    } catch (error) {
      this.logger.error('Failed to perform initialisation', error);
      throw error;
    }
  }

  /**
   * Create default tokens layer container as fallback
   */
  private createDefaultLayerContainer(): void {
    const tokensLayer = canvas?.tokens;
    if (tokensLayer) {
      this.createLayerContainer('tokens', tokensLayer);
    } else {
      throw new Error('Could not create default layer container - tokens layer not available');
    }
  }

  /**
   * Initialise renderer instances for each overlay type
   */
  private initialiseRenderers(): void {
    this.renderers.set('health-arc', new HealthArcRenderer());

    this.logger.debug('Initialised overlay renderers', {
      renderers: Array.from(this.renderers.keys())
    });
  }

  // Container Management

  /**
   * Create containers on appropriate canvas layers based on overlay configurations
   */
  private createLayerContainers(): void {
    this.logger.info('Creating layer containers');

    // Get all unique render layers from registered overlays
    const renderLayers = this.getUniqueRenderLayers();
    
    for (const layerName of renderLayers) {
      const layer = this.getCanvasLayer(layerName);
      if (layer) {
        this.createLayerContainer(layerName, layer);
      } else {
        this.logger.warn(`Canvas layer not found: ${layerName}`);
      }
    }
  }

  /**
   * Get unique render layers from all registered overlays
   */
  private getUniqueRenderLayers(): Set<string> {
    const layers = new Set<string>();

    // Always include drawings layer as default
    layers.add('drawings');
    layers.add('tokens');
    
    for (const overlay of this.overlayRegistry.getAll()) {
      const layer = overlay.renderLayer || 'drawings';
      layers.add(layer);
    }
    
    return layers;
  }

  /**
   * Get a specific canvas layer by name
   */
  private getCanvasLayer(layerName: string): CanvasLayer | null {
    if (!canvas) return null;
    
    // Map layer names to actual canvas layer objects
    switch (layerName) {
      case 'drawings':
        return canvas.drawings ?? null;
      case 'walls':
        return canvas.walls ?? null;
      case 'tiles':
        return canvas.tiles ?? null;
      case 'tokens':
        return canvas.tokens ?? null;
      case 'lighting':
        return canvas.lighting ?? null;
      case 'weather':
        return canvas.weather ?? null;
      case 'controls':
        return canvas.controls ?? null;
      default:
        // Try to access custom layer
        return (canvas as any)[layerName] ?? null;
    }
  }

  /**
   * Create a container on a specific canvas layer
   */
  private createLayerContainer(layerName: string, layer: CanvasLayer): void {
    const container = new OverlayContainer();
    container.name = `${OverlayRenderingService.CONFIG.LAYER_CONTAINER_PREFIX}${layerName}`;
    
    // Set z-index based on layer
    const zIndex = OverlayRenderingService.CONFIG.LAYER_Z_INDICES[layerName as keyof typeof OverlayRenderingService.CONFIG.LAYER_Z_INDICES] 
      || OverlayRenderingService.CONFIG.DEFAULT_Z_INDEX;
    container.zIndex = zIndex;
    
    // Add to the layer
    layer.addChild(container);
    
    // Enable sorting if supported
    if ('sortableChildren' in layer) {
      (layer as any).sortableChildren = true;
      (layer as any).sortChildren?.();
    }
    
    this.layerContainers.set(layerName, container);
    
    this.logger.info(`Created layer container for ${layerName}`, {
      layerName: layer.constructor.name,
      zIndex: container.zIndex
    });
  }

  /**
   * Get or create a container for a specific overlay type
   */
  private getOrCreateTypeContainer(overlayTypeId: string): PIXI.Container {
    this.validateInitialised();

    let container = this.overlayTypeContainers.get(overlayTypeId);
    if (!container) {
      container = this.createTypeContainer(overlayTypeId);
      this.overlayTypeContainers.set(overlayTypeId, container);
    }

    return container;
  }

  /**
   * Create a new type-specific container
   */
  private createTypeContainer(overlayTypeId: string): PIXI.Container {
    // Get overlay definition to determine target layer
    const overlayDef = this.overlayRegistry.get(overlayTypeId);
    if (!overlayDef) {
      throw new Error(`Overlay definition not found: ${overlayTypeId}`);
    }
    
    // Determine which layer container to use
    const renderLayer = overlayDef.renderLayer || 'tokens';
    const layerContainer = this.getLayerContainer(renderLayer);
    
    const container = new PIXI.Container();
    container.name = `${OverlayRenderingService.CONFIG.TYPE_CONTAINER_PREFIX}${overlayTypeId}`;
    container.sortableChildren = true;
    container.visible = true;
    container.renderable = true;
    container.eventMode = 'none';
    
    // Apply overlay-specific z-index if provided
    if (overlayDef.zIndex !== undefined) {
      container.zIndex = overlayDef.zIndex;
      layerContainer.sortableChildren = true;
      layerContainer.sortChildren();
    }
    
    layerContainer.addChild(container);
    
    this.logger.debug(`Created type container for ${overlayTypeId} on ${renderLayer} layer`, {
      renderLayer,
      zIndex: container.zIndex,
      parentContainer: layerContainer.name
    });
    
    return container;
  }

  /**
   * Get the appropriate layer container
   */
  private getLayerContainer(layerName: string): OverlayContainer {
    const container = this.layerContainers.get(layerName);
    
    if (!container) {
      // Fallback to tokens layer
      const defaultContainer = this.layerContainers.get('tokens');
      if (!defaultContainer) {
        throw new Error(`No layer container available for layer: ${layerName}`);
      }
      
      this.logger.warn(`Layer container not found for ${layerName}, using tokens layer`);
      return defaultContainer;
    }
    
    return container;
  }

  // Rendering Operations

  /**
   * Render a token-based overlay
   */
  renderTokenOverlay(context: OverlayRenderContext): void {
    if (!this.isInitialised) {
      this.logger.warn('Service not initialised, deferring render', {
        overlayTypeId: context.overlayTypeId,
        tokenId: context.token.id
      });
      return;
    }

    try {
      this.validateOverlayType(context.overlayTypeId);
      
      const renderer = this.getRenderer(context.overlayTypeId);
      const instanceKey = this.createInstanceKey(context.token.id, context.overlayTypeId);
      
      const { graphics } = this.prepareGraphicsInstance(instanceKey, context);
      
      // Execute render
      renderer.render(graphics, context);
      graphics.visible = true;
      
    } catch (error) {
      this.logger.error(`Failed to render ${context.overlayTypeId} for token ${context.token.id}`, error);
    }
  }

  /**
   * Prepare graphics instance and determine parent container
   */
  private prepareGraphicsInstance(
    instanceKey: string, 
    context: OverlayRenderContext
  ): { graphics: PIXI.Graphics; parentContainer: PIXI.Container } {
    
    // Check if context specifies mesh rendering
    if (context.renderOnTokenMesh) {
      return this.prepareTokenMeshGraphics(instanceKey, context);
    } else {
      return this.prepareLayerGraphics(instanceKey, context);
    }
  }

  /**
   * Prepare graphics for token mesh rendering
   */
  private prepareTokenMeshGraphics(
    instanceKey: string,
    context: OverlayRenderContext
  ): { graphics: PIXI.Graphics; parentContainer: PIXI.Container } {
    
    const tokenMesh = this.tokenMeshAdapter.getMesh(context.token.id);
    
    if (tokenMesh) {
      const graphics = this.getOrCreateGraphicsInstance(instanceKey, tokenMesh);
      graphics.position.set(0, 0); // Relative to token centre
      
      this.logger.debug('Rendering on token mesh', {
        instanceKey,
        tokenId: context.token.id
      });
      
      return { graphics, parentContainer: tokenMesh };
    }
    
    // Fallback to layer container
    this.logger.warn(`Token mesh not found for ${context.token.id}, using layer container`);
    return this.prepareLayerGraphics(instanceKey, context);
  }

  /**
   * Prepare graphics for layer-based rendering
   */
  private prepareLayerGraphics(
    instanceKey: string,
    context: OverlayRenderContext
  ): { graphics: PIXI.Graphics; parentContainer: PIXI.Container } {
    
    const typeContainer = this.getOrCreateTypeContainer(context.overlayTypeId);
    const graphics = this.getOrCreateGraphicsInstance(instanceKey, typeContainer);

    const position = context.overlayCentre;
    graphics.position.set(position.x, position.y);
    
    this.logger.debug('Rendering on layer container', {
      instanceKey,
      position: graphics.position,
      layer: typeContainer.parent?.name
    });
    
    return { graphics, parentContainer: typeContainer };
  }

  /**
   * Get or create a graphics instance
   */
  private getOrCreateGraphicsInstance(instanceKey: string, parent: PIXI.Container): PIXI.Graphics {
  let graphics = this.overlayInstances.get(instanceKey);
  
  if (!graphics) {
    graphics = new PIXI.Graphics();
    graphics.name = instanceKey;
    this.overlayInstances.set(instanceKey, graphics);
    parent.addChild(graphics);
    
      this.logger.debug(`Created graphics instance: ${instanceKey}`);
  } else if (graphics.parent !== parent) {
      this.reparentGraphics(graphics, parent, instanceKey);
  }
  
  return graphics;
}

  /**
   * Move graphics to a new parent container
   */
  private reparentGraphics(graphics: PIXI.Graphics, newParent: PIXI.Container, instanceKey: string): void {
  graphics.parent?.removeChild(graphics);
  newParent.addChild(graphics);
  
  this.logger.debug(`Reparented graphics instance: ${instanceKey}`, {
      parent: newParent.name || newParent.constructor.name
  });
}

  // Cleanup Operations

  /**
   * Clear a specific token overlay
   */
  clearTokenOverlay(overlayTypeId: string, tokenId: string): void {
    const instanceKey = this.createInstanceKey(tokenId, overlayTypeId);
    const graphics = this.overlayInstances.get(instanceKey);
    
    if (graphics) {
      this.destroyGraphicsInstance(instanceKey, graphics);
      this.logger.debug(`Cleared ${overlayTypeId} for token ${tokenId}`);
    }
  }

  /**
   * Clear all overlays for a specific token
   */
  clearAllTokenOverlays(tokenId: string): void {
    const keysToRemove = this.findTokenOverlayKeys(tokenId);
    
    if (keysToRemove.length > 0) {
      keysToRemove.forEach(key => {
        const graphics = this.overlayInstances.get(key);
        if (graphics) {
          this.destroyGraphicsInstance(key, graphics);
        }
      });
      
      this.logger.debug(`Cleared all overlays for token ${tokenId}`, {
        overlayCount: keysToRemove.length
      });
    }
  }

  /**
   * Clear all overlays of a specific type
   */
  clearOverlayType(overlayTypeId: string): void {
    const keysToRemove = this.findOverlayTypeKeys(overlayTypeId);
    
    keysToRemove.forEach(key => {
      const graphics = this.overlayInstances.get(key);
      if (graphics) {
        this.destroyGraphicsInstance(key, graphics);
      }
    });
    
    // Clear type container
    const typeContainer = this.overlayTypeContainers.get(overlayTypeId);
    typeContainer?.removeChildren();
    
    this.logger.debug(`Cleared all overlays of type ${overlayTypeId}`, {
      instanceCount: keysToRemove.length
    });
  }

  /**
   * Destroy all containers and clean up resources
   */
  private destroyAllContainers(): void {
    // Clear all graphics instances
    this.overlayInstances.forEach((graphics) => graphics.destroy());
    this.overlayInstances.clear();
    
    // Clear type containers
    this.overlayTypeContainers.forEach(container => container.destroy({ children: true }));
    this.overlayTypeContainers.clear();
    
    // Destroy layer containers
    this.layerContainers.forEach((container) => {
      container.parent?.removeChild(container);
      container.destroy({ children: true });
    });
    this.layerContainers.clear();
    
    this.isInitialised = false;
    this.logger.debug('Destroyed all overlay containers');
  }

  /**
   * Destroy a single graphics instance
   */
  private destroyGraphicsInstance(instanceKey: string, graphics: PIXI.Graphics): void {
    graphics.clear();
    graphics.parent?.removeChild(graphics);
    graphics.destroy();
    this.overlayInstances.delete(instanceKey);
  }

  // Visibility Management

  /**
   * Hide a specific token overlay without destroying it
   */
  hideTokenOverlay(overlayTypeId: string, tokenId: string): void {
    const instanceKey = this.createInstanceKey(tokenId, overlayTypeId);
    const graphics = this.overlayInstances.get(instanceKey);
    
    if (graphics) {
      graphics.visible = false;
      this.logger.debug(`Hid ${overlayTypeId} for token ${tokenId}`);
    }
  }

  /**
   * Hide all overlays of a specific type
   */
  hideAllOverlaysOfType(overlayTypeId: string): void {
    const keys = this.findOverlayTypeKeys(overlayTypeId);
    
    keys.forEach(key => {
      const graphics = this.overlayInstances.get(key);
      if (graphics) {
        graphics.visible = false;
      }
    });
    
    this.logger.debug(`Hid all overlays of type ${overlayTypeId}`);
  }

  // Query Methods

  /**
   * Check if a specific overlay instance exists
   */
  hasOverlayInstance(tokenId: string, overlayTypeId: string): boolean {
    const instanceKey = this.createInstanceKey(tokenId, overlayTypeId);
    return this.overlayInstances.has(instanceKey);
  }

  /**
   * Get all active overlay type IDs
   */
  getActiveOverlayTypes(): string[] {
    return Array.from(this.overlayTypeContainers.keys());
  }

  /**
   * Get count of instances for a specific overlay type
   */
  getInstanceCount(overlayTypeId: string): number {
    return this.findOverlayTypeKeys(overlayTypeId).length;
  }

  // Event Hooks

  /**
   * Setup Foundry hooks for canvas lifecycle events
   */
  private setupHooks(): void {
    Hooks.on('canvasTearDown', this.handleCanvasTearDown.bind(this));
    Hooks.on('canvasReady', this.handleCanvasReady.bind(this));
    Hooks.on('deleteToken', this.handleDeleteToken.bind(this));
  }

  private handleCanvasTearDown(): void {
    this.logger.debug('Canvas teardown, cleaning up overlays');
    this.destroyAllContainers();
  }

  private handleCanvasReady(): void {
    this.logger.debug('Canvas ready, checking if reinitialisation needed');
    if (!this.isInitialised) {
      this.performInitialisation();
    }
  }

  private handleDeleteToken(tokenDocument: TokenDocument): void {
    if (this.isInitialised) {
      this.clearAllTokenOverlays(tokenDocument.id);
    }
  }

  // Helper Methods


  /**
   * Get renderer for overlay type
   */
  private getRenderer(overlayTypeId: string): any {
    const renderer = this.renderers.get(overlayTypeId);
    if (!renderer) {
      throw new Error(`No renderer available for overlay type: ${overlayTypeId}`);
    }
    return renderer;
  }

  /**
   * Create instance key for overlay
   */
  private createInstanceKey(tokenId: string, overlayTypeId: string): string {
    return `${tokenId}${OverlayRenderingService.CONFIG.INSTANCE_KEY_SEPARATOR}${overlayTypeId}`;
  }

  /**
   * Find all overlay keys for a token
   */
  private findTokenOverlayKeys(tokenId: string): string[] {
    const prefix = `${tokenId}${OverlayRenderingService.CONFIG.INSTANCE_KEY_SEPARATOR}`;
    return Array.from(this.overlayInstances.keys()).filter(key => key.startsWith(prefix));
  }

  /**
   * Find all overlay keys of a specific type
   */
  private findOverlayTypeKeys(overlayTypeId: string): string[] {
    const suffix = `${OverlayRenderingService.CONFIG.INSTANCE_KEY_SEPARATOR}${overlayTypeId}`;
    return Array.from(this.overlayInstances.keys()).filter(key => key.endsWith(suffix));
  }

  // Validation Methods

  /**
   * Validate canvas is available
   */
  private validateCanvas(): void {
    if (!canvas) {
      throw new Error('Canvas not available');
    }
    
    if (!canvas.stage) {
      throw new Error('Canvas stage not available');
    }
  }

  /**
   * Validate service is initialised
   */
  private validateInitialised(): void {
    if (!this.isInitialised) {
      throw new Error('Overlay service not initialised');
    }
    
    // Double-check we have at least one container
    if (!this.layerContainers.size) {
      this.logger.error('Service marked as initialised but no layer containers exist');
      throw new Error('Overlay service has no layer containers');
    }
  }

  /**
   * Validate overlay type is registered
   */
  private validateOverlayType(overlayTypeId: string): void {
    if (!this.overlayRegistry.get(overlayTypeId)) {
      throw new Error(`Overlay type not registered: ${overlayTypeId}`);
    }
    
    if (!this.renderers.has(overlayTypeId)) {
      throw new Error(`No renderer available for overlay type: ${overlayTypeId}`);
    }
  }
}