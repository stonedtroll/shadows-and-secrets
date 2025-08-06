/**
 * Defines the context data structure passed to overlay rendering functions. This interface provides
 * information about the rendering environment, token state, and various contextual
 * data needed for dynamic overlay visualisation.
 */

import { MovementTypes } from "../value-objects/Speed";

/**
 * Token information for overlay rendering.
 */
interface TokenInfo {

  id: string;
  name: string;
  type?: string;
  position: { x: number; y: number };
  centre: { x: number; y: number };
  width: number;
  height: number;
  radius: number;
  currentMovementMode?: MovementTypes | null;
}

/**
 * Rotation context for rotation-based overlays.
 */
interface RotationContext {

  currentRotation: number;
  proposedRotation?: number;
  newRotation?: number;
  deltaRotation?: number;
  isClockwise?: boolean;
  isSnapped: boolean;
  snappedSegment?: number;
  arcColour: string;
  arcAngle: number;
}

/**
 * Boundary visualisation context.
 */
interface BoundaryContext {

  borderLineWidth: number;
  borderColour: string;
  borderOpacity: number;
  borderRadius: number;
  fillColour: string;
  fillOpacity: number;
  fillRadius: number;
  boundaryStyle: 'circle' | 'square' | 'hex';
  dashed: boolean;
  dashLength: number;
  gapLength: number;
}

interface ObstacleContext {

  imagePath: string;
  opacity: number;
  tintColour: string;
  rotation: number;
  blendMode: string;
  width: number;
  height: number;
  maintainAspectRatio: boolean;
}

/**
 * Movement context for movement-based overlays.
 */
interface MovementContext {

  from: { x: number; y: number };
  to: { x: number; y: number };
  path?: { x: number; y: number }[];
  distance: number;
}

/**
 * Visibility context for visibility-based overlays.
 */
interface VisibilityContext {

  wasVisible: boolean;
  isVisible: boolean;
}

interface ActorInfoContext {

  speeds: SpeedContext[];
  weaponRanges: WeaponRangeContext[];
}

interface TokenInfoContext {

  trackingReferenceNumber: string;
}

interface SpeedContext {

  icon: string;
  label: string;
}

interface HealthInfoContext {

  healthArcStartAngle: number;
  healthArcEndAngle: number;
  healthPercentage: number;
  lowHealthArcColour: string;
  midHealthArcColour: string;
  highHealthArcColour: string;
  tempHealthArcStartAngle: number;
  tempHealthArcEndAngle: number;
  tempHealthPercentage: number;
  tempHealthArcColour: string;
  backgroundStartAngle: number;
  backgroundEndAngle: number;
  backgroundColour: string;
  arcRadius: number;
  arcWidth: number;
  anticlockwise: boolean;
}

interface WeaponRangeContext {

  name: string;
  icon: string;
  effectiveRange: string;
  minimumRange: string;
  maximumRange: string;
  range: string | null;
  units: string;
}

interface UserInfo {

  id?: string;
  colour?: string;
  isGM?: boolean;
}

/**
 * Render priority levels.
 */
type RenderPriority = 'low' | 'normal' | 'high';

/**
 * Render target types.
 */
export type RenderLayer = 'primary' | 'tokens' | 'drawings';

/**
 * Context data passed to overlay render functions.
 * Provides information about the rendering environment
 * and token state for dynamic overlay visualisation.
 */
export interface OverlayRenderContext {

  overlayTypeId: string;
  overlayCentre: { x: number; y: number };
  renderLayer: RenderLayer;
  zIndex?: number;
  renderOnTokenMesh: boolean;
  token: TokenInfo;
  styling?: {
    [key: string]: {
      font: string;
      fontSize: number;
      fontColour: string;
      fontWeight: string;
      fontOpacity: number;
      backgroundColour?: string;
      backgroundOpacity?: number;
    };
  };
  actorInfo?: ActorInfoContext;
  tokenInfo?: TokenInfoContext;
  rotation?: RotationContext;
  boundary?: BoundaryContext;
  obstacle?: ObstacleContext;
  movement?: MovementContext;
  healthInfo?: HealthInfoContext;
  visibility?: VisibilityContext;
  user?: UserInfo;
  isPreview?: boolean;
  animate?: boolean;
  priority?: RenderPriority;
}