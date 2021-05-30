export type VerificationStatus =
  | "unverified"
  | "errored"
  | "verified"
  | "emailErrored"
  | "emailSent";

export type ProfileState = "none" | "data" | "dataIntegrate" | "verification";
