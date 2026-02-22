import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createAdminClient } from "../_shared/supabase.ts";

/** Grace period (days) after new_due_date before a LIVE trade is marked DEFAULTED. */
const GRACE_PERIOD_DAYS = 3;

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const tradeId: string | undefined = body.trade_id;
    const today = isoDate(new Date());

    const supabase = createAdminClient();

    const results = {
      disbursed: [] as string[],
      repaid: [] as string[],
      defaulted: [] as string[],
      errors: [] as string[],
    };

    // ---------------------------------------------------------------
    // PHASE 1: MATCHED -> LIVE (disburse)
    // Trades whose original_due_date has arrived
    // ---------------------------------------------------------------
    {
      let query = supabase
        .from("trades")
        .select("*")
        .eq("status", "MATCHED")
        .lte("original_due_date", today);

      if (tradeId) {
        query = query.eq("id", tradeId);
      }

      const { data: matchedTrades, error: mtErr } = await query;

      if (mtErr) {
        throw new Error(
          `Failed to fetch matched trades: ${mtErr.message}`,
        );
      }

      for (const trade of matchedTrades ?? []) {
        try {
          // Update status to LIVE
          const { error: statusErr } = await supabase
            .from("trades")
            .update({ status: "LIVE" })
            .eq("id", trade.id);

          if (statusErr) {
            results.errors.push(
              `Disburse status update failed for ${trade.id}: ${statusErr.message}`,
            );
            continue;
          }

          // Fetch allocations for this trade
          const { data: allocations } = await supabase
            .from("allocations")
            .select("*")
            .eq("trade_id", trade.id)
            .eq("status", "RESERVED");

          // Create DISBURSE ledger entries for each allocation
          for (const alloc of allocations ?? []) {
            const { error: disbErr } = await supabase.rpc(
              "update_lending_pot",
              {
                p_user_id: alloc.lender_id,
                p_entry_type: "DISBURSE",
                p_amount: Number(alloc.amount_slice),
                p_trade_id: trade.id,
                p_allocation_id: alloc.id,
                p_description: `Disburse for trade ${trade.id}`,
                p_idempotency_key: `disburse-${trade.id}-${alloc.id}`,
              },
            );

            if (disbErr) {
              console.error(
                `Disburse ledger failed for allocation ${alloc.id}:`,
                disbErr,
              );
              results.errors.push(
                `Disburse ledger failed for allocation ${alloc.id}: ${disbErr.message}`,
              );
              continue;
            }

            // Update allocation status to ACTIVE — only if ledger succeeded
            const { error: allocUpdateErr } = await supabase
              .from("allocations")
              .update({ status: "ACTIVE", updated_at: new Date().toISOString() })
              .eq("id", alloc.id);

            if (allocUpdateErr) {
              console.error(
                `Allocation ACTIVE status update failed for ${alloc.id}:`,
                allocUpdateErr,
              );
              results.errors.push(
                `Allocation ACTIVE status update failed for ${alloc.id}: ${allocUpdateErr.message}`,
              );
            }
          }

          // Log event
          await supabase.from("flowzo_events").insert({
            event_type: "trade.disbursed",
            entity_type: "trade",
            entity_id: trade.id,
            actor: "system",
            payload: {
              amount: trade.amount,
              original_due_date: trade.original_due_date,
              allocations_count: (allocations ?? []).length,
            },
          });

          results.disbursed.push(trade.id as string);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Disburse error for trade ${trade.id}:`, msg);
          results.errors.push(
            `Disburse error for trade ${trade.id}: ${msg}`,
          );
        }
      }
    }

    // ---------------------------------------------------------------
    // PHASE 2: LIVE -> REPAID (repay)
    // Trades whose new_due_date (shifted due date) has arrived
    // ---------------------------------------------------------------
    {
      let query = supabase
        .from("trades")
        .select("*")
        .eq("status", "LIVE")
        .lte("new_due_date", today);

      if (tradeId) {
        query = query.eq("id", tradeId);
      }

      const { data: liveTrades, error: ltErr } = await query;

      if (ltErr) {
        throw new Error(
          `Failed to fetch live trades: ${ltErr.message}`,
        );
      }

      for (const trade of liveTrades ?? []) {
        try {
          // Fetch active allocations
          const { data: allocations } = await supabase
            .from("allocations")
            .select("*")
            .eq("trade_id", trade.id)
            .eq("status", "ACTIVE");

          // Repay each lender: principal + fee_share
          for (const alloc of allocations ?? []) {
            const principal = Number(alloc.amount_slice);
            const feeShare = Number(alloc.fee_slice);

            // REPAY: return principal to lender
            const { error: repayErr } = await supabase.rpc(
              "update_lending_pot",
              {
                p_user_id: alloc.lender_id,
                p_entry_type: "REPAY",
                p_amount: principal,
                p_trade_id: trade.id,
                p_allocation_id: alloc.id,
                p_description: `Repay principal for trade ${trade.id}`,
                p_idempotency_key: `repay-principal-${trade.id}-${alloc.id}`,
              },
            );

            if (repayErr) {
              console.error(
                `Repay principal failed for allocation ${alloc.id}:`,
                repayErr,
              );
              results.errors.push(
                `Repay principal failed for allocation ${alloc.id}: ${repayErr.message}`,
              );
              // Skip status update — ledger and allocation must stay in sync
              continue;
            }

            // FEE_CREDIT: return fee share to lender
            let feeSuccess = true;
            if (feeShare > 0) {
              const { error: feeErr } = await supabase.rpc(
                "update_lending_pot",
                {
                  p_user_id: alloc.lender_id,
                  p_entry_type: "FEE_CREDIT",
                  p_amount: feeShare,
                  p_trade_id: trade.id,
                  p_allocation_id: alloc.id,
                  p_description: `Fee credit for trade ${trade.id}`,
                  p_idempotency_key: `fee-credit-${trade.id}-${alloc.id}`,
                },
              );

              if (feeErr) {
                console.error(
                  `Fee credit failed for allocation ${alloc.id}:`,
                  feeErr,
                );
                results.errors.push(
                  `Fee credit failed for allocation ${alloc.id}: ${feeErr.message}`,
                );
                feeSuccess = false;
              }
            }

            // Only update allocation status if both ledger operations succeeded
            if (feeSuccess) {
              const { error: allocUpdateErr } = await supabase
                .from("allocations")
                .update({
                  status: "REPAID",
                  updated_at: new Date().toISOString(),
                })
                .eq("id", alloc.id);

              if (allocUpdateErr) {
                console.error(
                  `Allocation status update failed for ${alloc.id}:`,
                  allocUpdateErr,
                );
                results.errors.push(
                  `Allocation REPAID status update failed for ${alloc.id}: ${allocUpdateErr.message}`,
                );
              }

              // Auto-withdraw for lenders with queued withdrawal
              const { data: lenderPot } = await supabase
                .from("lending_pots")
                .select("available, locked, withdrawal_queued")
                .eq("user_id", alloc.lender_id)
                .single();

              if (lenderPot?.withdrawal_queued && Number(lenderPot.available) > 0) {
                const { error: autoWithdrawErr } = await supabase.rpc(
                  "update_lending_pot",
                  {
                    p_user_id: alloc.lender_id,
                    p_entry_type: "WITHDRAW",
                    p_amount: Number(lenderPot.available),
                    p_trade_id: trade.id,
                    p_allocation_id: alloc.id,
                    p_description: `Auto-withdraw (queued) after trade ${trade.id} repaid`,
                    p_idempotency_key: `auto-withdraw-${trade.id}-${alloc.id}`,
                  },
                );

                if (autoWithdrawErr) {
                  console.error(
                    `Auto-withdraw failed for lender ${alloc.lender_id}:`,
                    autoWithdrawErr,
                  );
                } else if (Number(lenderPot.locked) <= principal) {
                  await supabase
                    .from("lending_pots")
                    .update({ withdrawal_queued: false })
                    .eq("user_id", alloc.lender_id);
                }
              }
            }
          }

          // Update trade status to REPAID
          const { error: statusErr } = await supabase
            .from("trades")
            .update({ status: "REPAID" })
            .eq("id", trade.id);

          if (statusErr) {
            results.errors.push(
              `Repay status update failed for ${trade.id}: ${statusErr.message}`,
            );
            continue;
          }

          // Record platform fee income (junior tranche revenue)
          const tradePlatformFee = Number(trade.platform_fee ?? 0);
          if (tradePlatformFee > 0) {
            const { error: revenueErr } = await supabase
              .from("platform_revenue")
              .insert({
                entry_type: "FEE_INCOME",
                amount: tradePlatformFee,
                trade_id: trade.id,
                description: `Platform fee: ${tradePlatformFee} GBP from trade ${trade.id}`,
              });

            if (revenueErr) {
              console.error(
                `Platform revenue insert failed for trade ${trade.id}:`,
                revenueErr,
              );
            }
          }

          // Log event
          await supabase.from("flowzo_events").insert({
            event_type: "trade.repaid",
            entity_type: "trade",
            entity_id: trade.id,
            actor: "system",
            payload: {
              amount: trade.amount,
              fee: trade.fee,
              platform_fee: tradePlatformFee,
              new_due_date: trade.new_due_date,
              allocations_count: (allocations ?? []).length,
            },
          });

          results.repaid.push(trade.id as string);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Repay error for trade ${trade.id}:`, msg);
          results.errors.push(
            `Repay error for trade ${trade.id}: ${msg}`,
          );
        }
      }
    }

    // ---------------------------------------------------------------
    // PHASE 3: LIVE -> DEFAULTED
    // Trades past new_due_date + grace period without repayment
    // ---------------------------------------------------------------
    {
      const defaultCutoff = new Date();
      defaultCutoff.setDate(defaultCutoff.getDate() - GRACE_PERIOD_DAYS);
      const cutoffDate = isoDate(defaultCutoff);

      let query = supabase
        .from("trades")
        .select("*")
        .eq("status", "LIVE")
        .lt("new_due_date", cutoffDate);

      if (tradeId) {
        query = query.eq("id", tradeId);
      }

      const { data: overdueTrades, error: odErr } = await query;

      if (odErr) {
        throw new Error(
          `Failed to fetch overdue trades: ${odErr.message}`,
        );
      }

      for (const trade of overdueTrades ?? []) {
        try {
          // Fetch active allocations
          const { data: allocations } = await supabase
            .from("allocations")
            .select("*")
            .eq("trade_id", trade.id)
            .eq("status", "ACTIVE");

          // Release locked funds back to lenders (principal loss — no fee)
          for (const alloc of allocations ?? []) {
            const principal = Number(alloc.amount_slice);

            const { error: releaseErr } = await supabase.rpc(
              "update_lending_pot",
              {
                p_user_id: alloc.lender_id,
                p_entry_type: "RELEASE",
                p_amount: principal,
                p_trade_id: trade.id,
                p_allocation_id: alloc.id,
                p_description: `Default release for trade ${trade.id}`,
                p_idempotency_key: `default-release-${trade.id}-${alloc.id}`,
              },
            );

            if (releaseErr) {
              console.error(
                `Default release failed for allocation ${alloc.id}:`,
                releaseErr,
              );
              results.errors.push(
                `Default release failed for allocation ${alloc.id}: ${releaseErr.message}`,
              );
              continue;
            }

            // Mark allocation as DEFAULTED — only if ledger succeeded
            const { error: allocUpdateErr } = await supabase
              .from("allocations")
              .update({
                status: "DEFAULTED",
                updated_at: new Date().toISOString(),
              })
              .eq("id", alloc.id);

            if (allocUpdateErr) {
              console.error(
                `Allocation DEFAULTED status update failed for ${alloc.id}:`,
                allocUpdateErr,
              );
              results.errors.push(
                `Allocation DEFAULTED status update failed for ${alloc.id}: ${allocUpdateErr.message}`,
              );
            }
          }

          // Update trade status to DEFAULTED
          const { error: statusErr } = await supabase
            .from("trades")
            .update({
              status: "DEFAULTED",
              defaulted_at: new Date().toISOString(),
            })
            .eq("id", trade.id);

          if (statusErr) {
            results.errors.push(
              `Default status update failed for ${trade.id}: ${statusErr.message}`,
            );
            continue;
          }

          // Record platform default loss (junior tranche absorbs first loss)
          const defaultAmount = Number(trade.amount);
          const { error: lossErr } = await supabase
            .from("platform_revenue")
            .insert({
              entry_type: "DEFAULT_LOSS",
              amount: -defaultAmount,
              trade_id: trade.id,
              description: `Default loss absorbed (junior tranche): trade ${trade.id}`,
            });

          if (lossErr) {
            console.error(
              `Platform default loss insert failed for trade ${trade.id}:`,
              lossErr,
            );
          }

          // Log event
          await supabase.from("flowzo_events").insert({
            event_type: "trade.defaulted",
            entity_type: "trade",
            entity_id: trade.id,
            actor: "system",
            payload: {
              amount: trade.amount,
              fee: trade.fee,
              default_loss: defaultAmount,
              new_due_date: trade.new_due_date,
              grace_period_days: GRACE_PERIOD_DAYS,
              allocations_count: (allocations ?? []).length,
            },
          });

          results.defaulted.push(trade.id as string);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`Default error for trade ${trade.id}:`, msg);
          results.errors.push(
            `Default error for trade ${trade.id}: ${msg}`,
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        settled_at: new Date().toISOString(),
        disbursed_count: results.disbursed.length,
        repaid_count: results.repaid.length,
        defaulted_count: results.defaulted.length,
        error_count: results.errors.length,
        disbursed_trade_ids: results.disbursed,
        repaid_trade_ids: results.repaid,
        defaulted_trade_ids: results.defaulted,
        errors: results.errors.length > 0 ? results.errors : undefined,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("settle-trade error:", err);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
