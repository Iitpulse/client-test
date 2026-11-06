// GET /users/meta/locations (public): the tenant's city list for every City field (copied from Iitpulse/api-ai
// src/contracts/m6.ts LocationsResponse; that file is binding).
import type { IsoDateTime } from "./m2-student";

export interface LocationsResponse {
  now: IsoDateTime;
  /** The tenant's city list (tnt_iitpulse: ["Indore"]); every City field is a combobox over this list */
  cities: string[];
  /** States of those cities (["Madhya Pradesh"]) */
  states: string[];
  /** Class values: "6"…"12", "Dropper" */
  standards: string[];
  streams: Array<"PCM" | "PCB" | "PCMB" | "Commerce" | "Arts">;
  mediums: Array<"English" | "Hindi" | "Other">;
}
