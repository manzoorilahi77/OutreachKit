import { Playbook } from "@/components/playbook/Playbook";

export default function Home() {
  return <Playbook widgets={{ console: <p className="rounded-lg border border-line p-5 text-muted">The kit console arrives in the next phase.</p> }} />;
}
