import type { SupabaseClient } from "@supabase/supabase-js";

interface ReleaseResult {
  released: number;
  errors: string[];
}

/**
 * Release all RESERVED allocations for a trade back to lenders.
 * Returns count of released allocations and any errors encountered.
 * Stops on first RPC failure to avoid inconsistent state.
 */
export async function releaseTradeAllocations(
  admin: SupabaseClient,
  tradeId: string,
  idempotencyPrefix: string,
): Promise<ReleaseResult> {
  const { data: allocs } = await admin
    .from("allocations")
    .select("id, lender_id, amount_slice")
    .eq("trade_id", tradeId)
    .eq("status", "RESERVED");

  if (!allocs || allocs.length === 0) {
    return { released: 0, errors: [] };
  }

  let released = 0;
  const errors: string[] = [];

  for (const alloc of allocs) {
    // Release funds back to lender's pot
    const { error: rpcErr } = await admin.rpc("update_lending_pot", {
      p_user_id: alloc.lender_id,
      p_entry_type: "RELEASE",
      p_amount: Number(alloc.amount_slice),
      p_trade_id: tradeId,
      p_allocation_id: alloc.id,
      p_description: `Release funds — trade ${tradeId} ${idempotencyPrefix}`,
      p_idempotency_key: `${idempotencyPrefix}-${tradeId}-${alloc.id}`,
    });

    if (rpcErr) {
      // Idempotency key duplicate = already released, safe to continue
      if (rpcErr.message?.includes("duplicate key")) {
        console.warn(
          `Allocation ${alloc.id} already released (idempotency hit), continuing`,
        );
      } else {
        errors.push(
          `Failed to release allocation ${alloc.id}: ${rpcErr.message}`,
        );
        // Stop processing — don't leave state half-released
        break;
      }
    }

    // Mark allocation as RELEASED
    const { error: updateErr } = await admin
      .from("allocations")
      .update({ status: "RELEASED" })
      .eq("id", alloc.id)
      .eq("status", "RESERVED"); // guard: only update if still RESERVED

    if (updateErr) {
      errors.push(
        `Failed to update allocation ${alloc.id} status: ${updateErr.message}`,
      );
      break;
    }

    released++;
  }

  return { released, errors };
}
