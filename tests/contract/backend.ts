// What the Store contract tests need from a storage backend. The file Store and the MySQL Store each provide one,
// so the same tests run against both.
import type { Store } from "@/lib/store/store";
import type { Actor } from "@/lib/store/types";

export interface Backend {
  /** A Store for this person, or the actor-less Store that sign-in uses. */
  storeFor(actor: Actor | null): Store;
  /** Creates the workspace and the "owner" super admin (password "owner-password-1"). Runs once, on an empty backend. */
  initOwner(): Promise<void>;
  cleanup(): Promise<void>;
}

export type BackendFactory = () => Promise<Backend>;
