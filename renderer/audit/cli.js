import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { auditMap } from "./auditMap.js";

export async function runAuditCli(argv, io = console) {
  const json = argv.includes("--json");
  const args = argv.filter((arg) => arg !== "--json");
  if (args.length !== 1) {
    io.error("Usage: seatmap-renderer-audit <map.json> [--json]");
    return 2;
  }

  const file = resolve(args[0]);
  let map;
  try {
    map = JSON.parse(await readFile(file, "utf8"));
  } catch (cause) {
    io.error(`Unable to read JSON map ${file}: ${cause.message}`);
    return 2;
  }

  const report = auditMap(map);
  if (json) io.log(JSON.stringify({ file, ...report }, null, 2));
  else printReport(file, report, io);
  return report.valid ? 0 : 1;
}

function printReport(file, report, io) {
  const { errors, warnings, sections, seats } = report.summary;
  io.log(
    `${file}: ${sections} sections, ${seats} seats, ${errors} errors, ${warnings} warnings`,
  );
  for (const issue of report.issues) {
    const location = issue.path ? ` ${issue.path}` : "";
    const first = issue.details?.firstPath
      ? ` (first: ${issue.details.firstPath})`
      : "";
    io.log(
      `${issue.severity.toUpperCase()} ${issue.code}${location}: ${issue.message}${first}`,
    );
  }
}
