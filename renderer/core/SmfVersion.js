export const SUPPORTED_SMF_VERSIONS = "2.0, 2.1 and 2.2";
export const DEFAULT_STROKE_WIDTH = 2;

export function supportsSmfVersion(version) {
  return typeof version === "string" && /^2\.[012]\.\d+$/.test(version);
}

export function versionForSections(sections) {
  const needs22 = sections.some(({ rowLabels, style }) =>
    rowLabels?.labels?.length ||
    (style?.strokeWidth ?? DEFAULT_STROKE_WIDTH) !== DEFAULT_STROKE_WIDTH ||
    (style?.fillVisible === false && style.strokeVisible !== false)
  );
  return needs22 ? "2.2.0" : "2.1.0";
}

export function legacySeatId(sectionId, row, number) {
  return `legacy:${JSON.stringify([sectionId, row, String(number)])}`;
}
