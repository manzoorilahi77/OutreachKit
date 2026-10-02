import { FOOTER } from "@/content/footer";
import { InlineView } from "./InlineView";

export function PlaybookFooter() {
  return (
    <footer className="space-y-3 border-t-2 border-head pt-5">
      {FOOTER.map((f, i) => (
        <p key={i} className="max-w-3xl text-sm text-muted"><InlineView parts={f} /></p>
      ))}
    </footer>
  );
}
