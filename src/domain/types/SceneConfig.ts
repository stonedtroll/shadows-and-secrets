export enum GridType {
    Gridless = 0,
    Square = 1,
    Hex = 2
}

export interface SceneConfig {
    gridType: GridType;
    gridSize: number;
    useElevation: boolean;
    sceneCeiling: number;
    enable3DPathfinding: boolean;
    maxStepHeight: number;
}