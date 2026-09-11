export type Status =
  | "unknown"
  | "available"
  | "sold"
  | "booked"
  | "reserved"
  | "unavailable"
  | "sold-out";
export interface Seat {
  readonly id: string;
  readonly key: string;
  readonly sectionId: string;
  readonly sectionName: string;
  readonly row: string;
  readonly seat: string;
  readonly special: boolean;
  readonly price: number;
  readonly status: Status;
  readonly selected: boolean;
}
export interface SeatLine extends Seat {
  readonly quantity: 1;
  readonly originalPrice: number;
  readonly totalPrice: number;
  readonly savings: number;
  readonly promoId: string | null;
}
export interface SectionSummary {
  readonly quantity: number;
  readonly totalPrice: number;
  readonly originalTotal: number;
  readonly freeItems: number;
  readonly paidItems: number;
  readonly promoId: string | null;
}
export interface GALine extends SectionSummary {
  readonly sectionId: string;
  readonly sectionName: string;
  readonly price: number;
  readonly pricePerTicket: number;
}
export interface Cart {
  readonly currency: string;
  readonly seats: readonly SeatLine[];
  readonly ga: readonly GALine[];
  readonly sectionSummaries: Readonly<Record<string, SectionSummary>>;
  readonly seatCount: number;
  readonly gaCount: number;
  readonly totalCount: number;
  readonly seatsTotal: number;
  readonly gaTotal: number;
  readonly grandTotal: number;
  readonly grandOriginalTotal: number;
  readonly totalSavings: number;
}
export type Promo = { id?: string; text?: string } & (
  | { discount: number; discountedPrice?: never; buyX?: never; getY?: never }
  | { discountedPrice: number; discount?: never; buyX?: never; getY?: never }
  | { buyX: number; getY: number; discount?: never; discountedPrice?: never }
);
export interface Inventory {
  currency?: string;
  seats?: Array<{
    id?: string;
    key?: string;
    status?: Status;
    price?: number;
    currency?: string;
  }>;
  ga?: Array<{
    sectionId: string;
    available?: number;
    capacity?: number;
    total?: number;
    status?: Status;
    price?: number;
    currency?: string;
  }>;
}
export interface InventoryResult {
  success: true;
  matched: string[];
  unmatched: string[];
  adjusted: string[];
}
export interface SelectionResult {
  success: boolean;
  selected?: boolean;
  quantity?: number;
  reason?: string;
  max?: number;
  orphanSeats?: readonly Seat[];
}
export interface Section {
  readonly id: string;
  readonly name: string;
  readonly type: "ga" | "regular";
  readonly isZone: boolean;
  readonly seatCount: number;
  readonly pricing: { basePrice: number };
}
export interface SMFSeat {
  id?: string;
  r?: number;
  c?: number;
  n?: string | number;
  number?: string | number;
  rowIndex?: number;
  columnIndex?: number;
  x?: number;
  y?: number;
  relativeX?: number;
  relativeY?: number;
  baseX?: number;
  baseY?: number;
  sn?: boolean | number;
  specialNeeds?: boolean;
  price?: number;
  [key: string]: unknown;
}
export interface SMFSection {
  id?: string;
  name: string;
  type?: "regular" | "ga";
  isZone?: boolean;
  x?: number;
  y?: number;
  width: number;
  height: number;
  seats?: SMFSeat[];
  pricing?: { basePrice: number };
  [key: string]: unknown;
}
export interface SMFMap {
  format: "SMF";
  version: string;
  sections: SMFSection[];
  underlay?: {
    sourceUrl?: string | null;
    dataUrl?: string | null;
    visible?: boolean;
    x?: number;
    y?: number;
    scale?: number;
    opacity?: number;
  };
  [key: string]: unknown;
}
export interface RendererOptions {
  mode?: "booking" | "preview";
  locale?: string;
  currency?: string;
  strings?: Record<string, string>;
  signal?: AbortSignal;
  maxSelectedSeats?: number;
  preventOrphanSeats?: boolean;
  seatRadius?: number;
  seatChunkSize?: number;
  seatTextureResolution?: number;
  seatLabelSize?: number;
  bookedColor?: number;
  reservedColor?: number;
  backgroundColor?: number;
  backgroundAlpha?: number;
  antialias?: boolean;
  resolution?: number;
  padding?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomSpeed?: number;
  animationDuration?: number;
  sectionZoomPadding?: number;
  enableZoneZoom?: boolean;
  enableSectionZoom?: boolean;
  mobileRequireZoomForSelection?: boolean;
  mobileMinZoomForSelection?: number;
  mobileSeatHitareaScale?: number;
  showGrid?: boolean;
  gridSize?: number;
  gridColor?: number;
  gridLineWidth?: number;
  orphanHighlightEnabled?: boolean;
  onCartChange?: (cart: Cart) => void;
  onSeatSelect?: (seat: Seat) => void;
  onSeatDeselect?: (seat: Seat) => void;
}
export interface RendererEvents {
  cartChange: Cart;
  "seat-selected": { seat: Seat; sectionId: string };
  "seat-deselected": { seat: Seat; sectionId: string };
  seatLoadProgress: { loaded: number; total: number; percent: number };
  mapFullyLoaded: { totalSections: number };
  mapZonesLoaded: { zoneCount: number };
  "renderer-error": { code: string; message: string; path: string };
  "renderer-diagnostic": {
    code: string;
    message: string;
    identifiers?: string[];
  };
  "ga-selection-change": {
    sectionId?: string;
    quantity?: number;
    allSelections: readonly GALine[];
  };
  gaSelectionConfirm: {
    sectionId: string;
    quantity: number;
    allSelections: readonly GALine[];
  };
  "selection-limit-reached": SelectionResult;
  "selection-blocked": SelectionResult;
  "orphan-seat-blocked": SelectionResult;
  "selections-cleared": Record<string, never>;
}
export class RendererError extends Error {
  readonly code: string;
  readonly path: string;
  constructor(code: string, message: string, path?: string);
}
export class SeatMapRenderer {
  private constructor(container: HTMLElement, options?: RendererOptions);
  static create(
    container: HTMLElement,
    options?: RendererOptions,
  ): Promise<SeatMapRenderer>;
  readonly isInitialized: boolean;
  loadData(map: SMFMap, options?: { signal?: AbortSignal }): Promise<void>;
  loadInventory(
    data: Inventory,
    options?: { mode?: "snapshot" | "patch" },
  ): InventoryResult;
  getSeats(): readonly Seat[];
  getCart(): Cart;
  getSections(): readonly Section[];
  selectSeat(id: string): SelectionResult;
  deselectSeat(id: string): SelectionResult;
  clearSelections(): void;
  setGAQuantity(id: string, quantity: number): SelectionResult;
  getGASelections(): readonly GALine[];
  decreaseGASelection(id: string): SelectionResult;
  clearGASelections(): void;
  setSectionPromo(id: string, promo: Promo | null): void;
  setSectionPromos(
    promos: Record<string, Promo | null> | Array<Promo & { sectionId: string }>,
  ): void;
  getSectionPromo(id: string): Promo | null;
  clearSectionPromo(id: string): void;
  clearAllPromos(): void;
  getUnmatchedInventoryKeys(): string[];
  formatPrice(minorUnits: number): string;
  fitToView(animate?: boolean): void;
  fitToSections(animate?: boolean): void;
  centerMap(): void;
  zoomToSectionById(id: string, point?: { x: number; y: number }): boolean;
  zoomBy(factor: number): void;
  setGridVisible(show: boolean): void;
  setGridColor(color: number): void;
  getDiagnostics(): {
    initialized: boolean;
    ready: boolean;
    seatViews: number;
    sections: number;
    textures: number;
    sharedImages: number;
    highlightFrames: number;
    viewportAnimation: boolean;
  };
  destroy(): void;
}
