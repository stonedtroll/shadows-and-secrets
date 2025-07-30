/**
 * Events that originate from Foundry VTT hooks and system interactions.
 * These are low-level events that capture raw Foundry state changes.
 * All infrastructure events use colon notation (e.g., token:update).
 */
import type { DispositionValue } from '../../domain/constants/TokenDisposition.js';
import type { AbstractActorAdapter } from '../../application/adapters/AbstractActorAdapter.js';
import type { AbstractTokenAdapter } from '../../application/adapters/AbstractTokenAdapter.js';

// Canvas Events
export interface CanvasInitEvent {
  canvas: Canvas;
}

export interface CanvasReadyEvent {
  canvas: Canvas;
}

export interface CanvasTeardownEvent {
  canvas: Canvas;
}

export interface CanvasPanEvent {
  position: { x: number; y: number; scale: number };
}

export interface TokensReadyEvent {
  placeableTokens: TokenState[];
  user: {
    id: string;
    colour: string;
    isGM: boolean;
  }
}

// Token Events
export interface TokenControlEvent {
  tokenId: string;
  controlled: boolean;
}

export interface TokenState {
  // Core identification
  id: string;
  name: string;

  // Position and dimensions
  x: number;
  y: number;
  rotation: number;
  elevation: number;
  width: number;
  height: number;
  scale: number;

  // Visibility and control
  hidden: boolean;
  visible: boolean;
  controlled: boolean;
  ownedByCurrentUser: boolean;

  // Game mechanics
  disposition: DispositionValue;
}

export interface ActorInfo {
  movementModes: MovementMode[];
  canHover: boolean;
  currentAction: MovementActionType;
}

export interface MovementMode {
  type: BasicMovementType;
  units: string;
  speed: number;
}

export type MovementActionType = 'walk' | 'climb' | 'fly' | 'swim' | 'burrow' | 'hover';
export type BasicMovementType = 'walk' | 'climb' | 'fly' | 'swim' | 'burrow';

export interface TokenPreUpdateEvent {
  tokenId: string;
  tokenName: string;
  currentState: TokenState;
  proposedState: Partial<TokenState>;
  updateOptions: {
    animate: boolean;
    isUndo: boolean;
    noHook: boolean;
    diff: boolean;
    recursive: boolean;
    render?: {
      renderSheet: boolean;
      renderFlags: Record<string, any>;
    };
  };
  userId: string;
}

export interface TokenUpdateEvent {
  timestamp: number;
  allTokenAdapters: AbstractTokenAdapter[];
  updatingTokenAdapter: AbstractTokenAdapter;
  changes: Partial<TokenState>;
  updateOptions: {
    animate: boolean;
    isUndo: boolean;
    noHook: boolean;
    diff: boolean;
    recursive: boolean;
    render?: {
      renderSheet: boolean;
      renderFlags: Record<string, any>;
    };
  };
  user: {
    id: string;
    colour: string;
    isGM: boolean;
  };
  isUnconstrainedMovement: boolean;
}

export interface TokenRefreshEvent {
  token: Token;
  flags: Record<string, any>;
}

export interface TokenCreateEvent {
  token: Token;
}

export interface TokenDeleteEvent {
  documentId: string;
  userId: string;
}

export interface TokenCreateEvent {
  tokenId: string;
}

// Token Drag Events
export interface TokenDragStartEvent {
  timestamp: number;
  allTokenAdapters: AbstractTokenAdapter[];
  dragStartTokenAdaptor: AbstractTokenAdapter;
  previewTokenAdapter: AbstractTokenAdapter;
  ownedByCurrentUserActorAdapters: AbstractActorAdapter[];
  user: {
    id: string;
    colour: string;
    isGM: boolean;
  }
}

export interface TokenDragMoveEvent {
  timestamp: number;
  allTokenAdapters: AbstractTokenAdapter[];
  dragStartTokenAdaptor: AbstractTokenAdapter;
  previewTokenAdapter: AbstractTokenAdapter;
  ownedByCurrentUserActorAdapters: AbstractActorAdapter[];
  user: {
    id: string;
    colour: string;
    isGM: boolean;
  }
}

export interface TokenDragEndEvent {
  id: string;
  position: { x: number; y: number };
  worldPosition: { x: number; y: number };
  screenPosition: { x: number; y: number };
  totalDelta: { x: number; y: number };
  prevented: boolean;
}

export interface TokenDragCancelEvent {
  id: string;
  position: { x: number; y: number };
  reason: string;
}

// Token Hover Events
export interface TokenHoverEvent {
  tokenId: string;
  token: TokenState;
  userId: string;
}

export interface TokenHoverEndEvent {
  tokenId: string;
  token: TokenState;
  userId: string;
}

// Scene Events
export interface ScenePreUpdateEvent {
  sceneId: string;
  sceneName: string;
  currentState: {
    width: number;
    height: number;
    gridSize: number;
  };
  proposedChanges: Record<string, any>;
  updateOptions: Record<string, any>;
  userId: string;
}

export interface SceneUpdateEvent {
  sceneId: string;
  sceneName: string;
  changes: Record<string, any>;
  updateOptions: Record<string, any>;
  userId: string;
}

// Wall Events
export interface WallUpdateEvent {
  type: 'create' | 'update' | 'delete';
  wallId: string;
  wallData: {
    c: number[];
    move: number;
    sense: number;
    dir: number;
    door: number;
    ds: number;
    flags: Record<string, any>;
  };
  changes?: Record<string, any>;
  userId: string;
}

// Keyboard Events
export interface KeyboardKeyDownEvent {
  key: string;
  code: string;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta?: boolean;
  };
  timestamp: number;
  allTokenAdapters: AbstractTokenAdapter[];
  ownedByCurrentUserActorAdapters: AbstractActorAdapter[];
  user: {
    id: string;
    colour: string;
    isGM: boolean;
  }
}

export interface KeyboardKeyUpEvent {
  key: string;
  code: string;
  modifiers?: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta?: boolean;
  };
  timestamp?: number;
  user: {
    id: string;
    colour: string;
    isGM: boolean;
  }
}

export interface MovementValidationRequest {
  correlationId?: string;
  tokenId: string;
  currentPosition: { x: number; y: number };
  proposedPosition: { x: number; y: number };
  userId: string;
  timestamp: number;
}

export interface MovementValidationResponse {
  correlationId?: string;
  approved: boolean;
  reason?: string;
  modifiedPosition?: { x: number; y: number };
}

// Settings Events
export interface SettingsCloseEvent {
}

export interface ActorCreateEvent {
  actorId: string;
}

export interface ActorDeleteEvent {
  actorId: string;
}

export interface ActorUpdateEvent {
  actorId: string;
  changes: Partial<AbstractActorAdapter>;
  options: any;
}