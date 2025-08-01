/**
 * This module provides centralised utility functions for overlay coordination.
 * It manages the orchestration of overlay rendering, tracking, and lifecycle management
 * across multiple tokens and overlay types.
 */

import type { OverlayRenderingService } from '../../../presentation/services/OverlayRenderingService.js';
import type { OverlayDefinition, TargetScope, OverlayTriggers } from '../../../domain/interfaces/OverlayDefinition.js';
import type { OverlayRenderContext } from '../../../domain/interfaces/OverlayRenderContext.js';
import type { FoundryLogger } from '../../../../lib/log4foundry/log4foundry.js';
import type { OverlayContextBuilderRegistry } from '../../registries/OverlayContextBuilderRegistry.js';
import type { OverlayContextBuilder } from '../../../domain/interfaces/OverlayContextBuilder.js';

import { Token } from '../../../domain/entities/Token.js';
import { LoggerFactory } from '../../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../../config.js';
import { HealthObfuscator } from '../../../domain/services/HealthObfuscator.js';
import { DISPOSITION } from '../../../domain/constants/TokenDisposition.js';
import { TokenRepository } from '../../../infrastructure/repositories/TokenRepository.js'; 

export class OverlayCoordinatorHelper {
    private readonly logger: FoundryLogger;
    private readonly renderedOverlays = new Map<string, Set<string>>();
    private readonly healthObfuscator: HealthObfuscator;

    constructor(
        private readonly overlayRenderer: OverlayRenderingService,
    ) {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.OverlayCoordinatorHelper`);
        this.healthObfuscator = new HealthObfuscator();
    }

    // Public API - Overlay Processing

    /**
     * Processes overlays grouped by their target scope and renders them.
     * 
     * This is the main entry point for rendering overlays. It groups overlays
     * by scope, determines target tokens for each scope, and renders the
     * appropriate overlays on each token.
     */
    async processOverlaysByScope(
        overlays: OverlayDefinition[],
        contextBuilderRegistry: OverlayContextBuilderRegistry,
        triggerType?: keyof OverlayTriggers,
        previewToken?: Token
    ): Promise<Array<{ targetTokens: Token[], overlays: OverlayDefinition[] }>> {
        const overlayGroups = this.groupOverlaysByTargetScope(overlays, triggerType);
        const processedGroups: Array<{ targetTokens: Token[], overlays: OverlayDefinition[] }> = [];
        const tokenRepository = new TokenRepository();
        const allTokens = tokenRepository.getAll();

        for (const [targetScope, scopeOverlays] of overlayGroups.entries()) {
            const targetTokens = this.getTargetTokens(
                allTokens,
                targetScope as TargetScope,
                previewToken
            );

            if (targetTokens.length === 0) {
                continue;
            }

            const preparedOverlays = this.prepareOverlaysWithContextBuilders(
                scopeOverlays,
                contextBuilderRegistry
            );

            let sourceToken: Token | undefined;
            if (previewToken) {
                sourceToken = previewToken;
            } else {
                sourceToken = allTokens.find(token => token.isControlledByCurrentUser);
            }

            await this.requestOverlayRendering(
                targetTokens,
                preparedOverlays,
                (overlayId, targetToken) =>
                    this.buildContextForOverlay(
                        overlayId,
                        targetToken,
                        preparedOverlays,
                        contextBuilderRegistry,
                        sourceToken
                    )
            );

            processedGroups.push({
                targetTokens,
                overlays: scopeOverlays
            });
        }

        return processedGroups;
    }

    // Public API - Token Filtering

    /**
     * Gets target tokens based on the specified scope.
     */
    getTargetTokens(
        allTokens: Token[],
        targetScope: TargetScope,
        previewToken?: Token
    ): Token[] {
        const targetTokens = this.determineTargetTokens(
            allTokens,
            targetScope,
            previewToken,
        );

        this.logger.debug('Tokens categorised for overlay rendering', {
            targetCount: targetTokens.length,
            targetingScope: targetScope
        });

        return targetTokens;
    }

    // Public API - Overlay Lifecycle Management

    /**
     * Hides all tracked overlays across all tokens.
     * Clears the tracking state after hiding.
     */
    async hideAllTrackedOverlays(): Promise<void> {
        const overlayCount = this.renderedOverlays.size;

        this.logger.debug('Hiding all tracked overlays', { overlayCount });

        const overlayTypes = this.getAllTrackedOverlayTypes();

        for (const overlayTypeId of overlayTypes) {
            this.overlayRenderer.hideAllOverlaysOfType(overlayTypeId);
        }

        this.renderedOverlays.clear();
    }

    /**
     * Hides overlays for specific tokens.
     */
    async hideOverlaysForTokens(tokenIds: string[]): Promise<void> {
        this.logger.debug('Hiding overlays for tokens', { tokenIds });

        for (const tokenId of tokenIds) {
            const overlayIds = this.renderedOverlays.get(tokenId);

            if (!overlayIds) {
                continue;
            }

            for (const overlayId of overlayIds) {
                this.overlayRenderer.hideTokenOverlay(overlayId, tokenId);
            }

            this.renderedOverlays.delete(tokenId);
        }
    }

    // Public API - Tracking State

    /**
     * Gets tracked overlay IDs for a specific token.
     */
    getTrackedOverlays(tokenId: string): Set<string> {
        return this.renderedOverlays.get(tokenId) || new Set();
    }

    /**
     * Gets all unique overlay types currently tracked.
     */
    getAllTrackedOverlayTypes(): Set<string> {
        const overlayTypes = new Set<string>();

        for (const overlayIds of this.renderedOverlays.values()) {
            overlayIds.forEach(id => overlayTypes.add(id));
        }

        return overlayTypes;
    }

    /**
     * Clears all overlay tracking without hiding overlays.
     * Use with caution - overlays will remain rendered but untracked.
     */
    clearTracking(): void {
        this.logger.debug('Clearing overlay tracking', {
            tokenCount: this.renderedOverlays.size
        });

        this.renderedOverlays.clear();
    }

    /**
     * Gets the current render tracking state.
     */
    getRenderTrackingState(): Array<{ tokenId: string; overlayIds: string[] }> {
        return Array.from(this.renderedOverlays.entries()).map(([tokenId, overlayIds]) => ({
            tokenId,
            overlayIds: Array.from(overlayIds)
        }));
    }

    // Public API - Context Building

    /**
     * Prepares overlays with their context builders.
     */
    prepareOverlaysWithContextBuilders(
        overlays: OverlayDefinition[],
        contextBuilderRegistry: OverlayContextBuilderRegistry
    ): OverlayDefinition[] {
        return overlays.map(overlay => {

            if (!overlay.contextBuilder) {
                const builder = this.getContextBuilder(overlay, contextBuilderRegistry);
                if (builder) {
                    return { ...overlay, contextBuilder: builder };
                }
                this.logger.warn(`Overlay ${overlay.id} does not have a context builder defined`);
            }
            return overlay;
        }).filter(overlay => overlay.contextBuilder);
    }

    /**
     * Builds the render context for a specific overlay.
     */
    buildContextForOverlay(
        overlayId: string,
        targetToken: Token,
        overlaysWithBuilders: OverlayDefinition[],
        contextBuilderRegistry: OverlayContextBuilderRegistry,
        sourceToken?: Token
    ): OverlayRenderContext {
        const overlay = overlaysWithBuilders.find(o => o.id === overlayId);

        if (!overlay) {
            throw new Error(`Overlay definition not found for ${overlayId}`);
        }

        const contextBuilder = overlay.contextBuilder ||
            this.getContextBuilder(overlay, contextBuilderRegistry);

        if (!contextBuilder) {
            throw new Error(`No context builder found for overlay ${overlayId}`);
        }

        const contextOptions = this.buildContextOptions(
            overlayId,
            targetToken,
            sourceToken
        );

        return contextBuilder.buildContext(targetToken, overlay, contextOptions);
    }

    // Public API - Rendering

    /**
     * Requests overlay rendering on specified tokens.
     */
    async requestOverlayRendering(
        targetTokens: Token[],
        matchingOverlays: OverlayDefinition[],
        contextBuilder: (overlayId: string, token: Token) => OverlayRenderContext
    ): Promise<void> {
        // Process each target token
        for (const targetToken of targetTokens) {
            await this.renderOverlaysOnToken(
                targetToken,
                matchingOverlays,
                contextBuilder
            );
        }
    }

    // Private Methods - Overlay Grouping

    /**
     * Groups overlays by their target scope.
     */
    private groupOverlaysByTargetScope(
        overlays: OverlayDefinition[],
        triggerType?: Extract<keyof OverlayTriggers, string>
    ): Map<string, OverlayDefinition[]> {
        const groups = new Map<string, OverlayDefinition[]>();

        for (const overlay of overlays) {
            let scope: TargetScope = 'all'; // Default fallback scope

            if (triggerType && overlay.triggers && triggerType in overlay.triggers) {
                const trigger = overlay.triggers[triggerType];

                if (trigger && typeof trigger === 'object' && 'scope' in trigger && trigger.scope) {
                    scope = trigger.scope;
                }
            }

            if (!groups.has(scope)) {
                groups.set(scope, []);
            }

            groups.get(scope)!.push(overlay);
        }

        this.logger.debug('Overlays grouped by scope', {
            triggerType,
            groups: Array.from(groups.entries()).map(([scope, overlays]) => ({
                scope,
                overlayIds: overlays.map(o => o.id),
                count: overlays.length
            }))
        });

        return groups;
    }

    // Private Methods - Token Filtering

    /**
     * Determines target tokens based on scope criteria.
     */
    private determineTargetTokens(
        allTokens: Token[],
        targetScope: TargetScope,
        previewToken?: Token
    ): Token[] {
        this.logger.debug('Determining target tokens', {
            scope: targetScope,
            totalTokens: allTokens.length,
            hasPreview: !!previewToken
        });

        let filteredTokens: Token[];

        switch (targetScope) {
            case 'visible':
                filteredTokens = allTokens.filter(token => token.visible);
                break;

            case 'visible-and-not-hidden':
                filteredTokens = allTokens.filter(token => token.visible && !token.hidden);
                break;

            case 'controlled':
                filteredTokens = allTokens.filter(token => token.isControlledByCurrentUser);
                break;

            case 'owned':
                filteredTokens = allTokens.filter(token =>
                    token.isOwnedByCurrentUser && token.visible && !token.hidden
                );
                break;

            case 'all':
                filteredTokens = allTokens;
                break;

            case 'non-controlled':
                filteredTokens = allTokens.filter(token => token.visible && !token.hidden && !token.isControlledByCurrentUser);
                break;

            case 'preview':
                if (previewToken) {
                    filteredTokens = [previewToken];
                } else {
                    this.logger.warn('Preview token requested but none provided');
                    filteredTokens = [];
                }
                break;

            default:
                this.logger.warn(`Unknown target scope: ${targetScope}, defaulting to visible`);
                filteredTokens = allTokens.filter(token => token.visible);
        }

        this.logger.debug('Tokens filtered by scope', {
            scope: targetScope,
            originalCount: allTokens.length,
            filteredCount: filteredTokens.length
        });

        return filteredTokens;
    }

    // Private Methods - Rendering

    /**
     * Renders overlays on a specific token.
     */
    private async renderOverlaysOnToken(
        targetToken: Token,
        overlays: OverlayDefinition[],
        contextBuilder: (overlayId: string, token: Token) => OverlayRenderContext
    ): Promise<void> {
        for (const overlay of overlays) {
            const context = contextBuilder(overlay.id, targetToken);

            this.logger.debug(`Rendering overlay ${overlay.id} on token ${targetToken.name}`, {
                overlayId: overlay.id,
                tokenId: targetToken.id,
                tokenName: targetToken.name
            });

            this.overlayRenderer.renderTokenOverlay(context);
            this.trackRenderedOverlay(targetToken.id, overlay.id);
        }
    }

    /**
     * Tracks a rendered overlay for lifecycle management.
     */
    private trackRenderedOverlay(tokenId: string, overlayId: string): void {
        if (!this.renderedOverlays.has(tokenId)) {
            this.renderedOverlays.set(tokenId, new Set());
        }

        this.renderedOverlays.get(tokenId)!.add(overlayId);
    }

    // Private Methods - Context Building

    /**
     * Gets the context builder for an overlay.
     */
    private getContextBuilder(
        overlay: OverlayDefinition,
        contextBuilderRegistry: OverlayContextBuilderRegistry
    ): OverlayContextBuilder | undefined {
        // Use overlay's own context builder if defined
        if (overlay.contextBuilder) {
            return overlay.contextBuilder;
        }

        // Fall back to registry
        return contextBuilderRegistry.get(overlay.id);
    }

    /**
     * Builds context options for specific overlay types.
     */
    private buildContextOptions(
        overlayId: string,
        targetToken: Token,
        sourceToken?: Token,
    ): any {  // Using 'any' since different overlays have different option types

        switch (overlayId) {
            case 'health-arc':
                const obfuscatedHealth = this.healthObfuscator.obfuscateHealth(
                    targetToken
                );

                const { health, maxHealth, tempHealth, accuracy } = obfuscatedHealth;
                const healthPercentage = Math.min(1, health / maxHealth);
                const tempHealthPercentage = tempHealth > 0 ? Math.min(1, tempHealth / maxHealth) : 0;

                const backgroundColour = "#222222";
                const highHealthColour = "#465C1A";
                const lowHealthColour = "#6A1A1A";
                const tempHealthArcColour = "#B34141";

                const healthArcColour = this.calculateHealthColour(
                    healthPercentage,
                    highHealthColour,
                    lowHealthColour
                );

                const arcRadius = targetToken.radius + 6;
                const arcWidth = 4;

                const healthArcStartAngle = 359;
                const healthArcEndAngle = 359 - (healthPercentage * 49); 

                const backgroundStartAngle = healthArcEndAngle; 
                const backgroundEndAngle = 310; 

                const tempHealthArcStartAngle = 310;
                const tempHealthArcEndAngle = tempHealthArcStartAngle - (tempHealthPercentage * 49);

                this.logger.debug('Health arc context built', {
                    tokenName: targetToken.name,
                    isExact: accuracy === 1,
                    accuracy: `${(accuracy * 100).toFixed(1)}%`,
                    perceivedValues: { health, maxHealth, tempHealth },
                    percentages: { 
                        health: `${(healthPercentage * 100).toFixed(1)}%`,
                        tempHealth: `${(tempHealthPercentage * 100).toFixed(1)}%`
                    }
                });

                return {
                    healthArcStartAngle,
                    healthArcEndAngle,
                    healthArcColour,
                    tempHealthArcStartAngle,
                    tempHealthArcEndAngle,
                    tempHealthArcColour,
                    backgroundStartAngle,
                    backgroundEndAngle,
                    backgroundColour,
                    arcRadius,
                    arcWidth,
                    anticlockwise: true
                };

            case 'token-info':
                const disposition = targetToken.disposition;

                if (disposition === DISPOSITION.FRIENDLY) {
                    return {
                        trackingReferenceNumber: '',
                    };
                }
                
                const trackingReferenceNumber = targetToken.trackingReferenceNumber;
                
                let prefix = '';
                switch (disposition) {
                    case DISPOSITION.SECRET:
                        prefix = 'Contact';
                        break;
                    case DISPOSITION.NEUTRAL:
                        prefix = 'Bogey';
                        break;
                    case DISPOSITION.HOSTILE:
                        prefix = 'Bandit';
                        break;
                    default:
                        prefix = '';
                        break;
                }
                
                const displayText = `${prefix} ${trackingReferenceNumber}`;

                this.logger.debug('Token info context built', {
                    tokenName: targetToken.name,
                    trackingReferenceNumber: displayText
                });
                
                return {
                    trackingReferenceNumber: displayText,
                };

            default:
                return {};
        }
    }

    /**
     * Calculates an interpolated colour based on health percentage.
     */
    private calculateHealthColour(
        healthPercentage: number,
        highHealthColour: string,
        lowHealthColour: string
    ): string {
        const highColourNum = parseInt(highHealthColour.replace('#', ''), 16);
        const lowColourNum = parseInt(lowHealthColour.replace('#', ''), 16);

        const highR = (highColourNum >> 16) & 0xFF;
        const highG = (highColourNum >> 8) & 0xFF;
        const highB = highColourNum & 0xFF;

        const lowR = (lowColourNum >> 16) & 0xFF;
        const lowG = (lowColourNum >> 8) & 0xFF;
        const lowB = lowColourNum & 0xFF;

        const t = Math.max(0, Math.min(1, 1 - healthPercentage));

        const lerp = (start: number, end: number, t: number): number => {
            return Math.round(start + (end - start) * t);
        };

        const r = lerp(highR, lowR, t);
        const g = lerp(highG, lowG, t);
        const b = lerp(highB, lowB, t);

        const toHex = (n: number): string => n.toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }
}