import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  realpathSync,
  cpSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "seatmap-package-"));
const run = (bin, args, cwd = temp) =>
  execFileSync(bin, args, {
    cwd,
    stdio: "pipe",
    env: { ...process.env, npm_config_cache: join(temp, "npm-cache") },
  }).toString();
try {
  const result = JSON.parse(
    run(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", temp],
      join(root, "renderer"),
    ),
  )[0];
  const modules = join(temp, "node_modules");
  mkdirSync(join(modules, "@seatmap-js"), { recursive: true });
  run("tar", ["-xzf", join(temp, result.filename), "-C", temp]);
  cpSync(join(temp, "package"), join(modules, "@seatmap-js", "renderer"), {
    recursive: true,
  });
  for (const example of [
    "examples/booking/index.html",
    "examples/booking/booking-demo.js",
    "examples/compact/index.html",
  ])
    if (!readFileSync(join(temp, "package", example), "utf8").length)
      throw new Error(`Packed renderer is missing ${example}`);
  symlinkSync(
    realpathSync(join(root, "node_modules", "pixi.js")),
    join(modules, "pixi.js"),
  );
  mkdirSync(join(modules, "@types"), { recursive: true });
  for (const name of [
    "react",
    "react-dom",
    "@types/react",
    "@types/react-dom",
  ]) {
    symlinkSync(
      realpathSync(join(root, "node_modules", name)),
      join(modules, name),
    );
  }
  cpSync(
    join(root, "renderer/examples/ReactSeatMap.tsx"),
    join(temp, "ReactSeatMap.tsx"),
  );
  writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "module" }));
  writeFileSync(
    join(temp, "esm.mjs"),
    `import assert from 'node:assert/strict';import {SeatMapRenderer} from '@seatmap-js/renderer';import fs from 'node:fs';assert.equal(typeof SeatMapRenderer.create,'function');assert.ok(fs.readFileSync(new URL(import.meta.resolve('@seatmap-js/renderer/styles.css')),'utf8').includes('seatmap-ui'));`,
  );
  run(process.execPath, ["esm.mjs"]);
  writeFileSync(
    join(temp, "cjs.cjs"),
    `const assert=require('node:assert/strict');assert.equal(typeof require('@seatmap-js/renderer').SeatMapRenderer.create,'function');`,
  );
  run(process.execPath, ["cjs.cjs"]);
  const audit = JSON.parse(
    run(process.execPath, [
      join(modules, "@seatmap-js/renderer/bin/audit-map.js"),
      join(modules, "@seatmap-js/renderer/demo-venue.json"),
      "--json",
    ]),
  );
  if (!audit.valid || audit.summary.seats !== 863)
    throw new Error("Packed map audit rejected the maintained demo venue");
  writeFileSync(
    join(temp, "consumer.ts"),
    `import {SeatMapRenderer,type Cart,type RendererEvents} from '@seatmap-js/renderer';async function main(host:HTMLElement){const r=await SeatMapRenderer.create(host,{currency:'MXN'});const cart:Cart=r.getCart();r.selectSeat('id');r.loadInventory({seats:[]});return cart;} const progress:RendererEvents['seatLoadProgress']={loaded:1,total:1,percent:100};`,
  );
  run(process.execPath, [
    join(root, "node_modules/typescript/bin/tsc"),
    "--noEmit",
    "--strict",
    "--target",
    "ES2022",
    "--module",
    "NodeNext",
    "--moduleResolution",
    "NodeNext",
    "--jsx",
    "react-jsx",
    "consumer.ts",
    "ReactSeatMap.tsx",
  ]);
  console.log(
    "Packed consumer checks passed: ES, CJS, SSR import, CSS export, map audit, TypeScript, React example, booking examples.",
  );
} finally {
  rmSync(temp, { recursive: true, force: true });
}
