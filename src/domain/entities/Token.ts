import type { DispositionValue } from '../constants/TokenDisposition.js';
import type { AbstractTokenAdapter } from '../../application/adapters/AbstractTokenAdapter.js';

import { Vector2 } from '../value-objects/Vector2.js';
import { Vector3 } from '../value-objects/Vector3.js';
import { VerticalExtent } from '../value-objects/VerticalExtent.js';
import { Rotation } from '../value-objects/Rotation.js';
import { DISPOSITION } from '../constants/TokenDisposition.js';
import { MovementTypes } from '../value-objects/Speed.js';

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

    get verticalExtent(): VerticalExtent {
        return new VerticalExtent(
            this._tokenAdapter.elevation,
            this._tokenAdapter.elevation + this.verticalHeight
        );
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

    get spatialCentre(): Vector3 {
        return new Vector3(
            this.centre.x,
            this.centre.y,
            this._tokenAdapter.elevation + this.verticalHeight / 2
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

    get verticalHeight(): number {
        return this._tokenAdapter.verticalHeight;
    }

    get isBlockingObstacle(): boolean {
        return this._tokenAdapter.isBlockingObstacle;
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