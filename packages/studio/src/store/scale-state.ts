/**
 * Scale state — the unified store for everything the user can edit on a
 * `type: "scale"` binding. Discriminates internally between two edit
 * kinds: `"tokens"` (hand-written scales, edited via base/spread sliders
 * + per-step overrides) and `"scale"` (scale-extension-driven, edited
 * via the extension's parameters).
 *
 * Edits are kept as a flat map keyed by binding token. Static binding
 * metadata (kind, parentPath, sourcePath) is captured once at init and
 * looked up at action/apply time.
 */

import type {
    PanelSection,
    ResolvedTokens,
    ScaleBinding,
    ScaleExtension,
} from "@sugarcube-sh/core/client";
import { type StoreApi, createStore } from "zustand";
import type { PathIndex } from "../tokens/path-index";
import { getScaleExtension } from "../tokens/scale-extension";
import type { TokenSnapshot } from "../tokens/types";
import type { TokenStoreAPI } from "./create-token-store";
import { applyScaleEdits } from "./scale-apply";
import { DEFAULT_SPREAD, selectCapture } from "./scale-selectors";
import type {
    LinkBindingMeta,
    LinkEdit,
    ScaleBindingMeta,
    ScaleEdit,
    StepOverrides,
} from "./scale-types";
import { subscribeBaselineEditClear } from "./subscribe-baseline-edit-clear";

export type ScaleStateStore = {
    /** Active edits keyed by binding token. Absent token = no user edits yet. */
    edits: Record<string, ScaleEdit>;
    /** Active link toggles keyed by follower binding token. */
    links: Record<string, LinkEdit>;
    /** Static binding metadata keyed by binding token. */
    bindings: Record<string, ScaleBindingMeta>;
    /** Static link metadata keyed by follower binding token. */
    linkBindings: Record<string, LinkBindingMeta>;

    setBase: (token: string, value: number) => void;
    setSpread: (token: string, value: number) => void;
    setStepOverride: (
        token: string,
        step: string,
        value: { min: { value: number; unit: string }; max: { value: number; unit: string } }
    ) => void;
    clearStepOverride: (token: string, step: string) => void;
    updateScale: (token: string, updater: (scale: ScaleExtension) => ScaleExtension) => void;
    setLinkEnabled: (token: string, enabled: boolean) => void;
    resetAll: () => void;
};

export type ScaleStateAPI = StoreApi<ScaleStateStore>;

export type ScaleWriteCallback = (resolved: ResolvedTokens) => void;

/**
 * Read the on-disk scale extension for a scale-kind binding. Always
 * reads from the *live* baseline so post-save phantom diffs are
 * structurally impossible — once disk updates, "original" tracks it.
 */
export function selectOriginalScale(
    baseline: TokenSnapshot,
    parentPath: string
): ScaleExtension | null {
    return getScaleExtension(baseline.trees, parentPath) ?? null;
}

/**
 * Read the scale extension currently in effect: user's edit if present,
 * otherwise the live on-disk original.
 */
export function selectEffectiveScale(
    baseline: TokenSnapshot,
    edit: ScaleEdit | undefined,
    parentPath: string
): ScaleExtension | null {
    if (edit?.kind === "scale") return edit.scale;
    return selectOriginalScale(baseline, parentPath);
}

export function createScaleState(
    panelSections: PanelSection[],
    snapshot: TokenSnapshot,
    pathIndex: PathIndex,
    tokenStore: TokenStoreAPI,
    baseline: StoreApi<TokenSnapshot>,
    onWrite?: ScaleWriteCallback
): ScaleStateAPI {
    const writeResolved: ScaleWriteCallback =
        onWrite ?? ((resolved) => tokenStore.setState({ resolved }));

    const { bindings, linkBindings } = collectBindings(panelSections, snapshot);

    const effectiveBase = (token: string, edit: ScaleEdit | undefined, context: string): number => {
        if (edit?.kind === "tokens" && edit.base !== undefined) return edit.base;
        const meta = bindings[token];
        if (!meta) return 0;
        return selectCapture(baseline.getState(), pathIndex, meta.binding, context)?.baseMax ?? 0;
    };

    const scaleStore = createStore<ScaleStateStore>((set) => ({
        edits: {},
        links: {},
        bindings,
        linkBindings,

        setBase: (token, value) => {
            set((state) => ({
                edits: {
                    ...state.edits,
                    [token]: nextTokensEdit(state.edits[token], { base: value }),
                },
            }));
            applyAll();
        },

        setSpread: (token, value) => {
            const context = tokenStore.getState().currentContext;
            set((state) => {
                const existing = state.edits[token];
                const fallbackBase = effectiveBase(token, existing, context);
                return {
                    edits: {
                        ...state.edits,
                        [token]: nextTokensEdit(existing, {
                            base:
                                existing?.kind === "tokens"
                                    ? (existing.base ?? fallbackBase)
                                    : fallbackBase,
                            spread: value,
                        }),
                    },
                };
            });
            applyAll();
        },

        setStepOverride: (token, step, value) => {
            set((state) => {
                const existing = state.edits[token];
                const overrides = existing?.kind === "tokens" ? (existing.overrides ?? {}) : {};
                return {
                    edits: {
                        ...state.edits,
                        [token]: nextTokensEdit(existing, {
                            overrides: { ...overrides, [step]: value },
                        }),
                    },
                };
            });
            applyAll();
        },

        clearStepOverride: (token, step) => {
            set((state) => {
                const existing = state.edits[token];
                if (existing?.kind !== "tokens" || !existing.overrides) return state;
                const { [step]: _removed, ...rest } = existing.overrides;
                const nextOverrides = Object.keys(rest).length > 0 ? rest : undefined;
                return {
                    edits: {
                        ...state.edits,
                        [token]: nextTokensEdit(existing, { overrides: nextOverrides }),
                    },
                };
            });
            applyAll();
        },

        updateScale: (token, updater) => {
            const meta = bindings[token];
            if (!meta || meta.kind !== "scale") return;
            const existing = scaleStore.getState().edits[token];
            const current =
                existing?.kind === "scale"
                    ? existing.scale
                    : selectOriginalScale(baseline.getState(), meta.parentPath);
            if (!current) return;
            const next = updater(current);
            set((state) => ({
                edits: { ...state.edits, [token]: { kind: "scale", scale: next } },
            }));
            applyAll();
        },

        setLinkEnabled: (token, enabled) => {
            set((state) => ({
                links: { ...state.links, [token]: { enabled } },
            }));
            applyAll();
        },

        resetAll: () => {
            set(() => ({ edits: {}, links: {} }));
            applyAll();
        },
    }));

    function applyAll() {
        const { edits, links } = scaleStore.getState();
        const { resolved, currentContext } = tokenStore.getState();
        const next = applyScaleEdits(
            resolved,
            edits,
            links,
            bindings,
            linkBindings,
            baseline.getState(),
            pathIndex,
            currentContext
        );
        writeResolved(next);
    }

    tokenStore.subscribe((state, prev) => {
        if (state.currentContext !== prev.currentContext) {
            applyAll();
        }
    });

    subscribeBaselineEditClear(baseline, () => {
        scaleStore.setState(() => ({ edits: {}, links: {} }));
    });

    return scaleStore;
}

function nextTokensEdit(
    existing: ScaleEdit | undefined,
    patch: {
        base?: number;
        spread?: number;
        overrides?: StepOverrides | undefined;
    }
): ScaleEdit {
    if (existing?.kind === "tokens") {
        return {
            kind: "tokens",
            base: patch.base ?? existing.base,
            spread: patch.spread ?? existing.spread,
            overrides: "overrides" in patch ? patch.overrides : existing.overrides,
        };
    }
    // No prior edit (or wrong kind — shouldn't happen for valid binding).
    return {
        kind: "tokens",
        base: patch.base,
        spread: patch.spread ?? DEFAULT_SPREAD,
        overrides: patch.overrides,
    };
}

function collectBindings(
    panelSections: PanelSection[],
    snapshot: TokenSnapshot
): {
    bindings: Record<string, ScaleBindingMeta>;
    linkBindings: Record<string, LinkBindingMeta>;
} {
    const bindings: Record<string, ScaleBindingMeta> = {};
    const linkBindings: Record<string, LinkBindingMeta> = {};

    for (const section of panelSections) {
        for (const binding of section.bindings) {
            if (binding.type === "scale" && binding.base) {
                bindings[binding.token] = buildScaleBindingMeta(binding, snapshot);
            } else if (binding.type === "scale-linked") {
                linkBindings[binding.token] = {
                    bindingToken: binding.token,
                    sourceBinding: binding.scalesWith,
                };
            }
        }
    }

    // Drop link bindings whose source binding wasn't registered.
    for (const token of Object.keys(linkBindings)) {
        const link = linkBindings[token];
        if (!link || !bindings[link.sourceBinding]) {
            delete linkBindings[token];
        }
    }

    return { bindings, linkBindings };
}

function buildScaleBindingMeta(binding: ScaleBinding, snapshot: TokenSnapshot): ScaleBindingMeta {
    const parentPath = stripTrailingGlob(binding.token);
    const onDiskScale = getScaleExtension(snapshot.trees, parentPath);
    return {
        binding,
        kind: onDiskScale ? "scale" : "tokens",
        parentPath,
        sourcePath: findSourcePath(snapshot, parentPath),
    };
}

function stripTrailingGlob(pattern: string): string {
    return pattern.endsWith(".*") ? pattern.slice(0, -2) : pattern;
}

function findSourcePath(snapshot: TokenSnapshot, parentPath: string): string {
    const segments = parentPath.split(".");
    for (const tree of snapshot.trees) {
        let node: unknown = tree.tokens;
        let found = true;
        for (const segment of segments) {
            if (!node || typeof node !== "object") {
                found = false;
                break;
            }
            node = (node as Record<string, unknown>)[segment];
        }
        if (found && node && typeof node === "object") return tree.sourcePath;
    }
    return snapshot.trees[0]?.sourcePath ?? "";
}

export type { CapturedLinkedScale, CapturedScale } from "../tokens/scale-cascade";
