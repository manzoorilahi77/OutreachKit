import type { KitInput } from "../src/lib/kit/types";

export const FIXTURES: Record<string, KitInput> = {
  "fencing-austin-desktop": { cat: "Fencing & gates", device: "desktop", st: "TX", city: "Austin" },
  "book-beaverton-phone": { cat: "Hair salons & suites", device: "mobile", st: "OR", city: "Beaverton" },
  "rfq-siloam-springs-desktop": { cat: "Commercial janitorial", device: "desktop", st: "AR", city: "Siloam Springs" },
  "fencing-austin-details": {
    cat: "Fencing & gates", device: "desktop", st: "TX", city: "Austin",
    you: "Maria", brand: "Lone Star Web", domain: "https://lonestarweb.com/",
  },
};
