import { Vector2 } from "../../domain/value-objects/Vector2.js";
import { Rotation } from "../../domain/value-objects/Rotation.js";
import { AbstractTokenAdapter } from "../../application/adapters/AbstractTokenAdapter.js";
import { MovementTypes } from "../../domain/value-objects/Speed.js";
import { TokenSheetAdapter } from "./TokenSheetAdapter.js";

import { DISPOSITION, type DispositionValue } from "../../domain/constants/TokenDisposition.js";


export class TokenAdapter extends AbstractTokenAdapter {

    get id(): string {
        return this.token.id;
    }

    get name(): string {
        return this.token.name || 'Eldritch';
    }

    get position(): Vector2 {
        return new Vector2(this.token.x, this.token.y);
    }

    get rotation(): Rotation {
        return new Rotation(this.token.document.rotation);
    }

    get elevation(): number {
        return this.token.document.elevation || 0;
    }

    get width(): number {
        return this.token.w;
    }

    get height(): number {
        return this.token.h;
    }

    get scale(): number {
        return this.token.document.scale;
    }

    get disposition(): DispositionValue {
        switch (this.token.document.disposition) {
            case -2: return DISPOSITION.SECRET;
            case -1: return DISPOSITION.HOSTILE;
            case 0: return DISPOSITION.NEUTRAL;
            case 1: return DISPOSITION.FRIENDLY;
            default: return DISPOSITION.NEUTRAL;
        }
    }

    get visible(): boolean {
        return this.token.visible;
    }

    get hidden(): boolean {
        return this.token.document.hidden;
    }

    get currentMovementMode(): MovementTypes | null {
        return this.token.document.movementAction as MovementTypes | null;
    }

    get isControlledByCurrentUser(): boolean {
        return this.token.controlled;
    }

    get isOwnedByCurrentUser(): boolean {
        return this.token.isOwner;
    }

    get actorId(): string | null {
        return this.token.actor?.id || null;
    }

    get actorName(): string | null {
        return this.token.actor?.name || null;
    }

    get verticalHeight(): number {
        return TokenSheetAdapter.getVerticalHeight(this.token);
    }

    get isSwarm(): boolean {

        const actor = this.token.actor;
        if (!actor) {
            return false;
        }

        if (game.system.id === 'dnd5e') {
            return !!actor.system?.details?.type?.swarm;
        }

        return false;
    }

    get isBlockingObstacle(): boolean {
        return !this.isSwarm;
    }
}