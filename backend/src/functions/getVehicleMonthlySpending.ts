import { and, eq, gte, lte, sum, or, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { vehicles, transactions } from '../db/schema.js';
import { toNum } from './utils.js';

export interface VehicleMonthlyPoint {
  vehicleId: number;
  label: string;   // "2019 Ford Fiesta ST"
  monthly: Record<string, number>;  // YYYY-MM -> total
}

export interface VehicleMonthlySpendingResult {
  months: string[];         // ordered YYYY-MM slots
  series: VehicleMonthlyPoint[];
}

export async function getVehicleMonthlySpending(
  months = 12,
): Promise<VehicleMonthlySpendingResult> {
  const now = new Date();
  const end = now.toISOString().split('T')[0];
  const startDate = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  const start = startDate.toISOString().split('T')[0];

  // Build the ordered list of YYYY-MM slots
  const monthSlots: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthSlots.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const allVehicles = await db.select().from(vehicles).orderBy(vehicles.year);

  const series: VehicleMonthlyPoint[] = [];

  for (const vehicle of allVehicles) {
    if (vehicle.tags.length === 0) {
      series.push({
        vehicleId: vehicle.id,
        label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        monthly: Object.fromEntries(monthSlots.map(m => [m, 0])),
      });
      continue;
    }

    const tagConditions = vehicle.tags.map(tag =>
      sql`${transactions.tags} @> ARRAY[${tag}]::text[]`,
    );

    const rows = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
        total: sum(transactions.amount),
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
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

    const monthly: Record<string, number> = Object.fromEntries(monthSlots.map(m => [m, 0]));
    for (const row of rows) {
      if (row.month in monthly) {
        monthly[row.month] = Math.round(toNum(row.total) * 100) / 100;
      }
    }

    series.push({
      vehicleId: vehicle.id,
      label: `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      monthly,
    });
  }

  return { months: monthSlots, series };
}
