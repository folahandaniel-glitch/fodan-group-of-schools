export const STAGES = ["new", "contacted", "visit", "proposal", "negotiation", "won", "lost"] as const;
export const STAGE_LABEL: Record<string, string> = { new: "New enquiry", contacted: "Contacted", visit: "School visit", proposal: "Offer sent", negotiation: "Negotiation", won: "Won", lost: "Lost" };
export const KIND_LABEL: Record<string, string> = { family: "Family / admissions", sponsor: "Sponsor", vendor: "Vendor", partner: "Partner", other: "Other" };
export const STATUS_LABEL: Record<string, string> = { lead: "Lead", prospect: "Prospect", client: "Client", inactive: "Inactive" };
export const ACTIVITY_KINDS = ["call", "meeting", "visit", "email", "sms", "note"];
