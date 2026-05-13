import type { ScaleBinding, ScaleExtension } from "@sugarcube-sh/core/client";

type Dim = { value: number; unit: string };

/**
 * Per-step value overrides for a bulk-mode scale, keyed by step name
 * (e.g. `"md"`, `"-2"`). Pinning a step here makes it survive bulk
 * recomputes — the base/spread sliders will skip it.
 *
 * (Reserved for Stage B; not yet wired to actions.)
 */
export type StepOverrides = Record<string, { min: Dim; max: Dim }>;

/**
 * A user's edits to a single scale binding. Discriminated by `kind`,
 * which mirrors the underlying data shape of the bound group:
 *
 * - `"tokens"`: hand-written scale (no `sh.sugarcube.scale`). `base` and
 *   `spread` are slider transforms applied to every step. `overrides`
 *   pins specific steps so they survive bulk recomputes.
 * - `"scale"`: scale-extension-driven (the group has `sh.sugarcube.scale`).
 *   `scale` is the user's edited scale extension parameters.
 *
 * Absent token in the parent edits map means "no edits yet."
 */
export type ScaleEdit =
    | { kind: "tokens"; base?: number; spread?: number; overrides?: StepOverrides }
    | { kind: "scale"; scale: ScaleExtension };

/** Toggle state for a `scale-linked` binding. */
export type LinkEdit = { enabled: boolean };

/**
 * Static metadata captured at scale-state init for each scale binding.
 * Lives separately from `edits` because it doesn't change with user
 * actions — only with baseline updates that rebuild the state.
 */
export type ScaleBindingMeta = {
    binding: ScaleBinding;
    /** Determined by whether the bound group has `sh.sugarcube.scale`. */
    kind: "tokens" | "scale";
    /** Group path (binding token with the trailing `.*` stripped). */
    parentPath: string;
    /** File path of the JSON tree the group lives in (for save routing). */
    sourcePath: string;
};

/** Static metadata for a `scale-linked` binding. */
export type LinkBindingMeta = {
    bindingToken: string;
    sourceBinding: string;
};
