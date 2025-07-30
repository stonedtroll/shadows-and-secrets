import { AbstractGridAdapter } from "../../application/adapters/AbstractGridAdapter.js";
import { GridType } from "../../domain/value-objects/Grid.js";

export class GridAdapter extends AbstractGridAdapter {

    get type(): string {
        return this.mapGridType(this.grid.type);
    }

    get size(): number {
        return this.grid.size;
    }

    get distance(): number {
        return this.grid.distance;
    }

    get units(): string {
        return this.grid.units;
    }

    get diagonalRule(): string {
        return this.grid.diagonalRule;
    }

    get isGridless(): boolean {
        return this.grid.isGridless;
    }

    get isSquare(): boolean {
        return this.grid.isSquare;
    }

    get isHex(): boolean {
        return this.grid.isHex;
    }

    pixelsToUnits(pixels: number): number {
        return this.grid.pixelsToUnits(pixels);
    }

    unitsToPixels(units: number): number {
        return this.grid.unitsToPixels(units);
    }

    private mapGridType(foundryType: number): GridType {
        switch (foundryType) {
            case CONST.GRID_TYPES.GRIDLESS: return GridType.GRIDLESS;
            case CONST.GRID_TYPES.SQUARE: return GridType.SQUARE;
            case CONST.GRID_TYPES.HEXODDR: return GridType.HEX_ODDR;
            case CONST.GRID_TYPES.HEXEVENR: return GridType.HEX_EVENR;
            case CONST.GRID_TYPES.HEXODDQ: return GridType.HEX_ODDQ;
            case CONST.GRID_TYPES.HEXEVENQ: return GridType.HEX_EVENQ;
            default: return GridType.GRIDLESS;
        }
    }
}