import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { test } from "node:test";
import { auditMap } from "../audit/auditMap.js";
import { runAuditCli } from "../audit/cli.js";

const fixture = async (name) =>
  JSON.parse(
    await readFile(new URL(`fixtures/maps/${name}.json`, import.meta.url)),
  );

test("malformed label objects cannot interrupt the remaining audit", async () => {
  const map = await fixture("valid");
  map.sections[0].seats[0].n = { toString: 1 };
  map.sections[0].seats[1].x = "invalid";
  const before = structuredClone(map);
  const report = auditMap(map);
  assert.equal(report.valid, false);
  assert.ok(report.issues.some((issue) => issue.code === "INVALID_SEAT_LABEL"));
  assert.ok(report.issues.some((issue) => issue.path === "sections[0].seats[1].x"));
  assert.deepEqual(map, before);
});

test("map audit accepts a valid map without modifying it", async () => {
  const map = await fixture("valid");
  const before = structuredClone(map);
  const report = auditMap(map);
  assert.equal(report.valid, true);
  assert.deepEqual(report.summary, {
    errors: 0,
    warnings: 0,
    sections: 1,
    seats: 2,
  });
  assert.deepEqual(map, before);
});

test("map audit reports all duplicate, label, and geometry problems with paths", async () => {
  const report = auditMap(await fixture("invalid"));
  const codes = new Set(report.issues.map((issue) => issue.code));
  assert.equal(report.valid, false);
  for (const code of [
    "DUPLICATE_SECTION_ID",
    "DUPLICATE_SEAT_ID",
    "AMBIGUOUS_INVENTORY_KEY",
    "INVALID_SEAT_LABEL",
    "INVALID_GEOMETRY",
    "INVALID_POLYGON",
    "INVALID_ROW_LABEL_START",
    "INVALID_PRICE",
  ])
    assert.equal(codes.has(code), true, `missing ${code}`);
  assert.ok(report.issues.every((issue) => typeof issue.path === "string"));
  assert.equal(
    report.issues.find((issue) => issue.code === "DUPLICATE_SEAT_ID").details
      .firstPath,
    "sections[0].seats[0].id",
  );
});

test("map audit continues after malformed collections and supports CLI JSON", async () => {
  const malformed = auditMap({
    format: "SMF",
    version: "2.1.0",
    sections: {},
  });
  assert.equal(malformed.valid, false);
  assert.equal(malformed.issues[0].path, "sections");

  const output = [];
  const errors = [];
  const code = await runAuditCli(
    [new URL("fixtures/maps/valid.json", import.meta.url).pathname, "--json"],
    {
      log: (line) => output.push(line),
      error: (line) => errors.push(line),
    },
  );
  assert.equal(code, 0);
  assert.equal(JSON.parse(output[0]).valid, true);
  assert.deepEqual(errors, []);
});
