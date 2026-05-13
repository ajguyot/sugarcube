import type { InternalConfig, ResolvedTokens, TokenTree } from "@sugarcube-sh/core/client";
import { createStore } from "zustand/vanilla";
import { rpcDiscard, rpcSave } from "../providers/rpc-client";
import type { TokenSnapshot } from "../tokens/types";
import { type InitData, fetchInitData } from "./devtools-init";
import type { Host } from "./types";

export async function createDevToolsHost(signal: AbortSignal): Promise<Host> {
    const initData = await fetchInitData(signal);

    if (signal.aborted) throw new DOMException("Aborted", "AbortError");

    const baseline = createStore<TokenSnapshot>(() => ({
        config: initData.config,
        trees: initData.trees,
        resolved: initData.diskResolved,
    }));

    const unsubDisk = initData.diskState.on("updated", (next) => {
        baseline.setState({
            config: next.config as InternalConfig,
            trees: next.trees as TokenTree[],
            resolved: next.resolved as ResolvedTokens,
        });
    });
    signal.addEventListener("abort", unsubDisk);

    return {
        baseline,
        working: workingChannelFor(initData),
        save: async (bundle) => {
            try {
                await rpcSave(bundle);
                return { kind: "persisted" };
            } catch (err) {
                return { kind: "failed", error: err instanceof Error ? err.message : String(err) };
            }
        },
        discard: async () => {
            await rpcDiscard();
        },
        capabilities: {
            saveLabel: "Save",
            discardLabel: "Discard",
            requiresSaveMetadata: false,
        },
    };
}

function workingChannelFor(initData: InitData): NonNullable<Host["working"]> {
    return {
        get: () =>
            (initData.workingState.value()?.resolved as ResolvedTokens | undefined) ??
            initData.workingResolved,
        push: (resolved) => {
            initData.workingState.mutate((draft) => {
                draft.resolved = resolved;
            });
        },
        subscribe: (cb) =>
            initData.workingState.on("updated", (next) => cb(next.resolved as ResolvedTokens)),
    };
}
