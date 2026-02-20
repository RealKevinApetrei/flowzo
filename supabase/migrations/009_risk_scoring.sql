create or replace function public.calculate_risk_grade(
  p_income_regularity numeric, p_min_monthly_balance numeric,
  p_failed_payment_count int, p_bill_concentration numeric, p_balance_volatility numeric
) returns jsonb language plpgsql immutable as $$
declare score numeric; grade risk_grade;
  max_shifted_amount numeric; max_shift_days int; max_active_trades int;
begin
  score := (p_income_regularity * 30) + (least(p_min_monthly_balance / 500, 1.0) * 20) +
    (greatest(1.0 - (p_failed_payment_count * 0.25), 0) * 25) +
    (greatest(1.0 - p_bill_concentration, 0) * 10) + (greatest(1.0 - p_balance_volatility, 0) * 15);
  if score >= 70 then grade := 'A'; max_shifted_amount := 500; max_shift_days := 14; max_active_trades := 5;
  elsif score >= 40 then grade := 'B'; max_shifted_amount := 200; max_shift_days := 10; max_active_trades := 3;
  else grade := 'C'; max_shifted_amount := 75; max_shift_days := 7; max_active_trades := 1;
  end if;
  return jsonb_build_object('score', round(score, 2), 'grade', grade::text,
    'max_shifted_amount', max_shifted_amount, 'max_shift_days', max_shift_days, 'max_active_trades', max_active_trades);
end;
$$;

create or replace function public.calculate_fee(
  p_amount numeric, p_shift_days int, p_risk_grade risk_grade, p_pool_utilization numeric default 0.5
) returns jsonb language plpgsql immutable as $$
declare base_rate numeric; risk_multiplier numeric; utilization_multiplier numeric;
  raw_fee numeric; capped_fee numeric; annualized_rate numeric;
begin
  base_rate := 0.0005;
  risk_multiplier := case p_risk_grade when 'A' then 1.0 when 'B' then 1.5 when 'C' then 2.5 end;
  utilization_multiplier := 1.0 + greatest(p_pool_utilization - 0.5, 0) * 2.0;
  raw_fee := base_rate * p_amount * p_shift_days * risk_multiplier * utilization_multiplier;
  capped_fee := least(raw_fee, p_amount * 0.05, 10.0);
  capped_fee := round(greatest(capped_fee, 0.01), 2);
  annualized_rate := round((capped_fee / p_amount) * (365.0 / p_shift_days) * 100, 2);
  return jsonb_build_object('fee', capped_fee, 'annualized_rate', annualized_rate,
    'base_rate', base_rate, 'risk_multiplier', risk_multiplier,
    'utilization_multiplier', round(utilization_multiplier, 4), 'raw_fee_before_cap', round(raw_fee, 4));
end;
$$;
