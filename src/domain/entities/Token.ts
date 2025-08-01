import type { DispositionValue } from '../constants/TokenDisposition.js';
import type { AbstractTokenAdapter } from '../../application/adapters/AbstractTokenAdapter.js';
import type { Actor } from '../entities/Actor.js'

import { MovementTypes, Speed } from '../value-objects/Speed.js';
import { Weapon } from '../value-objects/Weapon.js';
import { Vector2 } from '../value-objects/Vector2.js';
import { Vector3 } from '../value-objects/Vector3.js';
import { Rotation } from '../value-objects/Rotation.js';
import { DISPOSITION } from '../constants/TokenDisposition.js';

export class Token {

    protected _previousPosition?: Vector2;
    protected _previousRotation?: Rotation;
    protected _previousElevation?: number;

    private _tokenAdapter: AbstractTokenAdapter;

    constructor(tokenAdapter: AbstractTokenAdapter) {
        this._tokenAdapter = tokenAdapter;
    }

    get radius(): number {
        return Math.max(this.width, this.height) / 2;
    }

    get id(): string {
        return this._tokenAdapter.id;
    }

    get name(): string {
        return this._tokenAdapter.name;
    }

    get position(): Readonly<Vector2> {
        return this._tokenAdapter.position;
    }

    get position3D(): Readonly<Vector3> {
        return new Vector3(
            this._tokenAdapter.position.x,
            this._tokenAdapter.position.y,
            this._tokenAdapter.elevation ?? 0
        );
    }

    get rotation(): Rotation {
        return this._tokenAdapter.rotation;
    }

    get elevation(): number {
        return this._tokenAdapter.elevation;
    }

    get width(): number {
        return this._tokenAdapter.width;
    }

    get height(): number {
        return this._tokenAdapter.height;
    }

    get centre(): Vector2 {
        return new Vector2(
            this._tokenAdapter.position.x + this.width / 2,
            this._tokenAdapter.position.y + this.height / 2
        );
    }

    get visible(): boolean {
        return this._tokenAdapter.visible;
    }

    get hidden(): boolean {
        return this._tokenAdapter.hidden;
    }

    get scale(): number {
        return this._tokenAdapter.scale;
    }

    get disposition(): DispositionValue {
        return this._tokenAdapter.disposition;
    }

    get portrait(): string | null {
        return this._tokenAdapter.portrait;
    }

    get currentMovementMode(): MovementTypes | null {
        return this._tokenAdapter.currentMovementMode as MovementTypes | null;
    }

    get isControlledByCurrentUser(): boolean {
        return this._tokenAdapter.isControlledByCurrentUser;
    }

    get isOwnedByCurrentUser(): boolean {
        return this._tokenAdapter.isOwnedByCurrentUser;
    }

    get actorId(): string | null {
        return this._tokenAdapter.actorId;
    }

    get actor(): Actor {
        return this._tokenAdapter.actor;
    }

    get actorName(): string {
        return this.actor.name;
    }

    get type(): string {
        return this.actor.type;
    }

    get speeds(): ReadonlyArray<Speed> {
        return this.actor.speeds;
    }

    get equippedWeapons(): ReadonlyArray<Weapon> {
        return this.actor.equippedWeapons;
    }

    hasMovementMode(mode: MovementTypes): boolean {
        return this.actor.speeds.some(s => s.mode === mode);
    }

    get health(): number {
        return this.actor.health;
    }

    get maxHealth(): number {
        return this.actor.maxHealth;
    }

    get tempHealth(): number {
        return this.actor.tempHealth;
    }

    get tempMaxHealth(): number {
        return this.actor.tempMaxHealth;
    }

    get healthPercentage(): number {
        return this.maxHealth > 0 ? (this.health / this.maxHealth) * 100 : 0;
    }

    get isBlockingObstacle(): boolean {
        return this._tokenAdapter.isBlockingObstacle;
    }

    get trackingReferenceNumber(): string {
        return this._tokenAdapter.trackingReferenceNumber;
    }

    /**
     * Check if another token can pass through this one based on disposition and type.
     */
    canPassThrough(obstacle: Token): boolean {

        if (!this._tokenAdapter.isBlockingObstacle || !obstacle.isBlockingObstacle) {
            return true;
        }

        if (this._tokenAdapter.disposition === obstacle.disposition) {
            return true;
        }

        if (this._tokenAdapter.disposition === DISPOSITION.SECRET ||
            obstacle.disposition === DISPOSITION.SECRET) {
            return false;
        }

        // Neutral tokens have special pass-through rules
        if (this._tokenAdapter.disposition === DISPOSITION.NEUTRAL ||
            obstacle.disposition === DISPOSITION.NEUTRAL) {
            return true;
        }

        // Different dispositions block each other by default
        return false;
    }
}