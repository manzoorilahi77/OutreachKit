// The version of a content file: a short hash of its bytes. An approval is for one version, so editing a kit file un-approves it.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

export interface KitFileInfo { fileId: string; category: string; reviewStatus: string; version: string }

export function kitFiles(root: string): KitFileInfo[] {
  const dir = path.join(root, "src", "kits");
  const out: KitFileInfo[] = [];
  for (const f of readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) {
    const raw = readFileSync(path.join(dir, f));
    let j: { category?: string; provenance?: { reviewStatus?: string } } = {};
    try { j = JSON.parse(raw.toString("utf8")); } catch { /* shown with a blank category */ }
    out.push({ fileId: f.replace(/\.json$/, ""), category: j.category ?? f, reviewStatus: j.provenance?.reviewStatus ?? "unreviewed", version: createHash("sha1").update(raw).digest("hex").slice(0, 8) });
  }
  return out;
}
