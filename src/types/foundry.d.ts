// Foundry VTT type definitions - ONLY fixes for genuine shortcomings in @league-of-foundry-developers/foundry-vtt-types
// Based on https://foundryvtt.com/api/modules.html
import '@league-of-foundry-developers/foundry-vtt-types';

declare global {
  const game: Game;
  const CONFIG: Config;

  interface Math {
    toRadians(degrees: number): number;
    toDegrees(radians: number): number;
  }

  namespace PIXI {
    export type Container = any & {
      name?: string | null;
      eventMode?: string;
    };
    
    export interface Point {
      x: number;
      y: number;
    }
    
    export interface Rectangle {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  }

  interface TokenDocument {
    id: string;
    name?: string;
    x: number;
    y: number;
    elevation?: number;
    flags?: {
      [scope: string]: {
        [key: string]: any;
      } | undefined;
    };
  }

  interface WallDocument {
    id: string;
    flags?: {
      [scope: string]: {
        [key: string]: any;
      } | undefined;
    };
  }

  interface TileDocument {
    id: string;
    flags?: {
      [scope: string]: {
        [key: string]: any;
      } | undefined;
    };
  }

  interface Scene {
    id: string;
    name?: string;
  }

  interface Combat {
    id: string;
    name?: string;
  }

  interface Token extends PlaceableObject {

    get center(): PIXI.Point;
    get bounds(): PIXI.Rectangle;

    name: string;
    w: number;
    h: number;
    width: number;
    height: number;
    visible: boolean
    x: number;
    y: number;
    mouseInteractionManager?: {
      isDragging: boolean;
      [key: string]: any;
    };
  }

  namespace foundry {
    namespace canvas {
      namespace geometry {
        class Ray {
          constructor(origin: { x: number; y: number }, destination: { x: number; y: number });
        }
      }

      namespace placeables {
        const Token: typeof globalThis.Token;
      }
    }
  }
}

export { };
