// The three corrections, expressed as edits to what the ORIGINAL page built. The golden tests compare the TS port
// with `patchSnapshot(original)`, so the only differences between the original and the app are these.
// Each entry is also listed, with its location, in CHANGES.md.
export interface Snapshot { header: string; sections: string[]; clips: string[] }

interface KitPatch { correction: 1 | 2 | 3; location: string; old: string | RegExp; new: string; /** Plain-words description of a pattern `old`, for CHANGES.md. */ oldDesc?: string; newDesc?: string }

export const KIT_PATCHES: KitPatch[] = [
  { correction: 1, location: "Kit, 60-minute block footer",
    old: "that is two to three closes a month.", new: "that is roughly 0.1 to 1.5 closes a month (a planning estimate)." },

  { correction: 2, location: "Kit, outreach sequence: DM 1 label",
    old: "DM 1 · day 0 · send from your phone, with the demo screenshot attached",
    new: "DM 1 · day 0 · send from your phone, text only: no screenshot, image or attachment" },
  { correction: 2, location: "Kit, outreach sequence: DM 1 body (link line removed)",
    old: /Here it is: \S+\n\n/g, new: "", oldDesc: "“Here it is: ” followed by the demo link and a blank line" },
  { correction: 2, location: "Kit, outreach sequence: DM 2",
    old: "did that link come through? Here it is again: ", new: "did my message come through? Here is the page I mentioned: " },
  { correction: 2, location: "Kit, openers: “Demo already built” hook",
    old: "Attach the phone screenshot of the hero section. The image is the hook; the sentence is just the caption.",
    new: "Send the line only. A first DM to a non-follower carries no screenshot, image or attachment; keep the phone screenshot of the hero section for when they reply." },
  { correction: 2, location: "Kit, openers: intro sentence",
    old: "Copy takes the line and the link together.",
    new: "The DM copy button copies the line only. A second button, “Line + link (for reply or email)”, copies the line plus the link." },
  { correction: 2, location: "Kit, openers: copy buttons",
    old: /Copy line \+ link/g, new: "Copy DM lineLine + link (for reply or email)", oldDesc: "One button per opener, “Copy line + link”, copying the line and the link.", newDesc: "Two buttons per opener: “Copy DM line” (the line only) and “Line + link (for reply or email)” (the line plus the link)." },
  { correction: 2, location: "Kit, build prompt: Artifacts",
    old: "so I can attach one to the DM without a device.", new: "so I can send one once they reply, without a device." },

  { correction: 3, location: "Kit, outreach sequence: DM 1 body (photos)",
    old: "your photos, your service area, a quote form that texts you.",
    new: "your service area, a quote form that texts you, and marked placeholders where your photos would go." },
  { correction: 3, location: "Kit, outreach sequence: call script",
    old: "using your own photos. It's live", new: "with marked placeholders where your photos would go. It's live" },
  { correction: 3, location: "Kit, outreach sequence: email",
    old: "first — your own photos, your service area, and a quote form:",
    new: "first — marked placeholders where your photos would go, your service area, and a quote form:" },
  { correction: 3, location: "Kit, openers: “Demo already built” line",
    old: "site with your own photos already in it.", new: "site with marked placeholders where your photos would go." },
  { correction: 3, location: "Kit, build prompt: business block",
    old: "- Photos I am supplying: {list the image files pulled from their public profiles}",
    new: "- Photos I am supplying: {the image files the owner has given me written permission to use — leave blank until then}" },
  { correction: 3, location: "Kit, build prompt: Constraints, item 2",
    old: "2. Use only the images I supply. No stock photography, no AI-generated photos of work. Anything missing stays on public/placeholder.svg.",
    new: "2. Never use the prospect's own photos without their written permission. Until I tell you I hold it, every photo slot uses public/placeholder.svg, clearly marked as a placeholder on the page. Once I do, use only the images I supply. No stock photography, no AI-generated photos of work." },
];

const apply = (text: string, p: KitPatch): [string, boolean] => {
  const next = typeof p.old === "string" ? text.split(p.old).join(p.new) : text.replace(p.old, p.new);
  return [next, next !== text];
};

export function patchSnapshot(g: Snapshot): Snapshot {
  const applied = new Set<KitPatch>();
  const run = (t: string) => {
    let out = t;
    for (const p of KIT_PATCHES) {
      const [next, changed] = apply(out, p);
      if (changed) applied.add(p);
      out = next;
    }
    return out;
  };
  const sections = g.sections.map(run);
  const clips = g.clips.map(run);
  for (const p of KIT_PATCHES) if (!applied.has(p)) throw new Error(`Golden patch never applied: ${p.location}`);
  // In the app each opener has two copy payloads: the line alone, then the line plus the link.
  const openers = clips.slice(1, 16).flatMap((c) => [c.split("\n\n")[0]!, c]);
  return { header: run(g.header), sections, clips: [clips[0]!, ...openers, ...clips.slice(16)] };
}
