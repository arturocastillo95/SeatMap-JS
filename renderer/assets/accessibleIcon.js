import { Graphics } from "pixi.js";
/** Bundled vector wheelchair mark; no network font or platform glyph required. */
export function createAccessibleIcon(renderer) {
  const g = new Graphics();
  g.circle(1, -5, 1.5).fill(0xffffff);
  g.moveTo(0, -2)
    .lineTo(0, 2)
    .lineTo(4, 2)
    .lineTo(6, 5)
    .stroke({ color: 0xffffff, width: 1.5 });
  g.moveTo(0, -1).lineTo(4, -1).stroke({ color: 0xffffff, width: 1.5 });
  g.arc(-1, 3, 3.5, 0.1, Math.PI * 1.6).stroke({ color: 0xffffff, width: 1.5 });
  const texture = renderer.generateTexture({ target: g, resolution: 2 });
  g.destroy();
  return texture;
}
