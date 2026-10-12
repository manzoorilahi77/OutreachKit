import { describe, expect, it } from "vitest";
import { cleanMapsUrl, placeKey } from "@/lib/scrape/placeKey";

const FID = "0x864c2110a403a391:0x7ba6063c8daea14a";
const FEED = `https://www.google.com/maps/place/Lone+Star+Roof+Pros/data=!4m7!3m6!1s${FID}!8m2!3d32.9!4d-96.7!16s%2Fg%2F11rttyxtg_!19sChIJkaMDpBAhTIYRSqGujTwGpns?authuser=0&hl=en&g_ep=EgoyMDI2&rclk=1`;
const OPENED = `https://www.google.com/maps/place/Lone+Star+Roof+Pros/@32.9230276,-96.7596486,17z/data=!3m1!4b1!4m6!3m5!1s${FID}!8m2!3d32.9!4d-96.7!16s%2Fg%2F11rttyxtg_?entry=ttu`;

describe("duplicate key", () => {
  it("is the same for a result link and the opened place", () => {
    expect(placeKey(FEED)).toBe("fid:" + FID);
    expect(placeKey(OPENED)).toBe(placeKey(FEED));
  });
  it("ignores case and tracking parameters", () => {
    expect(placeKey(FEED.replace(FID, FID.toUpperCase().replace("0X", "0x")))).toBe("fid:" + FID);
    expect(placeKey(FEED.split("?")[0]!)).toBe(placeKey(FEED));
  });
  it("tells different places apart, even with the same name", () => {
    const other = FEED.replace("0x7ba6063c8daea14a", "0x7ba6063c8daea14b");
    expect(placeKey(other)).not.toBe(placeKey(FEED));
  });
  it("falls back to the place id, then the cid, then the path", () => {
    expect(placeKey("https://www.google.com/maps/place/X/data=!19sChIJkaMDpBAhTIYRSqGujTwGpns")).toBe("place:ChIJkaMDpBAhTIYRSqGujTwGpns");
    expect(placeKey("https://maps.google.com/?cid=12345678901234567890")).toBe("cid:12345678901234567890");
    expect(placeKey("https://www.google.com/maps/place/Joe's+Roofing/")).toBe("path:/maps/place/joe's+roofing");
  });
  it("is null for something that is not a place", () => {
    expect(placeKey("")).toBeNull();
    expect(placeKey("https://example.com/")).toBeNull();
    expect(placeKey("not a url")).toBeNull();
  });
  it("keeps the place path and drops the tracking query from the stored link", () => {
    expect(cleanMapsUrl(FEED)).toBe(FEED.split("?")[0]);
  });
});
