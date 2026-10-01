// Opens the original page with JavaScript disabled, so only the static markup is in the DOM.
import { chromium, type Browser, type Page } from "@playwright/test";
import { readSource } from "./source";

export async function withStaticPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser: Browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.setContent(readSource().replace(/<base[^>]*>/, ""));
    await page.evaluate("window.__name = (f) => f");
    return await fn(page);
  } finally {
    await browser.close();
  }
}
