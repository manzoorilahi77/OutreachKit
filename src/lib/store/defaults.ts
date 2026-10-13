import type { Workspace } from "./types";

/** What a Store returns for the workspace before anyone has saved one. */
export const EMPTY_WORKSPACE: Workspace = {
  name: "", studio: "", demoDomain: "", basedLine: "", features: { leadFinder: true, softwareTrack: false },
};
