import { Token } from '../entities/Token.js';
import { Actor } from '../entities/Actor.js';
import { ActorAdapterFactory } from '../../infrastructure/factories/ActorAdapterFactory.js';
import { TokenRepository } from '../../infrastructure/repositories/TokenRepository.js';
import { LoggerFactory, type FoundryLogger } from '../../../lib/log4foundry/log4foundry.js';
import { MODULE_ID } from '../../config.js';

export interface ObfuscatedHealth {
    health: number;
    maxHealth: number;
    tempHealth: number;
    accuracy: number;
}

export class HealthObfuscator {
    private readonly logger: FoundryLogger;
    private readonly tokenRepository: TokenRepository;
    private static readonly BASE_PERCEPTION = 10;
    private static readonly BASE_VARIANCE = 0.3; // 30% variance at perception 10
    private static readonly ACCURACY_CHANGE_PER_POINT = 0.02; // 2% per perception point
    private static readonly MIN_VARIANCE = 0; // 100% accuracy (no variance)
    private static readonly MAX_VARIANCE = 2; // 200% max variance

    constructor() {
        this.logger = LoggerFactory.getInstance().getFoundryLogger(`${MODULE_ID}.HealthObfuscator`);
        this.tokenRepository = new TokenRepository();
    }

    /**
     * Obfuscates health values based on the observer's passive perception.
     */
    obfuscateHealth(
        targetToken: Token,
        isGM: boolean
    ): ObfuscatedHealth {
        if (isGM || targetToken.isOwnedByCurrentUser) {
            return this.getExactHealth(targetToken);
        }

        const observerToken = this.getObserverToken();
        if (!observerToken) {
            this.logger.warn('No observer token found, returning exact health');
            return this.getExactHealth(targetToken);
        }

        const passivePerception = this.getPassivePerception(observerToken);

        const variance = this.calculateVariance(passivePerception);
        const accuracy = 1 - variance;

        this.logger.debug('Calculating obfuscated health', {
            targetToken: targetToken.name,
            observerToken: observerToken.name,
            passivePerception,
            variance: `${(variance * 100).toFixed(1)}%`,
            accuracy: `${(accuracy * 100).toFixed(1)}%`
        });

        const exactHealth = this.getExactHealth(targetToken);

        const obfuscatedHealth = this.applyVariance(
            exactHealth.health,
            exactHealth.maxHealth,
            exactHealth.tempHealth,
            variance,
            targetToken.id 
        );

        return {
            ...obfuscatedHealth,
            accuracy
        };
    }

    /**
     * Gets the exact health values for a token.
     */
    private getExactHealth(token: Token): ObfuscatedHealth {
        let health = 0;
        let maxHealth = 1;
        let tempHealth = 0;

        if (token.actorId) {
            const actorAdapter = ActorAdapterFactory.create(token.actorId);
            if (actorAdapter) {
                const actor = new Actor(actorAdapter);
                health = actor.health;
                maxHealth = actor.maxHealth;
                tempHealth = actor.tempHealth;
            }
        }

        return {
            health,
            maxHealth,
            tempHealth,
            accuracy: 1
        };
    }

    /**
     * Gets the observer token (controlled or first owned) from repository.
     */
    private getObserverToken(): Token | undefined {
        const controlledAdapters = this.tokenRepository.getControlledAsAdapters();
        if (controlledAdapters.length > 0 && controlledAdapters[0]) {
            return new Token(controlledAdapters[0]);
        }

        const ownedAdapters = this.tokenRepository.getOwnedByCurrentUserAsAdapters();
        if (ownedAdapters.length > 0 && ownedAdapters[0]) {
            return new Token(ownedAdapters[0]);
        }

        return undefined;
    }

    /**
     * Gets passive perception for a token.
     */
    private getPassivePerception(token: Token): number {
        if (!token.actorId) {
            return HealthObfuscator.BASE_PERCEPTION;
        }

        const actorAdapter = ActorAdapterFactory.create(token.actorId);
        if (!actorAdapter) {
            return HealthObfuscator.BASE_PERCEPTION;
        }

        const actor = new Actor(actorAdapter);

        const passivePerception = (actor as any).passivePerception ?? 
                                 (actor as any).system?.skills?.perception?.passive ??
                                 HealthObfuscator.BASE_PERCEPTION;

        return Math.max(0, passivePerception);
    }

    /**
     * Calculates variance based on passive perception.
     */
    private calculateVariance(passivePerception: number): number {
        const perceptionDiff = passivePerception - HealthObfuscator.BASE_PERCEPTION;
        const variance = HealthObfuscator.BASE_VARIANCE - 
                        (perceptionDiff * HealthObfuscator.ACCURACY_CHANGE_PER_POINT);

        return Math.max(
            HealthObfuscator.MIN_VARIANCE,
            Math.min(HealthObfuscator.MAX_VARIANCE, variance)
        );
    }

    /**
     * Applies variance to health values with randomness.
     */
    private applyVariance(
        actualHealth: number,
        actualMaxHealth: number,
        actualTempHealth: number,
        variance: number,
        tokenId?: string
    ): Pick<ObfuscatedHealth, 'health' | 'maxHealth' | 'tempHealth'> {

        const timeWindow = Math.floor(Date.now() / 60000); 
        const tokenHash = tokenId ? this.hashString(tokenId) : 0;
        const seed = timeWindow + tokenHash;
        
        const healthBase = 1 - variance + (this.seededRandom(seed) * variance * 2);
        const maxHealthBase = 1 - variance + (this.seededRandom(seed + 1) * variance * 2);
        const tempHealthBase = 1 - variance + (this.seededRandom(seed + 2) * variance * 2);

        const smallRandomness = 0.05;
        const healthRandom = (this.seededRandom(seed + 3) * 2 - 1) * smallRandomness;
        const maxHealthRandom = (this.seededRandom(seed + 4) * 2 - 1) * smallRandomness;
        const tempHealthRandom = (this.seededRandom(seed + 5) * 2 - 1) * smallRandomness;
        
        const healthMultiplier = healthBase + healthRandom;
        const maxHealthMultiplier = maxHealthBase + maxHealthRandom;
        const tempHealthMultiplier = tempHealthBase + tempHealthRandom;

        let obfuscatedHealth = Math.round(actualHealth * healthMultiplier);
        let obfuscatedMaxHealth = Math.round(actualMaxHealth * maxHealthMultiplier);
        let obfuscatedTempHealth = Math.round(actualTempHealth * tempHealthMultiplier);

        obfuscatedHealth = Math.max(0, obfuscatedHealth);
        obfuscatedTempHealth = Math.max(0, obfuscatedTempHealth);
        obfuscatedMaxHealth = Math.max(1, obfuscatedMaxHealth);

        if (obfuscatedHealth > obfuscatedMaxHealth) {
            obfuscatedMaxHealth = obfuscatedHealth;
        }

        this.logger.debug('Applied health variance', {
            tokenId,
            variance: `${(variance * 100).toFixed(1)}%`,
            multipliers: {
                health: `${(healthMultiplier * 100).toFixed(1)}%`,
                maxHealth: `${(maxHealthMultiplier * 100).toFixed(1)}%`,
                tempHealth: `${(tempHealthMultiplier * 100).toFixed(1)}%`
            },
            actual: { health: actualHealth, maxHealth: actualMaxHealth, tempHealth: actualTempHealth },
            obfuscated: { health: obfuscatedHealth, maxHealth: obfuscatedMaxHealth, tempHealth: obfuscatedTempHealth }
        });

        return {
            health: obfuscatedHealth,
            maxHealth: obfuscatedMaxHealth,
            tempHealth: obfuscatedTempHealth
        };
    }

    /**
     * Simple seeded random number generator.
     */
    private seededRandom(seed: number): number {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Simple hash function to convert string to number.
     */
    private hashString(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; 
        }
        return Math.abs(hash);
    }
}