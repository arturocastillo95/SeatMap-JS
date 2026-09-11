import {
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const rendererRoot = resolve(repoRoot, "renderer");
const outputDir = resolve(rendererRoot, ".pages");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

cpSync(resolve(rendererRoot, "examples"), resolve(outputDir, "examples"), {
  recursive: true,
});
cpSync(resolve(rendererRoot, "dist"), resolve(outputDir, "dist"), {
  recursive: true,
});
for (const file of ["demo-booking.html", "demo-booking-bundled.html"])
  cpSync(resolve(rendererRoot, file), resolve(outputDir, file));
cpSync(
  resolve(rendererRoot, "demo-venue.json"),
  resolve(outputDir, "demo-venue.json"),
);
cpSync(
  resolve(repoRoot, "node_modules/pixi.js/dist/pixi.min.js"),
  resolve(outputDir, "dist/pixi.min.js"),
);
cpSync(
  resolve(repoRoot, "node_modules/pixi.js/dist/pixi.min.js.map"),
  resolve(outputDir, "dist/pixi.min.js.map"),
);
cpSync(
  resolve(repoRoot, "node_modules/pixi.js/LICENSE"),
  resolve(outputDir, "dist/PIXI-LICENSE"),
);
writeFileSync(
  resolve(outputDir, "index.html"),
  '<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=examples/booking/index.html"><title>SeatMap</title></head><body><a href="examples/booking/index.html">Abrir demostración de compra</a></body></html>',
);

for (const relativePath of ["examples/booking/index.html", "examples/compact/index.html"]) {
  const examplePath = resolve(outputDir, relativePath);
  const example = readFileSync(examplePath, "utf8")
    .replace("../../assets/tooltip.css", "../../dist/renderer.css")
    .replace(
      '<script type="module">',
      '<script src="../../dist/pixi.min.js"></script><script src="../../dist/seatmap-renderer.umd.js"></script><script type="module">',
    )
    .replace(
      'import { SeatMapRenderer } from "../../SeatMapRenderer.js";',
      "const { SeatMapRenderer } = window.SeatMapRenderer;",
    );
  writeFileSync(examplePath, example);
}

// Disable Jekyll processing so asset paths are served exactly as emitted.
writeFileSync(resolve(outputDir, ".nojekyll"), "");

console.log(`Prepared GitHub Pages artifact at ${outputDir}`);
