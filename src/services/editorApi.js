import { mapFingerprint } from './mapSnapshot.js';
import { SMFValidator } from '../core/smfValidator.js';
import { commandSchemas } from './editorApiSchema.js';

const LIMITS = Object.freeze({ sections: 2000, seats: 20000, commands: 100 });
const PATCH_FIELDS = Object.freeze({
  'venue.update': ['name', 'location', 'metadata'],
  'section.update': ['name', 'pricing', 'metadata', 'groupId'],
});
const failure = (code, message) => Object.assign(new Error(message), { code });
const jsonCopy = value => JSON.parse(JSON.stringify(value));

export function validateEditorMap(map) {
  try {
    const result = SMFValidator.validate(map);
    if (!result.valid) return result;
    let cells = 0;
    const ids = new Set();
    const seatIds = new Set();
    for (const section of map.sections) {
      if (typeof section.id !== 'string' || !section.id || ids.has(section.id)) result.errors.push('Every section needs a unique string id');
      ids.add(section.id);
      if (section.name !== undefined && typeof section.name !== 'string') result.errors.push('Section name must be a string');
      if (section.ga && (!Number.isInteger(section.ga.capacity) || section.ga.capacity < 0)) result.errors.push('GA capacity must be a non-negative integer');
      if (section.metadata !== undefined && (!section.metadata || typeof section.metadata !== 'object' || Array.isArray(section.metadata))) result.errors.push('Section metadata must be an object');
      if (section.type !== 'ga') cells += section.base.rows * section.base.columns;
      const positions = new Set();
      if (section.type === 'ga' && section.seats?.length) result.errors.push('GA sections cannot contain individual seats');
      for (const seat of section.seats || []) {
        const row = seat.r ?? seat.rowIndex;
        const column = seat.c ?? seat.colIndex;
        const position = `${row}:${column}`;
        if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || column < 0 || row >= section.base.rows || column >= section.base.columns || positions.has(position)) result.errors.push('Seats need unique row/column positions within the section grid');
        positions.add(position);
        if (typeof seat.id !== 'string' || !seat.id || seatIds.has(seat.id)) result.errors.push('Every seat needs a globally unique string id');
        seatIds.add(seat.id);
      }
    }
    if (map.sections.length > LIMITS.sections || cells > LIMITS.seats) result.errors.push(`Limit: ${LIMITS.sections} sections and ${LIMITS.seats} generated seat positions`);
    return { ...result, valid: result.errors.length === 0 };
  } catch (error) { return { valid: false, errors: [error.message], warnings: [] }; }
}

function assertSchema(value, schema, path = 'command') {
  if (schema.const !== undefined && value !== schema.const) throw failure('INVALID_REQUEST', `${path} has an unsupported value`);
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  const matches = types.some(type => type === 'null' ? value === null
    : type === 'array' ? Array.isArray(value)
    : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
    : type === 'integer' ? Number.isInteger(value)
    : type === 'number' ? Number.isFinite(value)
    : type === undefined || typeof value === type);
  if (!matches) throw failure('INVALID_REQUEST', `${path} must be ${types.join(' or ')}`);
  if (schema.minimum !== undefined && value < schema.minimum) throw failure('INVALID_REQUEST', `${path} must be at least ${schema.minimum}`);
  if (schema.minLength !== undefined && value.length < schema.minLength) throw failure('INVALID_REQUEST', `${path} cannot be empty`);
  if (schema.type === 'object') {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) throw failure('INVALID_REQUEST', `${path}.${key} is required`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties && Object.hasOwn(schema.properties, key)) assertSchema(item, schema.properties[key], `${path}.${key}`);
      else if (schema.additionalProperties === false) throw failure('INVALID_REQUEST', `Unsupported field: ${path}.${key}`);
    }
  }
  if (schema.items) for (const item of value) assertSchema(item, schema.items, `${path}[]`);
}

/** JSON-only public boundary. The importer owns rendering and rollback. */
export function createEditorApi({ snapshot, importMap, selection = () => [], isBusy = () => false }) {
  const session = crypto.randomUUID();
  let revision = 0;
  let lastFingerprint;
  let applying = false;
  function read() {
    if (isBusy()) throw failure('BUSY', 'A map import is in progress');
    const map = jsonCopy(snapshot());
    const fingerprint = mapFingerprint(map);
    if (fingerprint !== lastFingerprint) { revision++; lastFingerprint = fingerprint; }
    return { revision: `${session}:${revision}`, map, selectedSectionIds: [...selection()], summary: {
      sections: map.sections.length,
      seats: map.sections.reduce((count, section) => count + (section.seats?.length || 0), 0),
      gaCapacity: map.sections.reduce((count, section) => count + (section.ga?.capacity || 0), 0),
    } };
  }
  function checkRevision(expectedRevision) {
    const current = read();
    if (expectedRevision !== current.revision) throw failure('REVISION_CONFLICT', 'Read a fresh snapshot and retry your changes');
    return current;
  }
  async function commit(expectedRevision, prepare) {
    if (applying || isBusy()) return { ok: false, error: { code: 'BUSY', message: 'Another edit is in progress' } };
    applying = true;
    try {
      const current = checkRevision(expectedRevision);
      const map = prepare(current.map);
      const validation = validateEditorMap(map);
      if (!validation.valid) return { ok: false, error: { code: 'VALIDATION_FAILED', message: validation.errors.join('; ') }, validation };
      let success;
      try {
        success = await importMap(map, {
          source: 'agent', reportErrors: false, throwErrors: true,
          beforeReplace: () => checkRevision(expectedRevision),
        });
      } catch (error) {
        throw failure(error.code || 'IMPORT_FAILED', error.message);
      }
      if (!success) throw failure('IMPORT_FAILED', 'The map could not be loaded; the previous map is unchanged');
      return { ok: true, ...read(), warnings: validation.warnings };
    } catch (error) { return { ok: false, error: { code: error.code || 'INVALID_REQUEST', message: error.message } }; }
    finally { applying = false; }
  }
  function patch(target, values, fields) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) throw failure('INVALID_REQUEST', 'patch must be an object');
    for (const [key, value] of Object.entries(values)) {
      if (!fields.includes(key)) throw failure('INVALID_REQUEST', `Unsupported patch field: ${key}`);
      target[key] = jsonCopy(value);
    }
  }
  function commands(map, batch) {
    if (!Array.isArray(batch) || batch.length < 1 || batch.length > LIMITS.commands) throw failure('INVALID_REQUEST', `Provide 1–${LIMITS.commands} commands`);
    for (const command of batch) {
      const schema = commandSchemas[command?.type];
      if (!schema) throw failure('INVALID_REQUEST', `Unsupported command: ${command?.type}`);
      assertSchema(command, schema);
      if (command.type === 'venue.update') { patch(map.venue, command.patch, PATCH_FIELDS[command.type]); continue; }
      if (command.type === 'section.create') {
        const { id, name = id, x = 0, y = 0, rows, columns, spacing = 24 } = command;
        if (typeof id !== 'string' || !id || !Number.isInteger(rows) || rows < 1 || !Number.isInteger(columns) || columns < 1 || rows * columns > LIMITS.seats || !Number.isFinite(spacing) || spacing < 20 || !Number.isFinite(x) || !Number.isFinite(y)) throw failure('INVALID_REQUEST', 'Provide a section id, finite x/y, positive integer rows/columns, and spacing >= 20');
        const cells = map.sections.reduce((count, section) => count + (section.type === 'ga' ? 0 : section.base.rows * section.base.columns), 0);
        if (map.sections.length >= LIMITS.sections || cells + rows * columns > LIMITS.seats) throw failure('LIMIT_EXCEEDED', 'The batch exceeds the editor map limits');
        const width = (columns - 1) * spacing + 40;
        const height = (rows - 1) * spacing + 40;
        map.sections.push({ id, name, x, y, width, height,
          base: { rows, columns, baseWidth: width, baseHeight: height },
          transform: { rotation: 0, curve: 0, stretchH: 0, stretchV: 0 },
          rowLabels: { type: 'letters', start: 'A', showLeft: true, showRight: false },
          seats: Array.from({ length: rows * columns }, (_, i) => ({
            id: `${id}:r${Math.floor(i / columns)}:c${i % columns}`,
            r: Math.floor(i / columns), c: i % columns, n: String(i % columns + 1),
            x: 20 + (i % columns) * spacing, y: 20 + Math.floor(i / columns) * spacing,
          })),
        });
        continue;
      }
      const section = map.sections.find(item => item.id === command.id);
      if (!section) throw failure('NOT_FOUND', `Section not found: ${command.id}`);
      if (command.type === 'section.update') patch(section, command.patch, PATCH_FIELDS[command.type]);
      else if (command.type === 'section.remove') map.sections = map.sections.filter(item => item !== section);
      else if (command.type === 'seats.remove') {
        if (!Array.isArray(command.seatIds) || command.seatIds.some(id => !section.seats?.some(seat => seat.id === id))) throw failure('NOT_FOUND', 'Every seatId must belong to the target section');
        section.seats = section.seats.filter(seat => !command.seatIds.includes(seat.id));
      } else throw failure('INVALID_REQUEST', `Unsupported command: ${command.type}`);
    }
    return map;
  }
  return Object.freeze({
    version: '1.0.0',
    capabilities: () => jsonCopy({ version: '1.0.0', format: 'SMF 2.1', limits: LIMITS,
      methods: ['getSnapshot', 'validate', 'apply', 'replaceMap'],
      commands: ['venue.update', 'section.create', 'section.update', 'section.remove', 'seats.remove'],
      commandSchemas, patchFields: PATCH_FIELDS, revisionRequired: true, docs: 'docs/EDITOR_API.md' }),
    getSnapshot: read,
    validate: map => validateEditorMap(map),
    apply: request => commit(request?.expectedRevision, map => commands(map, jsonCopy(request.commands))),
    replaceMap: request => commit(request?.expectedRevision, () => jsonCopy(request.map)),
  });
}
