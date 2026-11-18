export const STAGES = ["new", "contacted", "visit", "proposal", "negotiation", "won", "lost"] as const;
export const STAGE_LABEL: Record<string, string> = { new: "New enquiry", contacted: "Contacted", visit: "School visit", proposal: "Offer sent", negotiation: "Negotiation", won: "Won", lost: "Lost" };
export const KIND_LABEL: Record<string, string> = { family: "Family / admissions", sponsor: "Sponsor", vendor: "Vendor", partner: "Partner", other: "Other" };
export const STATUS_LABEL: Record<string, string> = { lead: "Lead", prospect: "Prospect", client: "Client", inactive: "Inactive" };
export const ACTIVITY_KINDS = ["call", "meeting", "visit", "email", "sms", "note"];

export const STAGE_PROB: Record<string, number> = { new: 0.1, contacted: 0.25, visit: 0.45, proposal: 0.6, negotiation: 0.8, won: 1, lost: 0 };
export const RATING_LABEL: Record<string, string> = { hot: "Hot", warm: "Warm", cold: "Cold" };
/** Value of open deals weighted by how far along each stage is. */
export const weighted = (deals: Record<string, any>[]) => Math.round(deals.reduce((a, d) => a + Number(d.value) * (STAGE_PROB[d.stage] ?? 0), 0));
