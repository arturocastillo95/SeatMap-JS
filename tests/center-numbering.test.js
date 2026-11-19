import test from 'node:test';
import assert from 'node:assert/strict';
import { planCenterNumbering } from '../src/core/centerNumbering.js';

test('center numbering counts missing columns from the divider', () => {
  const seats = [19, 31].map(colIndex => ({ rowIndex: 23, colIndex, seatNumber: 1 }));
  assert.deepEqual(planCenterNumbering(seats, 25, 'left', false).preview.get(23), ['11', '14']);
  assert.deepEqual(planCenterNumbering(seats, 25, 'right', false).preview.get(23), ['12', '13']);
});

test('manual numbers are preserved and conflicts can be resolved before application', () => {
  const manual = { rowIndex: 1, colIndex: 0, seatNumber: 2, isManualNumber: true };
  const seats = [manual, { rowIndex: 1, colIndex: 1, seatNumber: 5 }];
  const preserved = planCenterNumbering(seats, 1, 'left', false);
  assert.deepEqual(preserved.conflicts, [1]);
  assert.deepEqual(preserved.changes.map(({ seat }) => seat), [seats[1]]);
  assert.deepEqual(planCenterNumbering(seats, 1, 'left', true).preview.get(1), ['1', '2']);
  assert.equal(manual.seatNumber, 2);
});
