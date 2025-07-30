/**
 * Adapter for extending the Foundry token configuration sheet
 * Adds custom fields for vertical height tracking
 */

import type { InitialisableService } from '../../domain/interfaces/InitialisableService.js';

import { getSetting } from '../../settings.js';
import { MODULE_ID, SETTINGS } from '../../config.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

export class TokenSheetAdapter implements InitialisableService {
    private readonly logger: FoundryLogger;
    private static readonly VERTICAL_HEIGHT_FLAG = 'verticalHeight';
    static readonly MODULE_NAMESPACE = MODULE_ID;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.TokenSheetAdapter`);
    }

    /**
     * Initialise token sheet modifications
     */
    async initialise(): Promise<void> {
        // Hook into both regular and prototype token config renders
        Hooks.on('renderTokenConfig', this.onRenderTokenConfig.bind(this));
        Hooks.on('renderPrototypeTokenConfig', this.onRenderPrototypeTokenConfig.bind(this));

        this.logger.info('Token sheet adapter initialised');
    }

    /**
     * Clean up hooks on shutdown
     */
    async shutdown(): Promise<void> {
        this.logger.info('Token sheet adapter shutdown');
    }

    /**
     * Handle regular token config render
     */
    private async onRenderTokenConfig(
        app: TokenConfig,
        element: HTMLElement,
        context: Record<string, any>
    ): Promise<void> {
        this.injectVerticalHeightField(app, element, app.document);
    }

    /**
     * Handle prototype token config render (ApplicationV2)
     */
    private async onRenderPrototypeTokenConfig(
        app: any,
        context: Record<string, any>
    ): Promise<void> {
        const element = app.element;
        if (!element) return;

        this.injectVerticalHeightField(app, element, app.token);
    }

    /**
     * Inject vertical height field into token configuration sheet
     */
    private async injectVerticalHeightField(
        app: any,
        element: HTMLElement,
        token: TokenDocument | null
    ): Promise<void> {
        try {
            if (!token) {
                this.logger.warn('No token document found in app:', {
                    hasDocument: !!app.document,
                    hasToken: !!app.token,
                    hasObject: !!app.object,
                    hasActor: !!app.actor,
                    constructor: app.constructor.name
                });
                return;
            }

            const flagPath = `flags.${TokenSheetAdapter.MODULE_NAMESPACE}.${TokenSheetAdapter.VERTICAL_HEIGHT_FLAG}`;
            
            let verticalHeight = foundry.utils.getProperty(token, flagPath) as number | undefined;
            let isExplicitlySet = verticalHeight !== undefined;
            
            if (!isExplicitlySet && token.actor?.prototypeToken) {
                verticalHeight = foundry.utils.getProperty(token.actor.prototypeToken, flagPath) as number | undefined;
                isExplicitlySet = verticalHeight !== undefined;
            }

            let displayValue = '';
            if (isExplicitlySet && verticalHeight !== undefined) {
                displayValue = verticalHeight.toFixed(2);
            }

            if (element.querySelector(`[name="${flagPath}"]`)) {
                this.logger.debug('Vertical height field already exists');
                return;
            }

            const units = canvas?.scene?.grid.units;

            // Create the form group element
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group slim';
            formGroup.innerHTML = `
                <label for="${token.id || 'prototype'}-verticalHeight">
                    ${game.i18n.localize(`${MODULE_ID}.tokenSheet.verticalHeight.label`)}
                    <span class="units">(${units})</span>
                </label>
                <div class="form-fields">
                    <input type="number" 
                           name="${flagPath}" 
                           value="${displayValue}" 
                           step="0.01" 
                           min="0"
                           placeholder="${!isExplicitlySet ? TokenSheetAdapter.getVerticalHeight(token).toFixed(2) : ''}"
                           id="${token.id || 'prototype'}-verticalHeight"
                           data-dtype="Number">
                </div>
                <p class="hint">
                    ${game.i18n.format(`${MODULE_ID}.tokenSheet.verticalHeight.hint`, {
                units: units ?? 'm'
            })}
                </p>
            `;

            // Find the identity tab and rotation field
            const identityTab = element.querySelector('.tab[data-tab="identity"]');
            if (!identityTab) {
                this.logger.warn('Identity tab not found in token config');
                return;
            }

            const rotationGroup = Array.from(identityTab.querySelectorAll('.form-group.slim'))
                .find(group => group.querySelector('input[name="rotation"]'));

            if (rotationGroup) {
                rotationGroup.after(formGroup);
                this.logger.debug('Inserted vertical height after rotation field');
            } else {
                identityTab.appendChild(formGroup);
                this.logger.debug('Appended vertical height to identity tab');
            }

            // Adjust sheet height if method exists
            if (app.setPosition) {
                app.setPosition({ height: 'auto' });
            }

        } catch (error) {
            this.logger.error('Failed to render vertical height field', error);
        }
    }

    /**
     * Get vertical height for a token
     */
    static getVerticalHeight(token: foundry.canvas.placeables.Token | TokenDocument): number {
        const doc = token instanceof foundry.canvas.placeables.Token ? token.document : token;
        const flagPath = `flags.${MODULE_ID}.${this.VERTICAL_HEIGHT_FLAG}`;

        let verticalHeight = foundry.utils.getProperty(doc, flagPath) as number | undefined;

        if (verticalHeight === undefined && doc.actor?.prototypeToken) {
            verticalHeight = foundry.utils.getProperty(doc.actor.prototypeToken, flagPath) as number | undefined;
        }

        if (verticalHeight === undefined) {
            const defaultHeight = getSetting<number>(SETTINGS.TOKEN_DEFAULT_VERTICAL_HEIGHT) ?? 1.8;

            if (game.system.id === 'dnd5e') {
                return this.calculateHeightForDnd5e(doc, defaultHeight);
            } else {
                return this.calculateHeightBySize(doc, defaultHeight);
            }
        }

        return verticalHeight;
    }

    /**
     * Calculate vertical height for D&D 5e creatures
     * Uses creature type, size, and name patterns for sophisticated defaults
     */
    private static calculateHeightForDnd5e(token: TokenDocument, baseHeight: number): number {
        const actor = token.actor;
        const creatureType = actor?.system?.details?.type?.value || 'humanoid';
        const tokenWidth = token.width ?? 1;
        const tokenHeight = token.height ?? 1;
        const creatureSize = actor?.system?.traits?.size || this.estimateSizeCategory(Math.max(tokenWidth, tokenHeight));

        // Base multipliers by size category
        const sizeMultipliers: Record<string, number> = {
            'tiny': 0.25,    
            'sm': 0.75,      
            'med': 1,       
            'lg': 2,        
            'huge': 3,       
            'grg': 4         
        };

        // Type modifiers for D&D creature types
        const typeModifiers: Record<string, number> = {
            'dragon': 1.5,      
            'giant': 1.3,       
            'humanoid': 1,      
            'beast': 0.8,       
            'monstrosity': 1.1, 
            'elemental': 1.2,   
            'fiend': 1.1,       
            'celestial': 1.2,   
            'construct': 1,     
            'undead': 1,        
            'fey': 0.9,         
            'aberration': 1.1,  
            'ooze': 0.5,        
            'plant': 1.2       
        };

        // Special cases based on actor name patterns
        const actorName = actor?.name || '';
        const namePatterns: Array<[RegExp, number]> = [
            [/ancient.*dragon/i, 1.6],
            [/adult.*dragon/i, 1.5],
            [/young.*dragon/i, 1.4],
            [/wyrmling/i, 1.2],
            [/storm giant/i, 1.5],
            [/cloud giant/i, 1.4],
            [/fire giant/i, 1.3],
            [/frost giant/i, 1.3],
            [/stone giant/i, 1.2],
            [/hill giant/i, 1.1],
            [/ogre/i, 1.2],
            [/troll/i, 1.3],
            [/treant/i, 2],
            [/beholder/i, 1], 
            [/snake|serpent|worm/i, 0.3], 
            [/spider|scorpion|crab/i, 0.5], 
        ];

        // Start with base size multiplier
        let multiplier = sizeMultipliers[creatureSize] || 1;

        // Apply type modifier
        const typeModifier = typeModifiers[creatureType.toLowerCase()] || 1;
        multiplier *= typeModifier;

        // Check name patterns for special cases
        for (const [pattern, modifier] of namePatterns) {
            if (pattern.test(actorName)) {
                multiplier = modifier * (sizeMultipliers[creatureSize] || 1);
                break; 
            }
        }

        return baseHeight * multiplier;
    }

    /**
     * Calculate vertical height based on token size (system-agnostic)
     */
    private static calculateHeightBySize(token: TokenDocument, baseHeight: number): number {
        const width = token.width ?? 1;
        const height = token.height ?? 1;
        const size = Math.max(width, height);

        // Simple multiplier based on grid size
        let multiplier = 1;

        if (size <= 0.5) {
            multiplier = 0.3;  // Very small tokens
        } else if (size < 1) {
            multiplier = 0.6;  // Small tokens
        } else if (size === 1) {
            multiplier = 1;    // Standard single-square tokens (base)
        } else if (size <= 2) {
            multiplier = 2;    // 2x2 tokens
        } else if (size <= 3) {
            multiplier = 3;    // 3x3 tokens
        } else if (size <= 4) {
            multiplier = 4;    // 4x4 tokens
        } else {
            multiplier = size; // Scale linearly for very large tokens
        }

        return baseHeight * multiplier;
    }

    /**
     * Estimate size category from grid dimensions (D&D 5e specific)
     */
    private static estimateSizeCategory(gridSize: number): string {
        if (gridSize <= 0.5) return 'tiny';
        if (gridSize < 1) return 'sm';
        if (gridSize === 1) return 'med';
        if (gridSize === 2) return 'lg';
        if (gridSize === 3) return 'huge';
        return 'grg';
    }
}