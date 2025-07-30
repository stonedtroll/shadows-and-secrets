import type { DispositionValue } from "../../domain/constants/TokenDisposition.js";

import { Vector2 } from "../../domain/value-objects/Vector2.js";
import { Rotation } from "../../domain/value-objects/Rotation.js";
import { MovementTypes } from "../../domain/value-objects/Speed.js";

export abstract class AbstractTokenAdapter {
    constructor(protected token: Token) { }
    
    abstract get id(): string;
    abstract get name(): string;
    abstract get position(): Vector2;
    abstract get rotation(): Rotation;
    abstract get elevation(): number;
    abstract get width(): number;
    abstract get height(): number;
    abstract get scale(): number;
    abstract get disposition(): DispositionValue;
    abstract get visible(): boolean;
    abstract get hidden(): boolean;
    abstract get currentMovementMode(): MovementTypes | null;
    abstract get isControlledByCurrentUser(): boolean;
    abstract get isOwnedByCurrentUser(): boolean;
    abstract get actorId(): string | null;
    abstract get verticalHeight(): number;
    abstract get isBlockingObstacle(): boolean;
}