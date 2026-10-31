import { create } from "zustand";
import { inventorySettingsApi, type InventorySettings } from "@/api/inventorySettingsApi";
import { getApiErrorMessage } from "@/api/sozlamalarApi";
import { AUTH_SESSION_CHANGED_EVENT, authTokenlarniOlish } from "@/lib/authTokenStorage";
import { setNegativeStockPermission } from "@/lib/negativeStock";

type State = InventorySettings & {
  loaded: boolean; loading: boolean; saving: boolean; error: string;
  load: () => Promise<void>;
  update: (enabled: boolean) => Promise<void>;
};
let generation = 0;
const initial = { allowNegativeStock: false, canSellNegative: false, loaded: false, loading: false, saving: false, error: "" };
export const useInventorySettingsStore = create<State>((set, get) => ({
  ...initial,
  load: async () => {
    if (get().loading) return;
    const session = generation;
    set({ loading: true, error: "" });
    try {
      const settings = await inventorySettingsApi.get();
      if (session === generation) { setNegativeStockPermission(settings); set({ ...settings, loaded: true, loading: false }); }
    } catch (error) {
      if (session === generation) { setNegativeStockPermission(initial); set({ ...initial, error: getApiErrorMessage(error) }); }
    }
  },
  update: async (enabled) => {
    if (get().saving) return;
    const session = generation;
    set({ saving: true, error: "" });
    try {
      const settings = await inventorySettingsApi.update(enabled);
      if (session === generation) { setNegativeStockPermission(settings); set({ ...settings, loaded: true, saving: false }); }
    } catch (error) {
      if (session === generation) set({ saving: false, error: getApiErrorMessage(error) });
    }
  },
}));

if (typeof window !== "undefined") {
  let session = authTokenlarniOlish();
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, () => {
    const next = authTokenlarniOlish();
    if (next.username !== session.username || next.expiresAt !== session.expiresAt) {
      generation++;
      setNegativeStockPermission(initial);
      useInventorySettingsStore.setState(initial);
    }
    session = next;
  });
}
