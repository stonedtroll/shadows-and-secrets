/**
 * 
 * This module provides a centralised registry for managing overlay type definitions within. 
 * It serves as the single source of truth for all overlay configurations,
 * enabling dynamic registration, retrieval, and categorisation of overlays.
 */

import type { OverlayDefinition, OverlayTriggers } from '../../domain/interfaces/OverlayDefinition.js';
import type { FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';

import { LoggerFactory } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

export class OverlayRegistry {
    private readonly overlayTypes = new Map<string, OverlayDefinition>();
    private readonly logger: FoundryLogger;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.OverlayRegistry`);
        this.logger.info('OverlayRegistry initialised');
    }

    // Public API - Registration

    /**
     * Registers a new overlay type definition.
     * Overwrites existing definitions with the same ID.
     */
    register(definition: OverlayDefinition): void {
        
        const isUpdate = this.overlayTypes.has(definition.id);
        this.overlayTypes.set(definition.id, definition);
        
        this.logger.info(`${isUpdate ? 'Updated' : 'Registered'} overlay type: ${definition.id}`, {
            name: definition.name,
            category: definition.category,
            enabledByDefault: definition.enabledByDefault
        });
    }
    
    /**
     * Registers multiple overlay types at once.
     * Useful for bulk initialisation during module setup.
     * Continues registration even if individual definitions fail.
     */
    registerBatch(definitions: OverlayDefinition[]): number {
        const startCount = this.overlayTypes.size;
        let failureCount = 0;
        
        for (const definition of definitions) {
            try {
                this.register(definition);
            } catch (error) {
                failureCount++;
                this.logger.error(`Failed to register overlay "${definition.id}"`, {
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
        
        const registered = this.overlayTypes.size - startCount;
        this.logger.info(`Batch registered ${registered} overlay types`, {
            attempted: definitions.length,
            failed: failureCount
        });
        
        return registered;
    }
    
    /**
     * Unregisters an overlay type.
     */
    unregister(overlayTypeId: string): boolean {
        const removed = this.overlayTypes.delete(overlayTypeId);
        
        if (removed) {
            this.logger.info(`Unregistered overlay type: ${overlayTypeId}`);
        } else {
            this.logger.warn(`Attempted to unregister non-existent overlay type: ${overlayTypeId}`);
        }
        
        return removed;
    }

    // Public API - Retrieval
    
    /**
     * Retrieves a specific overlay type definition.
     */
    get(overlayTypeId: string): OverlayDefinition | undefined {
        return this.overlayTypes.get(overlayTypeId);
    }
    
    /**
     * Retrieves all registered overlay definitions.
     * Returns a defensive copy to prevent external modification.
     */
    getAll(): OverlayDefinition[] {
        return Array.from(this.overlayTypes.values());
    }
    
    /**
     * Checks if an overlay type is registered.
     */
    has(overlayTypeId: string): boolean {
        return this.overlayTypes.has(overlayTypeId);
    }
    
    /**
     * Retrieves all registered overlay IDs.
     */
    getAllIds(): string[] {
        return Array.from(this.overlayTypes.keys());
    }

    /**
     * Gets the count of registered overlays.
     */
    size(): number {
        return this.overlayTypes.size;
    }

    // Public API - Filtering

    /**
     * Filters overlays by trigger type.
     */
    filterByTrigger(trigger: keyof OverlayTriggers): OverlayDefinition[] {
        return this.getAll().filter(overlay => {
            const triggerValue = overlay.triggers[trigger];

            if (!triggerValue) {
                return false;
            }

            // Handle trigger configs (objects with scope property)
            if (typeof triggerValue === 'object' && triggerValue !== null && !Array.isArray(triggerValue)) {
                // For keyPress with keys array
                if (trigger === 'keyPress' && 'keys' in triggerValue) {
                    return (triggerValue.keys?.length ?? 0) > 0;
                }

                // Any object trigger config is considered enabled
                return true;
            }

            // Handle modifier key arrays - non-empty array means enabled
            if (Array.isArray(triggerValue)) {
                return triggerValue.length > 0;
            }

            // Handle function predicates - presence means enabled
            if (typeof triggerValue === 'function') {
                return true;
            }

            return false;
        });
    }

    /**
     * Filters overlays by a specific key press trigger.
     */
    filterByKeyTrigger(triggerKey: string): OverlayDefinition[] {
        const normalisedKey = triggerKey.toLowerCase();
        
        return this.getAll().filter(overlay => {
            const keyPressTrigger = overlay.triggers.keyPress;

            if (!keyPressTrigger) {
                return false;
            }

            // Handle boolean keyPress (shouldn't have specific keys)
            if (typeof keyPressTrigger === 'boolean') {
                return false;
            }

            // Check if it's a KeyPressTriggerConfig with keys
            if ('keys' in keyPressTrigger && keyPressTrigger.keys?.length) {
                return keyPressTrigger.keys.includes(normalisedKey);
            }

            return false;
        });
    }
    
    /**
     * Retrieves overlays visible on canvas startup.
     */
    getStartupOverlays(): OverlayDefinition[] {
        return this.getAll().filter(definition => definition.visibleOnStart === true);
    }

    /**
     * Filters overlays by category.
     */
    filterByCategory(category: string): OverlayDefinition[] {
        return this.getAll().filter(definition => definition.category === category);
    }

    /**
     * Gets all unique overlay categories.
     */
    getCategories(): string[] {
        const categories = new Set<string>();
        
        for (const definition of this.overlayTypes.values()) {
            if (definition.category) {
                categories.add(definition.category);
            }
        }
        
        return Array.from(categories);
    }

    // Public API - Management
    
    /**
     * Clears all registered overlay types.
     * Useful for testing or module teardown.
     */
    clear(): void {
        const count = this.overlayTypes.size;
        this.overlayTypes.clear();
        this.logger.info(`Cleared ${count} overlay types`);
    }
}