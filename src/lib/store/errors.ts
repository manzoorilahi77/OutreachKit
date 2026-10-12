/** A refusal the screens show in plain words. Never carries file paths or hashes. */
export class StoreError extends Error {
  constructor(message: string, readonly code: "forbidden" | "invalid" | "not_found" | "duplicate" | "conflict" = "invalid") {
    super(message);
    this.name = "StoreError";
  }
}
