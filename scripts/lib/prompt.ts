// Terminal prompts shared by the owner's scripts.
import type { Interface } from "node:readline/promises";

/** Reads a password without echoing it. (Piped input is read as a plain line.) */
export async function askHidden(rl: Interface, label: string): Promise<string> {
  if (!process.stdin.isTTY) return (await rl.question(`${label}: `)).trim();
  const out = process.stdout;
  out.write(`${label}: `);
  return new Promise((resolve) => {
    let buf = "";
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (ch: string) => {
      for (const c of ch) {
        if (c === "\r" || c === "\n") { stdin.setRawMode(false); stdin.off("data", onData); out.write("\n"); resolve(buf); return; }
        if (c === "\u0003") process.exit(130);
        if (c === "\u007f" || c === "\b") buf = buf.slice(0, -1);
        else buf += c;
      }
    };
    stdin.on("data", onData);
  });
}
