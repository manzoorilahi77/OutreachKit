// Ported from docs/source/territory-desk.html (static prose). Maintained by hand after the first extraction;
// `pnpm parity` compares it to the original, allowing only the logged corrections.

import type { ConsoleContent } from "./types";

export const CONSOLE_CONTENT: ConsoleContent = {
  bar: "Kit Console",
  barState: "Awaiting category",
  steps: [
    {
      k: "Step 1",
      title: "Pick your category",
      hint: "Tier A shown first",
      items: [{ widget: "kitFilters" }, { widget: "catGrid" }],
    },
    {
      k: "Step 2",
      title: "Where will you actually work?",
      hint: "Desktop is pre-selected — switch if you work from a phone",
      items: [
        {
          devs: [
            {
              dev: "desktop",
              pick: "Recommended primary",
              title: "Desktop — browser",
              p: "Google Maps list scanning, directories, license boards, county permit records, and the tracking sheet. Roughly 70% of the work. Tabs, keyboard, and a real spreadsheet are the whole advantage.",
            },
            {
              dev: "mobile",
              pick: "Required for two jobs",
              title: "Phone — native apps",
              p: "Instagram hashtag and location browsing, Nextdoor, Facebook groups — and the ten-second test of whether their existing site is broken on a phone. Roughly 30% of the work, and not optional.",
            },
          ],
        },
        {
          note: {
            tone: "warn",
            inline: [
              "Honest answer: ",
              { strong: ["you need both, on the same desk."] },
              " Desktop is where you find volume and record it; the phone is where you confirm the lead is real. If you only have one, take desktop and use your browser's device-emulation mode for the mobile check — you will lose the Instagram half of the sourcing.",
            ],
          },
        },
      ],
    },
    {
      k: "Step 3",
      title: "Choose the territory",
      hint: "State first, then the city list fills in",
      items: [
        {
          fields: [
            { id: "stateSel", label: "State", kind: "select", placeholder: "" },
            { id: "citySel", label: "City", kind: "select", placeholder: "" },
            {
              id: "cityFree",
              label: "Or type any city",
              kind: "input",
              placeholder: "e.g. Bentonville",
            },
          ],
        },
        {
          p: [
            "The city list holds the largest cities plus the high-income suburbs that matter most for home-service work in each state. It is not every incorporated place — if your town is missing, type it.",
          ],
        },
      ],
    },
    {
      k: "Step 4",
      title: "Your details",
      hint: "Optional — fills the messages and the sample link",
      items: [
        {
          fields: [
            { id: "yourName", label: "Your name", kind: "input", placeholder: "e.g. Manzoor" },
            {
              id: "yourBrand",
              label: "Your studio or brand",
              kind: "input",
              placeholder: "e.g. Famysys",
            },
            {
              id: "yourDomain",
              label: "Your demo domain",
              kind: "input",
              placeholder: "yourstudio.com",
            },
          ],
        },
        {
          p: [
            "Every sample site gets its own URL under this domain. The kit builds the pattern and drops the real link into all fifteen openers, every message and the build prompt. Leave blank and you get bracketed placeholders instead.",
          ],
        },
      ],
    },
  ],
  run: { build: "Build my field kit", reset: "Reset", status: "Pick a category, a device and a city." },
};
