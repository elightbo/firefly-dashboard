import type { FastifyInstance } from 'fastify';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { vehicles } from '../db/schema.js';

interface VehicleBody {
  year: number;
  make: string;
  model: string;
  tags: string[];
  mileageStart?: number;
  mileage?: number;
  notes?: string;
}

export async function vehicleRoutes(app: FastifyInstance) {
  // GET /api/vehicles
  app.get('/vehicles', {
    schema: {
      tags: ['Vehicles'],
      summary: 'List all vehicles ordered by year desc',
    },
  }, async () => {
    return db.select().from(vehicles).orderBy(desc(vehicles.year));
  });

  // POST /api/vehicles
  app.post<{ Body: VehicleBody }>('/vehicles', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Create a vehicle',
      body: {
        type: 'object',
        required: ['year', 'make', 'model', 'tags'],
        properties: {
          year:         { type: 'integer' },
          make:         { type: 'string' },
          model:        { type: 'string' },
          tags:         { type: 'array', items: { type: 'string' } },
          mileageStart: { type: 'integer' },
          mileage:      { type: 'integer' },
          notes:        { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const { year, make, model, tags, mileageStart, mileage, notes } = req.body;
    const [created] = await db.insert(vehicles).values({
      year,
      make,
      model,
      tags,
      mileageStart: mileageStart ?? null,
      mileage: mileage ?? null,
      notes: notes ?? null,
    }).returning();
    return reply.code(201).send(created);
  });

  // PUT /api/vehicles/:id
  app.put<{ Params: { id: string }; Body: VehicleBody }>('/vehicles/:id', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Update a vehicle',
      params: { type: 'object', properties: { id: { type: 'string' } } },
      body: {
        type: 'object',
        required: ['year', 'make', 'model', 'tags'],
        properties: {
          year:         { type: 'integer' },
          make:         { type: 'string' },
          model:        { type: 'string' },
          tags:         { type: 'array', items: { type: 'string' } },
          mileageStart: { type: 'integer' },
          mileage:      { type: 'integer' },
          notes:        { type: 'string' },
        },
      },
    },
  }, async (req, reply) => {
    const vehicleId = parseInt(req.params.id, 10);
    const { year, make, model, tags, mileageStart, mileage, notes } = req.body;
    const [updated] = await db
      .update(vehicles)
      .set({ year, make, model, tags, mileageStart: mileageStart ?? null, mileage: mileage ?? null, notes: notes ?? null })
      .where(eq(vehicles.id, vehicleId))
      .returning();
    if (!updated) return reply.code(404).send({ error: 'Vehicle not found' });
    return updated;
  });

  // DELETE /api/vehicles/:id
  app.delete<{ Params: { id: string } }>('/vehicles/:id', {
    schema: {
      tags: ['Vehicles'],
      summary: 'Delete a vehicle',
      params: { type: 'object', properties: { id: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const vehicleId = parseInt(req.params.id, 10);
    const result = await db
      .delete(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .returning({ id: vehicles.id });
    if (result.length === 0) return reply.code(404).send({ error: 'Vehicle not found' });
    return { ok: true };
  });
}
