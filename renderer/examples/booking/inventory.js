/** Deterministic demo inventory. All prices use integer minor units. */
export function createBookingInventory(renderer) {
  return {
    currency: "MXN",
    seats: renderer.getSeats().map((seat) => ({ id: seat.id, status: "available", price: seat.price })),
    ga: renderer.getSections().filter((section) => section.type === "ga" && !section.isZone).map((section) => ({
      sectionId: section.id,
      status: "available",
      available: 100,
      price: section.pricing.basePrice,
    })),
  };
}
