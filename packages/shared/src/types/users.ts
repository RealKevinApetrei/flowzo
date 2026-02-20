import type { RiskGrade } from "./trades";

export type RolePreference = "BORROWER_ONLY" | "LENDER_ONLY" | "BOTH";

export interface UserProfile {
  id: string;
  display_name: string;
  risk_grade: RiskGrade;
  role_preference: RolePreference;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}
