const id = { type: 'string', minLength: 1 };
const object = { type: 'object' };
const command = (type, required, properties) => ({
  type: 'object', required: ['type', ...required], additionalProperties: false,
  properties: { type: { const: type }, ...properties },
});
export const commandSchemas = {
  'section.create': command('section.create', ['id', 'rows', 'columns'], {
    id, name: { type: 'string' }, x: { type: 'number', default: 0 }, y: { type: 'number', default: 0 },
    rows: { type: 'integer', minimum: 1 }, columns: { type: 'integer', minimum: 1 },
    spacing: { type: 'number', minimum: 20, default: 24 },
  }),
  'section.update': command('section.update', ['id', 'patch'], { id, patch: {
    type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, metadata: object, pricing: object, groupId: { type: ['string', 'null'] } },
  } }),
  'section.remove': command('section.remove', ['id'], { id }),
  'seats.remove': command('seats.remove', ['id', 'seatIds'], { id, seatIds: { type: 'array', items: id } }),
  'venue.update': command('venue.update', ['patch'], { patch: {
    type: 'object', additionalProperties: false, properties: { name: { type: 'string' }, location: object, metadata: object },
  } }),
};
