export const APP_NAME = "Flowzo";
export const APP_DESCRIPTION =
  "Never miss a bill payment again. Flowzo shifts your bills to match your cash flow, powered by peer-to-peer lending.";

/** Bottom nav tabs */
export const NAV_TABS = [
  { label: "Home", href: "/borrower", icon: "home" },
  { label: "Lending", href: "/lender", icon: "coins" },
  { label: "Settings", href: "/settings", icon: "settings" },
] as const;

/** Design tokens (also defined in globals.css) */
export const COLORS = {
  coral: "#FF5A5F",
  navy: "#1B1B3A",
  softWhite: "#FAFAFA",
  warmGrey: "#F0F0F0",
} as const;
