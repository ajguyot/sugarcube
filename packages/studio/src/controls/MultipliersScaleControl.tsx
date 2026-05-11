import type { MultiplierScaleConfig, ScaleBinding } from "@sugarcube-sh/core/client";
import { useBaseline, useScaleState } from "../store/hooks";
import { selectEffectiveScale } from "../store/scale-state";
import { ScalePreview } from "./ScalePreview";
import { labelForBinding } from "./path-utils";

type MultipliersScaleControlProps = {
    binding: ScaleBinding;
};

type PairsMode = "none" | "adjacent" | "custom";

/**
 * Controls for a multipliers scale extension: base size, editable list
 * of named multipliers, and a pairs toggle (none / adjacent / custom).
 * Edits route through `scaleState.updateScale`; preview updates live.
 */
export function MultipliersScaleControl({ binding }: MultipliersScaleControlProps) {
    const meta = useScaleState((s) => s.bindings[binding.token]);
    const edit = useScaleState((s) => s.edits[binding.token]);
    const updateScale = useScaleState((s) => s.updateScale);
    const baseline = useBaseline();

    if (!meta || meta.kind !== "scale") return null;
    const effective = selectEffectiveScale(baseline, edit, meta.parentPath);
    if (!effective || effective.mode !== "multipliers") return null;
    const scale = effective as MultiplierScaleConfig;
    const label = labelForBinding(binding);

    const pairsMode = pairsToMode(scale.pairs);

    return (
        <div className="scale-control">
            <div className="scale-row">
                <span className="scale-label">{label} base</span>
                <input
                    className="scale-slider"
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.025}
                    value={scale.base.max.value}
                    onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) return;
                        updateScale(binding.token, (s) => ({
                            ...s,
                            base: {
                                min: { ...s.base.min, value: roundTo(next * 0.875, 4) },
                                max: { ...s.base.max, value: next },
                            },
                        }));
                    }}
                    aria-label={`${label} base`}
                />
                <span className="scale-value">{scale.base.max.value.toFixed(3)}</span>
            </div>

            <div className="scale-multipliers">
                <span className="scale-label">Sizes</span>
                {Object.entries(scale.multipliers).map(([name, value]) => (
                    <div className="multiplier-row" key={name}>
                        <span className="multiplier-name">{name}</span>
                        <input
                            className="scale-number"
                            type="number"
                            min={0}
                            step={0.05}
                            value={value}
                            onChange={(e) => {
                                const next = Number(e.target.value);
                                if (!Number.isFinite(next)) return;
                                updateScale(binding.token, (s) => ({
                                    ...s,
                                    multipliers: {
                                        ...(s as MultiplierScaleConfig).multipliers,
                                        [name]: next,
                                    },
                                }));
                            }}
                            aria-label={`${name} multiplier`}
                        />
                    </div>
                ))}
            </div>

            <div className="scale-row">
                <span className="scale-label">Pairs</span>
                <select
                    className="scale-select"
                    value={pairsMode}
                    onChange={(e) => {
                        const nextMode = e.target.value as PairsMode;
                        updateScale(binding.token, (s) => {
                            const multi = s as MultiplierScaleConfig;
                            const { pairs: _drop, ...rest } = multi;
                            if (nextMode === "none") return rest;
                            if (nextMode === "adjacent") {
                                return { ...rest, pairs: "adjacent" } as MultiplierScaleConfig;
                            }
                            return { ...rest, pairs: [] as string[] } as MultiplierScaleConfig;
                        });
                    }}
                    aria-label="pairs mode"
                >
                    <option value="none">None</option>
                    <option value="adjacent">Adjacent</option>
                    <option value="custom">Custom list</option>
                </select>
            </div>

            <ScalePreview extension={scale} />
        </div>
    );
}

function pairsToMode(pairs: MultiplierScaleConfig["pairs"]): PairsMode {
    if (pairs === "adjacent") return "adjacent";
    if (Array.isArray(pairs)) return "custom";
    return "none";
}

function roundTo(value: number, precision: number): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}
