import { createStore } from "@/lib/store/fileStore";
import { initOwner, tempRoot } from "../helpers/team";
import type { BackendFactory } from "./backend";

/** A throwaway team/ folder. */
export const fileBackend: BackendFactory = async () => {
  const { root, cleanup } = await tempRoot();
  return { storeFor: (actor) => createStore(actor, root), initOwner: () => initOwner(root), cleanup };
};
