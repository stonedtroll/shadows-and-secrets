export class Scaler {
  private static readonly BASE_GRID_SIZE = 50; // Design baseline in pixels
  private static scaleFactorCache = new WeakMap<Scene, number>();

  static getScaleFactor(scene?: Scene): number {
    const currentScene = scene ?? canvas?.scene;
    if (!currentScene) return 1;
    
    let scaleFactor = this.scaleFactorCache.get(currentScene);
    if (scaleFactor !== undefined) return scaleFactor;

    const gridSize = currentScene.grid.size;
    scaleFactor = gridSize / this.BASE_GRID_SIZE;
    this.scaleFactorCache.set(currentScene, scaleFactor);
    
    return scaleFactor;
  }

  static invalidateScene(scene: Scene): void {
    this.scaleFactorCache.delete(scene);
  }
  
  static scalePoint(point: { x: number; y: number }, scene?: Scene): { x: number; y: number } {
    const factor = this.getScaleFactor(scene);
    return {
      x: point.x * factor,
      y: point.y * factor
    };
  }
  
  static scaleDimensions(
    dimensions: { width: number; height: number }, 
    scene?: Scene
  ): { width: number; height: number } {
    const factor = this.getScaleFactor(scene);
    return {
      width: dimensions.width * factor,
      height: dimensions.height * factor
    };
  }

  static scaleLinear(baseValue: number, scene?: Scene): number {
    return baseValue * this.getScaleFactor(scene);
  }

  static scaleStepped(baseValue: number, scene?: Scene): number {
    const scaleFactor = this.getScaleFactor(scene);
    const steps = [0.5, 0.75, 1, 1.5, 2, 3, 4];
    const closest = steps.reduce((prev, curr) => 
      Math.abs(curr - scaleFactor) < Math.abs(prev - scaleFactor) ? curr : prev
    );

    return baseValue * closest;
  }
  
  static clampedScale(
    baseValue: number, 
    scene?: Scene, 
    min: number = 0.5, 
    max: number = 2
  ): number {
    const scaleFactor = Math.max(min, Math.min(max, this.getScaleFactor(scene)));

    return baseValue * scaleFactor;
  }
  

  static scaleLogarithmic(baseValue: number, scene?: Scene): number {
    const scaleFactor = 1 + Math.log2(this.getScaleFactor(scene));
    
    return baseValue * Math.max(0.5, scaleFactor);
  }
}