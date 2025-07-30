/**
 * Complete Event Map
 * 
 * Central registry of all events that flow through the EventBus.
 * Combines infrastructure events (from Foundry), domain events (business logic),
 * and application events (service coordination).
 * 
 * Naming conventions:
 * - Infrastructure events: colon notation (e.g., token:update)
 * - Domain events: dot notation (e.g., token.moved)
 * - Application events: colon notation (e.g., application:ready)
 */

import type {
  // Infrastructure events
  ActorCreateEvent,
  ActorDeleteEvent,
  ActorUpdateEvent,
  CanvasInitEvent,
  CanvasReadyEvent,
  CanvasTeardownEvent,
  CanvasPanEvent,
  TokenControlEvent,
  TokenPreUpdateEvent,
  TokenUpdateEvent,
  TokenRefreshEvent,
  TokenCreateEvent,
  TokenDeleteEvent,
  TokenDragStartEvent,
  TokenDragMoveEvent,
  TokenDragEndEvent,
  TokenDragCancelEvent,
  TokenHoverEvent,
  TokenHoverEndEvent,
  TokensReadyEvent,
  ScenePreUpdateEvent,
  SceneUpdateEvent,
  WallUpdateEvent,
  KeyboardKeyDownEvent,
  KeyboardKeyUpEvent,
  SettingsCloseEvent
} from './FoundryEvents.js';

import type {
  // Domain events
  ApplicationReadyEvent,
  ApplicationTeardownEvent,
  TokenMovingEvent,
  TokenMovedEvent,
  TokenRotatingEvent,
  TokenRotatedEvent,
  TokenElevationChangedEvent,
  TokenBlockedEvent,
  TokenAutoRotationSuggestedEvent,
  OverlayRegisteredEvent,
  OverlayRenderedEvent,
  OverlayClearedEvent,
  OverlayVisibilityChangedEvent,
  OverlayRenderRequiredEvent,
  CommandExecutedEvent,
  CommandUndoneEvent,
  CommandRedoneEvent,
  BatchMoveEvent,
  CollisionDetectedEvent,
  KeyPressedEvent,
  KeyReleasedEvent
} from './DomainEvents.js';

export interface EventMap {
  // === Infrastructure Events (from Foundry hooks) ===
  // Actor lifecycle
  'actor:create': ActorCreateEvent;
  'actor:delete': ActorDeleteEvent; 
  'actor:update': ActorUpdateEvent;
  
  // Canvas lifecycle
  'canvas:init': CanvasInitEvent;
  'canvas:ready': CanvasReadyEvent;
  'canvas:teardown': CanvasTeardownEvent;
  'canvas:pan': CanvasPanEvent;

  // Token lifecycle
  'token:control': TokenControlEvent;
  'token:preUpdate': TokenPreUpdateEvent;
  'token:update': TokenUpdateEvent;
  'token:refresh': TokenRefreshEvent;
  'token:create': TokenCreateEvent;
  'token:delete': TokenDeleteEvent;

  // Token interaction
  'token:dragStart': TokenDragStartEvent;
  'token:dragMove': TokenDragMoveEvent;
  'token:dragEnd': TokenDragEndEvent;
  'token:dragCancel': TokenDragCancelEvent;
  'token:hover': TokenHoverEvent;
  'token:hoverEnd': TokenHoverEndEvent;

  // Scene management
  'scene:preUpdate': ScenePreUpdateEvent;
  'scene:update': SceneUpdateEvent;

  // System events
  'wall:update': WallUpdateEvent;
  'settings:close': SettingsCloseEvent;
  'keyboard:keyDown': KeyboardKeyDownEvent;
  'keyboard:keyUp': KeyboardKeyUpEvent;

  // === Domain Events (business logic) ===
  
  // Application lifecycle
  'application.ready': ApplicationReadyEvent;
  'application.teardown': ApplicationTeardownEvent;

  // Token state changes
  'token.moving': TokenMovingEvent;
  'token.moved': TokenMovedEvent;
  'token.rotating': TokenRotatingEvent;
  'token.rotated': TokenRotatedEvent;
  'token.elevationChanged': TokenElevationChangedEvent;
  'token.blocked': TokenBlockedEvent;
  'token.autoRotationSuggested': TokenAutoRotationSuggestedEvent;

  // Overlay management
  'overlay.registered': OverlayRegisteredEvent;
  'overlay.rendered': OverlayRenderedEvent;
  'overlay.cleared': OverlayClearedEvent;
  'overlay.visibilityChanged': OverlayVisibilityChangedEvent;
  'overlay.renderRequired': OverlayRenderRequiredEvent;

  // Command pattern
  'command.executed': CommandExecutedEvent;
  'command.undone': CommandUndoneEvent;
  'command.redone': CommandRedoneEvent;

  // Batch operations
  'tokens.batch.moved': BatchMoveEvent;

  // Collision detection
  'collision.detected': CollisionDetectedEvent;

  // Input handling
  'key.pressed': KeyPressedEvent;
  'key.released': KeyReleasedEvent;

  // === Application Events (service coordination) ===
  
  // Service lifecycle
  'services:refresh': void;
  'services:tearDown': void;
  'movement:initialised': void;
  'collision:initialised': void;
  'overlay:initialised': void;

  'tokens:ready': TokensReadyEvent;

  // Overlay coordination
  'overlays:refresh': void;
  'overlay:cycle': { timestamp: number };
  
  // Batch coordination
  'tokens:batch:undone': { tokenIds: string[] };
}

export type ModuleEventKey = keyof EventMap;
export type ModuleEventData<K extends ModuleEventKey> = EventMap[K];