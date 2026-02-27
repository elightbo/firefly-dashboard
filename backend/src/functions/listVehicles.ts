import { desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { vehicles } from '../db/schema.js';

export interface VehicleRecord {
  id: number;
  year: number;
  make: string;
  model: string;
  tags: string[];
  mileageStart: number | null;
  mileage: number | null;
  milesDriven: number | null;
  notes: string | null;
}

export async function listVehicles(): Promise<VehicleRecord[]> {
  const rows = await db.select().from(vehicles).orderBy(desc(vehicles.year));
  return rows.map(r => ({
    id: r.id,
    year: r.year,
    make: r.make,
    model: r.model,
    tags: r.tags,
    mileageStart: r.mileageStart,
    mileage: r.mileage,
    milesDriven:
      r.mileage != null && r.mileageStart != null ? r.mileage - r.mileageStart : null,
    notes: r.notes,
  }));
}
