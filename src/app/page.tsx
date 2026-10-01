import { Console } from "@/components/console/Console";
import { Playbook } from "@/components/playbook/Playbook";

export default function Home() {
  return <Playbook widgets={{ console: <Console /> }} />;
}
