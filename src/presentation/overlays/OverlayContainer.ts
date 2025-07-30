/**
 * Main container for all overlay graphics
 * This container is added to the canvas primary group
 */
export class OverlayContainer extends PIXI.Container {
  constructor() {
    super();
    
    // Set the name for easier debugging
    this.name = 'ShadowsAndSecretsOverlays';

    // Ensure the container doesn't interfere with positioning
    this.position.set(0, 0);
    this.scale.set(1, 1);
    
    // Enable sorting for proper layering
    this.sortableChildren = true;
    
    // Ensure visibility
    this.visible = true;
    this.renderable = true;
    
    // Use PIXI v7 eventMode instead of deprecated interactive
    this.eventMode = 'none';
  }
  
  /**
   * Override updateTransform to ensure we don't accumulate unwanted transforms
   */
  updateTransform(): void {
    // Reset position to ensure we stay at origin
    if (this.position.x !== 0 || this.position.y !== 0) {
      this.position.set(0, 0);
    }
    
    // Reset scale to ensure we stay at 1:1
    if (this.scale.x !== 1 || this.scale.y !== 1) {
      this.scale.set(1, 1);
    }
    
    super.updateTransform();
  }
}
