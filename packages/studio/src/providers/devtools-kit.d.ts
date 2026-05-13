/// <reference types="@vitejs/devtools-kit" />

import type { InternalConfig, ResolvedTokens, TokenTree } from "@sugarcube-sh/core/client";
import type { STUDIO_RPC } from "@sugarcube-sh/studio-protocol";
import type { SaveBundle } from "../host/types";

type WorkingState = {
    resolved: ResolvedTokens;
};

type DiskState = {
    config: InternalConfig;
    trees: TokenTree[];
    resolved: ResolvedTokens;
};

declare module "@vitejs/devtools-kit" {
    interface DevToolsRpcServerFunctions {
        [STUDIO_RPC.SAVE]: (bundle: SaveBundle) => Promise<void>;
        [STUDIO_RPC.DISCARD]: () => Promise<void>;
    }

    interface DevToolsRpcSharedStates {
        [STUDIO_RPC.SHARED_STATE_WORKING]: WorkingState;
        [STUDIO_RPC.SHARED_STATE_DISK]: DiskState;
    }
}
