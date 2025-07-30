import type { LineOfSightChecker } from '../../domain/interfaces/SightlineTypes.js';
import { Vector2 } from '../../domain/value-objects/Vector2.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

/**
 * Foundry v13 implementation of line-of-sight checking
 * 
 */
export class FoundryLineOfSightChecker implements LineOfSightChecker {
    private readonly logger: FoundryLogger;

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.FoundryLineOfSightChecker`);
    }

    isBlocked(origin: Vector2, destination: Vector2): boolean {
        try {
            // Ensure canvas is ready
            if (!canvas?.ready) {
                this.logger.warn('Canvas not ready for LOS check');
                return false;
            }

            // Try to use the perception sweep for sight testing 
            if (canvas.visibility?.testVisibility) {
                const sourcePoint = { x: origin.x, y: origin.y };
                const targetPoint = { x: destination.x, y: destination.y };
                
                // Test if target is visible from source
                const isVisible = canvas.visibility.testVisibility(
                    targetPoint,
                    { object: { center: sourcePoint } }
                );
                
                this.logger.debug('Visibility test', {
                    origin: sourcePoint,
                    destination: targetPoint,
                    isVisible
                });
                
                return !isVisible;
            }

            // Alternative: Use the walls layer to check for blocking walls
            if (canvas.walls?.placeables?.length > 0) {
                return this.checkWallsBlocking(origin, destination);
            }

            // If no methods available, assume not blocked
            this.logger.warn('No LOS detection method available');
            return false;
            
        } catch (error) {
            this.logger.error('Error checking line of sight', { 
                error: error instanceof Error ? error.message : String(error),
                origin,
                destination
            });
            
            // Fallback to manual wall check
            return this.checkWallsBlocking(origin, destination);
        }
    }

    /**
     * Check if any walls block the path between two points
     */
    private checkWallsBlocking(origin: Vector2, destination: Vector2): boolean {
        try {
            if (!canvas?.walls?.placeables?.length) {
                return false;
            }

            // Create a ray from origin to destination
            const ray = new Ray(
                { x: origin.x, y: origin.y },
                { x: destination.x, y: destination.y }
            );

            // Check each wall for sight blocking
            for (const wall of canvas.walls.placeables) {
                const wallDoc = wall.document;
                
                // Skip walls that don't block sight
                if (wallDoc.sight === CONST.WALL_SENSE_TYPES.NONE) {
                    continue;
                }
                
                // For v13, use the wall's contains method if available
                if (wall.contains) {
                    const intersects = wall.contains(ray.A.x, ray.A.y) || wall.contains(ray.B.x, ray.B.y);
                    if (intersects) {
                        this.logger.debug('Sight potentially blocked by wall', {
                            wallId: wall.id,
                            wallType: wallDoc.sight
                        });
                    }
                }
                
                const wallCoords = wall.document.c;
                
                // Method 1: Use wall's testWall method if available
                if (wall.testWall) {
                    const intersects = wall.testWall(ray.A, ray.B);
                    if (intersects) {
                        this.logger.debug('Sight blocked by wall (testWall)', {
                            wallId: wall.id,
                            wallType: wallDoc.sight
                        });
                        return true;
                    }
                }
                // Method 2: Use lineSegmentIntersects with proper parameters
                else if (foundry.utils.lineSegmentIntersects) {
                    // lineSegmentIntersects expects: (a, b, c, d, epsilon)
                    // where a and b are the endpoints of the first segment
                    // and c and d are the endpoints of the second segment
                    const a = { x: ray.A.x, y: ray.A.y };
                    const b = { x: ray.B.x, y: ray.B.y };
                    const c = { x: wallCoords[0], y: wallCoords[1] };
                    const d = { x: wallCoords[2], y: wallCoords[3] };
                    
                    const intersects = foundry.utils.lineSegmentIntersects(a, b, c, d);
                    
                    if (intersects) {
                        this.logger.debug('Sight blocked by wall', {
                            wallId: wall.id,
                            wallType: wallDoc.sight
                        });
                        return true;
                    }
                }
                // Method 3: Fallback to ray intersection
                else if (wall.intersectsRay) {
                    const intersection = wall.intersectsRay(ray);
                    if (intersection) {
                        this.logger.debug('Sight blocked by wall (legacy)', {
                            wallId: wall.id,
                            wallType: wallDoc.sight
                        });
                        return true;
                    }
                }
            }

            return false;
        } catch (error) {
            this.logger.error('Wall blocking check failed', { 
                error: error instanceof Error ? error.message : String(error)
            });
            return false;
        }
    }

    /**
     * Check if line of sight is blocked between two tokens
     */
    isBlockedBetweenTokens(viewerToken: Token, targetToken: Token): boolean {
        if (!viewerToken?.center || !targetToken?.center) {
            this.logger.warn('Invalid tokens for LOS check', {
                viewer: viewerToken?.id,
                target: targetToken?.id
            });
            return true;
        }
        
        // For tokens, we can also use the token's vision detection if available
        if (viewerToken.vision?.active && targetToken.visible) {
            // Check if target token is in viewer's vision
            const canSee = viewerToken.vision.los?.contains(targetToken.center.x, targetToken.center.y);
            if (canSee !== undefined) {
                this.logger.debug('Token vision check', {
                    viewer: viewerToken.id,
                    target: targetToken.id,
                    canSee
                });
                return !canSee;
            }
        }
        
        // Fallback to point-to-point check
        const origin = new Vector2(viewerToken.center.x, viewerToken.center.y);
        const destination = new Vector2(targetToken.center.x, targetToken.center.y);
        return this.isBlocked(origin, destination);
    }

    /**
     * Get all tokens visible from the viewer token
     */
    getVisibleTokens(viewerToken: Token, targetTokens: Token[]): Token[] {
        if (!viewerToken) return [];
        
        return targetTokens.filter(target => 
            target && 
            target !== viewerToken && 
            target.visible &&
            !this.isBlockedBetweenTokens(viewerToken, target)
        );
    }
}