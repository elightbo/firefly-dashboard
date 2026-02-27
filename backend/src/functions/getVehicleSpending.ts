import { and, eq, gte, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { vehicles, transactions } from '../db/schema.js';
import { type Period, resolvePeriod, toNum } from './utils.js';

export interface VehicleSpendingTransaction {
  id: string;
  date: string;
  amount: number;
  description: string | null;
  notes: string | null;
  category: string | null;
  tags: string[];
}

export interface VehicleSpendingResult {
  vehicleId: number;
  period: { start: string; end: string };
  total: number;
  costPerMile: number | null;
  transactions: VehicleSpendingTransaction[];
}

export async function getVehicleSpending(
  vehicleId: number,
  period: Period = 'year_to_date',
): Promise<VehicleSpendingResult> {
  const { start, end } = resolvePeriod(period);

  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, vehicleId));
  if (!vehicle) throw new Error(`Vehicle ${vehicleId} not found`);

  if (vehicle.tags.length === 0) {
    return { vehicleId, period: { start, end }, total: 0, costPerMile: null, transactions: [] };
  }

  const tagConditions = vehicle.tags.map(tag =>
    sql`${transactions.tags} @> ARRAY[${tag}]::text[]`,
  );

  const rows = await db
    .select({
      id:          transactions.id,
      date:        transactions.date,
      amount:      transactions.amount,
      description: transactions.description,
      notes:       transactions.notes,
      category:    transactions.category,
      tags:        transactions.tags,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.type, 'withdrawal'),
        gte(transactions.date, start),
        lte(transactions.date, end),
        or(...tagConditions),
      ),
    )
    .orderBy(transactions.date);

  const total = Math.round(rows.reduce((s, r) => s + toNum(r.amount), 0) * 100) / 100;
  const milesDriven =
    vehicle.mileage != null && vehicle.mileageStart != null
      ? vehicle.mileage - vehicle.mileageStart
      : null;
  const costPerMile =
    milesDriven != null && milesDriven > 0
      ? Math.round((total / milesDriven) * 10000) / 10000
      : null;

  return {
    vehicleId,
    period: { start, end },
    total,
    costPerMile,
    transactions: rows.map(r => ({
      id:          r.id,
      date:        r.date,
      amount:      Math.round(toNum(r.amount) * 100) / 100,
      description: r.description,
      notes:       r.notes,
      category:    r.category,
      tags:        r.tags,
    })),
  };
}
