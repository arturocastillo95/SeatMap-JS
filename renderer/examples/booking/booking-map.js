/** Presentation only: keep venue identities, geometry and inventory unchanged. */
export function presentBookingMap(source) {
  const map = structuredClone(source);
  // The maintained demo's underlay is local; custom venues keep their own image.
  if (map.underlay?.sourceUrl === 'https://i.postimg.cc/X3JqYv3K/mapbase.jpg') {
    map.underlay.sourceUrl = new URL('./venue-underlay.svg', import.meta.url).href;
    map.underlay.x = 400;
    map.underlay.width = 1000;
  }
  for (const section of map.sections) {
    const color = section.name?.startsWith('VIP') ? 0xc18119
      : section.name?.startsWith('ORO') ? 0x8751bb
      : section.type === 'ga' ? 0x288b83 : 0x2563eb;
    section.style = { ...section.style, seatColor: color, seatTextColor: 0xffffff,
      glow: { ...section.style?.glow, enabled: false } };
    if (section.isZone) {
      section.style.sectionColor = 0xced3dc;
      section.fillOpacity = 0.12;
      section.showZoneLabel = false;
      section.labelColor = 0x626b79;
    } else if (section.type === 'ga') {
      section.style.sectionColor = 0x288b83;
      section.gaLabelColor = 0x174b48;
    }
    if (section.rowLabels) section.rowLabels.color = 0x586174;
  }
  return map;
}
