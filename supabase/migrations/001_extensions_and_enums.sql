create extension if not exists "pgcrypto";

create type trade_status as enum ('DRAFT','PENDING_MATCH','MATCHED','LIVE','REPAID','DEFAULTED','CANCELLED');
create type allocation_status as enum ('RESERVED','ACTIVE','REPAID','DEFAULTED','RELEASED');
create type ledger_entry_type as enum ('DEPOSIT','WITHDRAW','RESERVE','RELEASE','DISBURSE','REPAY','FEE_CREDIT');
create type payment_direction as enum ('OUTBOUND','INBOUND');
create type payment_status as enum ('PENDING','SUBMITTED','COMPLETED','FAILED');
create type proposal_status as enum ('PENDING','ACCEPTED','DISMISSED','EXPIRED');
create type risk_grade as enum ('A','B','C');
create type obligation_frequency as enum ('WEEKLY','FORTNIGHTLY','MONTHLY','QUARTERLY','ANNUAL','IRREGULAR');
create type role_preference as enum ('BORROWER_ONLY','LENDER_ONLY','BOTH');
