import { State } from './state.js';

const layerKeys = ['zoneLayer', 'sectionLayer', 'seatLayer', 'underlayLayer'];

/** Build off-screen before replacing any live display objects. */
export async function replaceMap(data, build, underlays) {
  if (State.isImporting) throw new Error('A map import is already in progress');
  const documentData = structuredClone(data);
  delete documentData.sections;
  delete documentData.underlay;
  delete documentData.canvas;
  const previous = { ...State };
  const stagedLayers = Object.fromEntries(layerKeys.map(key => [key, new PIXI.Container()]));
  const body = globalThis.document?.body;
  const wasInert = body?.inert;
  const blockInput = event => { event.preventDefault(); event.stopImmediatePropagation(); };
  const inputEvents = ['keydown', 'keyup', 'pointerdown', 'pointermove', 'pointerup', 'wheel', 'click'];
  if (body) body.inert = true;
  for (const type of inputEvents) globalThis.window?.addEventListener(type, blockInput, { capture: true, passive: false });
  Object.assign(State, stagedLayers, {
    isImporting: true,
    sections: [], selectedSections: [], selectedSeats: [], sectionCounter: 1,
    activeSectionForSeats: null, contextMenuSection: null,
    underlaySprite: null, underlayData: null, underlayFileName: null,
    underlaySourceUrl: null, underlayResizeHandles: null,
    underlayX: 0, underlayY: 0, underlayScale: 1, underlayOpacity: 0.5, underlayVisible: true,
  });
  try {
    await build();
  } catch (error) {
    Object.assign(State, previous);
    for (const layer of Object.values(stagedLayers)) layer.destroy({ children: true });
    throw error;
  } finally {
    if (body) body.inert = wasInert;
    for (const type of inputEvents) globalThis.window?.removeEventListener(type, blockInput, true);
  }

  // No asynchronous work from here: retire the old scene and publish the new one.
  const replacement = { ...State };
  Object.assign(State, previous);
  underlays.disableInteractions();
  for (const key of layerKeys) {
    const layer = previous[key];
    for (const child of layer.removeChildren()) child.destroy({ children: true });
    for (const child of stagedLayers[key].removeChildren()) layer.addChild(child);
    stagedLayers[key].destroy();
  }
  Object.assign(State, replacement, Object.fromEntries(layerKeys.map(key => [key, previous[key]])), {
    isImporting: false, mapDocument: documentData,
    isEditSeatsMode: false, isSelecting: false, isDraggingSections: false,
    isCreating: false, isPanning: false, potentialDragStart: null,
    selectionRect: null, seatSelectionRect: null, pendingSection: null,
  });
  State.world.scale.set(data.canvas?.zoom ?? 1);
  State.world.position.set(data.canvas?.panX ?? 0, data.canvas?.panY ?? 0);
  if (State.underlaySprite && State.currentMode === 'underlay') {
    underlays.enableInteractions();
    underlays.addResizeHandles();
  }
  document.dispatchEvent(new CustomEvent('selectionchanged', { detail: { selectedSections: [] } }));
  document.dispatchEvent(new CustomEvent('underlayCleared'));
  if (State.underlaySprite) {
    document.dispatchEvent(new CustomEvent('underlayLoaded', { detail: {
      fileName: State.underlayFileName, width: State.underlaySprite.originalWidth,
      height: State.underlaySprite.originalHeight, sourceUrl: State.underlaySourceUrl,
    } }));
  }
}
