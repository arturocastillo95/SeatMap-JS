import * as PIXI from "pixi.js";
import { abortable, checkSignal } from "../core/Lifecycle.js";

// Dedicated, reference-counted textures: never destroy textures in the host's Assets cache.
const images = new Map();
export function sharedImageCount() {
  return images.size;
}
export async function acquireImage(url, signal) {
  let entry = images.get(url);
  if (!entry) {
    entry = { refs: 0, texture: null };
    entry.promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () =>
        resolve(
          new PIXI.Texture({
            source: new PIXI.ImageSource({ resource: image }),
          }),
        );
      image.onerror = () => reject(new Error("Unable to load underlay image"));
      image.src = url;
    }).then((texture) => {
      entry.texture = texture;
      return texture;
    });
    images.set(url, entry);
  }
  entry.refs++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    if (--entry.refs === 0) {
      if (images.get(url) === entry) images.delete(url);
      entry.promise.then(
        (texture) => texture.destroy(true),
        () => {},
      );
    }
  };
  try {
    const texture = await abortable(entry.promise, signal);
    checkSignal(signal);
    return { texture, release };
  } catch (error) {
    release();
    throw error;
  }
}
export async function renderUnderlay(viewport, data, { signal } = {}) {
  const url = data.sourceUrl || data.dataUrl;
  if (!url) return null;
  const asset = await acquireImage(url, signal);
  try {
    checkSignal(signal);
    const sprite = new PIXI.Sprite(asset.texture);
    sprite.position.set(data.x ?? 0, data.y ?? 0);
    sprite.scale.set(data.scale ?? 1);
    sprite.alpha = data.opacity ?? 1;
    sprite.isUnderlay = true;
    sprite.releaseAsset = asset.release;
    viewport.addChildAt(sprite, 0);
    return sprite;
  } catch (error) {
    asset.release();
    throw error;
  }
}
