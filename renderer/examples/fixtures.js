/** Reproducible 1k/10k benchmark maps; prices in legacy SMF major units. */
export function makeMap(count = 1000) {
  const sections = [];
  for (let s = 0; s < Math.ceil(count / 1000); s++)
    sections.push({
      id: `section-${s}`,
      name: `Sección ${s + 1}`,
      type: "regular",
      x: (s % 5) * 850,
      y: Math.floor(s / 5) * 600,
      width: 800,
      height: 550,
      rowLabels: { type: "letters", start: "A" },
      pricing: { basePrice: 150 },
      style: { seatColor: 0xffffff, sectionColor: 0x4f6860 },
      seats: Array.from(
        { length: Math.min(1000, count - s * 1000) },
        (_, i) => ({
          id: `seat-${s * 1000 + i}`,
          r: Math.floor(i / 40),
          c: i % 40,
          n: String((i % 40) + 1),
          x: 15 + (i % 40) * 19,
          y: 15 + Math.floor(i / 40) * 20,
          sn: i === 0,
        }),
      ),
    });
  return { format: "SMF", version: "2.1.0", sections };
}
export function inventory(map) {
  return {
    currency: "MXN",
    seats: map.sections.flatMap((s) =>
      s.seats.map((x) => ({ id: x.id, status: "available", price: 15000 })),
    ),
    ga: map.sections
      .filter((s) => s.type === "ga")
      .map((s) => ({ sectionId: s.id, available: 10, price: 15000 })),
  };
}
