import { api } from '@/api/whagonsApi';
import { db } from '@/store/dexie';

type ReorderCard = { id: number; position: number };

/**
 * Reorder KPI cards (batch endpoint) with optimistic updates to Dexie.
 *
 * UI calls this directly - useLiveQuery provides reactivity.
 */
export async function reorderKpiCards(cards: ReorderCard[]): Promise<void> {
  // Get current cards for rollback
  const prev = await db.table('kpi_cards').toArray();

  // Optimistic update in Dexie immediately
  for (const c of cards) {
    const existing = prev.find(r => r.id === c.id);
    if (existing) {
      await db.table('kpi_cards').put({ ...existing, position: c.position });
    }
  }

  try {
    await api.post('/kpi-cards/reorder', { cards });
    // Success - useLiveQuery will react automatically to the Dexie changes
  } catch (error) {
    // Rollback: restore previous positions
    for (const row of prev) {
      if (row?.id == null) continue;
      await db.table('kpi_cards').put(row);
    }
    throw error;
  }
}
