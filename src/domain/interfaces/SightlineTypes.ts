export interface TokenSightData {
  readonly id: string;
  readonly name: string;
  readonly position: { x: number; y: number };
  readonly width: number;
  readonly height: number;
  readonly isVisible: boolean;
  readonly isHidden: boolean;
  readonly isOwner: boolean;
  readonly isControlled: boolean;
  readonly sightBoundary?: SightBoundary;
  readonly visionRange?: number;
  readonly visionAngle?: number;
}

export interface SightBoundary {
  contains(x: number, y: number): boolean;
}

// Domain service for vision calculations
export interface LineOfSightChecker {
  isBlocked(
    origin: { x: number; y: number }, 
    destination: { x: number; y: number }
  ): boolean;
}

// Repository port for token data access
export interface TokenSightRepository {
  getTokenSightData(tokenId: string): Promise<TokenSightData | null>;
  getTokensSightData(tokenIds: string[]): Promise<TokenSightData[]>;
  getAllVisibleTokensSightData(): Promise<TokenSightData[]>;
  getControlledTokensSightData(userId: string): Promise<TokenSightData[]>;
}

// Type aliases for improved readability
export type TokenId = string;
export type UserId = string;

// Utility types for collections
export type TokenSightMap = Map<TokenId, TokenSightData>;
export type TokenIdSet = Set<TokenId>;