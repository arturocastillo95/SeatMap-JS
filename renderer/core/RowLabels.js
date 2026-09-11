/** Generate a display label for a zero-based row position. */
export function getRowLabelText(index, type, startValue) {
  if (type === "numbers") {
    const start = Number.parseInt(startValue, 10) || 1;
    return String(index + start);
  }
  if (type !== "letters") return "";

  const start = startValue || "A";
  const offset =
    [...String(start)].reduce(
      (value, character) => value * 26 + character.charCodeAt(0) - 64,
      0,
    ) - 1;
  let labelIndex = index + offset;
  let label = "";
  while (labelIndex >= 0) {
    label = String.fromCharCode(65 + (labelIndex % 26)) + label;
    labelIndex = Math.floor(labelIndex / 26) - 1;
  }
  return label;
}

/** Build the authoritative row-index to display-label mapping. */
export function buildRowLabelMap(seats, rowLabelsConfig) {
  if (!Array.isArray(seats) || seats.length === 0) return {};
  const rows = [
    ...new Set(
      seats
        .map((seat) => seat.r ?? seat.rowIndex)
        .filter((row) => row !== undefined),
    ),
  ].sort((a, b) => a - b);
  const config = rowLabelsConfig || { type: "numbers" };
  return Object.fromEntries(
    rows.map((row, index) => [
      row,
      getRowLabelText(
        config.reversed ? rows.length - 1 - index : index,
        config.type,
        config.start,
      ),
    ]),
  );
}
