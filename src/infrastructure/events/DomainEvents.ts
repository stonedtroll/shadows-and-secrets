/**
 * Domain Events
 * 
 * Business logic events that represent meaningful state changes in the domain.
 * These events are emitted after processing infrastructure events and applying business rules.
 * All domain events use dot notation (e.g., token.moved).
 */

// Application Lifecycle Events
export interface ApplicationReadyEvent {
  timestamp: number;
}

export interface ApplicationTeardownEvent {
  timestamp: number;
}

// Token Movement Events
export interface TokenMovingEvent {
  tokenId: string;
  currentX: number;
  currentY: number;
  proposedX: number;
  proposedY: number;
  userId: string;
}

export interface TokenMovedEvent {
  tokenId: string;
  tokenName: string;
  fromPosition: { x: number; y: number }; 
  toPosition: { x: number; y: number };
  distance: number;
  isSnapped: boolean;
  snapTarget?: { id: string; name: string } | undefined;
}

// Token Rotation Events
export interface TokenRotatingEvent {
  tokenId: string;
  currentRotation: number;
  proposedRotation: number;
  userId: string;
}

export interface TokenRotatedEvent {
  tokenId: string;
  currentRotation: number;
  changedRotation: number;
  newRotation: number;
  userId: string;
}

// Token Elevation Events
export interface TokenElevationChangedEvent {
  tokenId: string;
  oldElevation: number;
  newElevation: number;
  userId: string;
}

// Token Constraint Events
export interface TokenBlockedEvent {
  tokenId: string;
  reason: 'collision' | 'permission' | 'boundary';
  details?: any;
}

// Token Auto-rotation Events
export interface TokenAutoRotationSuggestedEvent {
  tokenId: string;
  currentRotation: number;
  suggestedRotation: number;
  source: 'movement' | 'manual' | 'ai';
}

// Overlay Events
export interface OverlayRegisteredEvent {
  overlayId: string;
  renderTriggers: string[];
  timestamp: number;
}

export interface OverlayRenderedEvent {
  overlayId: string;
  tokenId: string;
  userId: string;
  timestamp: number;
}

export interface OverlayClearedEvent {
  overlayId: string;
  tokenId: string;
  userId: string;
  timestamp: number;
}

export interface OverlayVisibilityChangedEvent {
  overlayId: string;
  visible: boolean;
  userId: string;
  timestamp: number;
}

export interface OverlayRenderRequiredEvent {
  overlayId: string;
  tokenId: string;
  context: any;
}

// Command Pattern Events
export interface CommandExecutedEvent {
  commandType: string;
  commandId: string;
  canUndo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  timestamp: number;
}

export interface CommandUndoneEvent {
  commandType: string;
  commandId: string;
  canUndo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  timestamp: number;
}

export interface CommandRedoneEvent {
  commandType: string;
  commandId: string;
  canUndo: boolean;
  undoStackSize: number;
  redoStackSize: number;
  timestamp: number;
}

// Batch Operation Events
export interface BatchMoveEvent {
  batchId: string;
  tokenIds: string[];
  movements: Array<{
    tokenId: string;
    oldX: number;
    oldY: number;
    newX: number;
    newY: number;
  }>;
  userId: string;
  timestamp: number;
}

// Collision Events
export interface CollisionDetectedEvent {
  tokenId: string;
  collidingWith: string[];
  position: { x: number; y: number };
  timestamp: number;
}

// Key Events (processed from keyboard events)
export interface KeyPressedEvent {
  key: string;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  timestamp: number;
}

export interface KeyReleasedEvent {
  key: string;
  modifiers: {
    shift: boolean;
    ctrl: boolean;
    alt: boolean;
    meta: boolean;
  };
  timestamp: number;
}