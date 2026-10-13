"use client";

import { SavedStrip } from "@/components/kit/SavedStrip";
import type { Device } from "@/lib/kit/types";
import type { Rates } from "@/lib/market/currency";
import { Console, type ConsoleDetails } from "./Console";

/** The Kit Console with the saved-kit strip in its actions slot. Only the props differ from the original console. */
export function ConsoleScreen({ initialDetails, initialDevice, canSave, canMoveLeads, finderEnabled, rates }: {
  initialDetails: Partial<ConsoleDetails>;
  initialDevice: Device;
  canSave: boolean;
  canMoveLeads: boolean;
  finderEnabled: boolean;
  rates: Rates;
}) {
  return (
    <Console
      initialDetails={initialDetails}
      initialDevice={initialDevice}
      canMoveLeads={canMoveLeads}
      rates={rates}
      renderSave={canSave ? ({ input, direction }) => <SavedStrip input={input} direction={direction} finderEnabled={finderEnabled} /> : undefined}
    />
  );
}
