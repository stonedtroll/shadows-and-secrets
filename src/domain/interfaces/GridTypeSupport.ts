/**
 * Defines which grid types an overlay supports
 */
export interface GridTypeSupport {
  /** Supports gridless scenes */
  gridless: boolean;
  /** Supports square grid */
  square: boolean;
  /** Supports hex grid with flat orientation */
  hexFlat: boolean;
  /** Supports hex grid with pointy orientation */
  hexPointy: boolean;
}