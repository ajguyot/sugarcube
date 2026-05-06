import { type ReactNode, useEffect, useState } from "react";
import { useHost } from "../host/host-provider";
import { createTokenStore } from "../store/create-token-store";
import { StudioContext } from "../store/hooks";
import { createScaleState } from "../store/scale-state";
import { sameKeySet } from "../tokens/same-key-set";

export function TokenStoreProvider({ children }: { children: ReactNode }) {
    const host = useHost();

    const [{ ctx }] = useState(() => {
        const initialSnapshot = host.baseline.getState();
        const { store, pathIndex, writeResolved } = createTokenStore(host);
        const panel = initialSnapshot.config.studio?.panel ?? [];
        const scaleState = createScaleState(
            panel,
            initialSnapshot,
            pathIndex,
            store,
            host.baseline,
            writeResolved
        );

        return {
            ctx: {
                store,
                pathIndex,
                scaleState,
            },
        };
    });

    // Let the host attach mode-specific runtime machinery (e.g. the
    // in-browser pipeline + CSS bridge for embedded mode). Cleanup runs
    // on host change or unmount.
    useEffect(() => host.attach?.(ctx.store), [host, ctx.store]);

    // Mirror host working-channel updates into the store. DevTools pushes
    // here on disk changes / external edits. Embedded has no working
    // channel, so the effect short-circuits. Subscription tears down on
    // host change or unmount.
    useEffect(() => {
        if (!host.working) return;
        return host.working.subscribe((resolved) => {
            ctx.store.setState({ resolved });
        });
    }, [host.working, ctx.store]);

    // When the host pushes a baseline whose key set has changed (e.g. an
    // externally-added or -removed token), refresh the PathIndex in place.
    // Mutation is deliberate: long-lived store-action closures hold this
    // reference and would otherwise be left pointing at a stale instance.
    useEffect(() => {
        return host.baseline.subscribe((nextSnapshot) => {
            if (sameKeySet(ctx.pathIndex.resolvedKeys(), Object.keys(nextSnapshot.resolved))) {
                return;
            }
            ctx.pathIndex.refresh(nextSnapshot.resolved);
        });
    }, [host.baseline, ctx.pathIndex]);

    return <StudioContext.Provider value={ctx}>{children}</StudioContext.Provider>;
}
