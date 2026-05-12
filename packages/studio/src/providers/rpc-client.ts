import type { InternalConfig, ResolvedTokens, TokenTree } from "@sugarcube-sh/core/client";
import { STUDIO_RPC } from "@sugarcube-sh/studio-protocol";
import { getDevToolsRpcClient } from "@vitejs/devtools-kit/client";
import type { SharedState } from "@vitejs/devtools-kit/utils/shared-state";
import type { SaveBundle } from "../host/types";

export type WorkingSharedState = { resolved: ResolvedTokens };
export type DiskSharedState = {
    config: InternalConfig;
    trees: TokenTree[];
    resolved: ResolvedTokens;
};

export type WorkingSharedStateHandle = SharedState<WorkingSharedState>;
export type DiskSharedStateHandle = SharedState<DiskSharedState>;

let rpc: Awaited<ReturnType<typeof getDevToolsRpcClient>> | null = null;

async function getRpc() {
    rpc ??= await getDevToolsRpcClient();
    return rpc;
}

export async function getWorkingSharedState(): Promise<WorkingSharedStateHandle> {
    const client = await getRpc();
    return client.sharedState.get(STUDIO_RPC.SHARED_STATE_WORKING);
}

export async function getDiskSharedState(): Promise<DiskSharedStateHandle> {
    const client = await getRpc();
    return client.sharedState.get(STUDIO_RPC.SHARED_STATE_DISK);
}

export async function rpcSave(bundle: SaveBundle): Promise<void> {
    const client = await getRpc();
    await client.call(STUDIO_RPC.SAVE, bundle);
}

export async function rpcDiscard(): Promise<void> {
    const client = await getRpc();
    await client.call(STUDIO_RPC.DISCARD);
}
