import type { Token } from '../entities/Token.js';
import { OverlayDefinition } from './OverlayDefinition.js';
import type { OverlayRenderContext } from './OverlayRenderContext.js';

/**
 * Interface for building overlay-specific render contexts.
 */
export interface OverlayContextBuilder<TOptions = any> {
  buildContext(targetToken: Token, overlayDefinition: OverlayDefinition, options: TOptions): OverlayRenderContext;
}