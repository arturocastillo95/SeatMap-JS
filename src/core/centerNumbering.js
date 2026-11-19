export function planCenterNumbering(seats, split, oddSide, replaceManual) {
  const rows = new Map();
  for (const seat of seats) {
    const left = seat.colIndex < split;
    const distance = left ? split - 1 - seat.colIndex : seat.colIndex - split;
    const odd = left === (oddSide === 'left');
    const keepManual = seat.isManualNumber && !replaceManual;
    const number = keepManual ? String(seat.seatNumber) : String(2 * distance + (odd ? 1 : 2));
    if (!rows.has(seat.rowIndex)) rows.set(seat.rowIndex, []);
    rows.get(seat.rowIndex).push({ seat, number, keepManual });
  }

  const changes = [];
  const conflicts = [];
  const preview = new Map();
  for (const [row, entries] of [...rows].sort(([a], [b]) => a - b)) {
    entries.sort((a, b) => a.seat.colIndex - b.seat.colIndex);
    const numbers = entries.map(({ number }) => number);
    if (new Set(numbers).size !== numbers.length) conflicts.push(row);
    preview.set(row, numbers);
    for (const entry of entries) {
      if (!entry.keepManual) changes.push(entry);
    }
  }
  return { changes, conflicts, preview };
}
