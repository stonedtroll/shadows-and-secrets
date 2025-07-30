import type { Token } from '../entities/Token.js';
import { OverlayDefinition } from './OverlayDefinition.js';
import type { OverlayRenderContext } from './OverlayRenderContext.js';

export interface BaseContextOptions {
  isGM?: boolean;
  userColour?: string;
}

/**
 * Interface for building overlay-specific render contexts.
 */
export interface OverlayContextBuilder<TOptions extends BaseContextOptions = BaseContextOptions> {
  buildContext(targetToken: Token, overlayDefinition: OverlayDefinition, options: TOptions): OverlayRenderContext;
}