// What `pnpm brand` skips, and why. tests/brand-config.test.ts asserts this is exactly the set.

export const SKIP_FILES = new Set([
  // contrast maths for the app's own four colours; it names them as test values
  "src/lib/contrast.ts",
  // the CLIENT demo-site palettes the build prompt describes; data, never app UI
  "src/data/style.ts",
  // the base-website template's 50 client demo-site combos, vendored by pnpm themes:sync; data, never app UI
  "src/themes/library.ts",
]);

export const SKIP_DIRS = [
  // the design-direction preview canvas and its font loaders: it draws client combos in their own
  // fonts, on the canvas element only. The rest of the console stays in the four colours and Jost.
  "src/components/kit/directions/",
];
