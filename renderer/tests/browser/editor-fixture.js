import * as PIXI from 'pixi.js';
import { State } from '../../../src/core/state.js';
import { FileManager } from '../../../src/managers/fileManager.js';
globalThis.PIXI = PIXI;
const app = new PIXI.Application();
await app.init({ width: 800, height: 600 });
document.body.appendChild(app.canvas);
Object.assign(State, { app, world: new PIXI.Container() });
app.stage.addChild(State.world);
for (const key of ['zoneLayer', 'sectionLayer', 'seatLayer', 'underlayLayer']) {
  State[key] = new PIXI.Container(); State.world.addChild(State[key]);
}
window.editor = { State, FileManager, PIXI };
