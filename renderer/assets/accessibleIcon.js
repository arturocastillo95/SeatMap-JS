import { Graphics } from "pixi.js";

/** Bundled, centered wheelchair mark; no font or platform glyph required. */
export function createAccessibleIcon(renderer, resolution = 4) {
  const g = new Graphics();
  // Transparent square fixes the texture origin so the asymmetric mark stays
  // centered when Pixi anchors the sprite at 0.5.
  g.rect(-6, -6, 12, 12).fill({ color: 0xffffff, alpha: 0 });
  g.circle(-1.6, -3.8, 1.15).fill(0xffffff);
  g.moveTo(-1.6, -2)
    .lineTo(-1, 0.7)
    .lineTo(1.5, 0.7)
    .lineTo(3.6, 3.6)
    .stroke({ color: 0xffffff, width: 1.35 });
  g.moveTo(-1.35, -0.9)
    .lineTo(1.2, -0.9)
    .stroke({ color: 0xffffff, width: 1.35 });
  g.arc(-0.9, 1.45, 3, 0.05, Math.PI * 1.62).stroke({
    color: 0xffffff,
    width: 1.35,
  });
  const texture = renderer.generateTexture({ target: g, resolution });
  g.destroy();
  return texture;
}
