export abstract class AbstractGridAdapter {
    constructor(protected grid: Grid) { }

    abstract type: string;
    abstract size: number;
    abstract distance: number;
    abstract units: string;
    abstract diagonalRule: string;
    abstract isGridless: boolean;
    abstract isSquare: boolean;
    abstract isHex: boolean;
    abstract pixelsToUnits(pixels: number): number;
    abstract unitsToPixels(units: number): number;
}