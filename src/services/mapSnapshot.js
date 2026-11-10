// Viewport movement and export timestamps do not make venue content dirty.
export function mapFingerprint(map) {
  const { modified: _modified, canvas: _canvas, ...content } = map;
  return JSON.stringify(content);
}
