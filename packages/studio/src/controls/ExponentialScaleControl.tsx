import type { ExponentialScaleConfig, ScaleBinding } from "@sugarcube-sh/core/client";
import { useBaseline, useScaleState } from "../store/hooks";
import { selectEffectiveScale } from "../store/scale-state";
import { ScalePreview } from "./ScalePreview";
import { labelForBinding } from "./path-utils";

type ExponentialScaleControlProps = {
    binding: ScaleBinding;
};

const RATIO_PRESETS = [
    { label: "Minor Second (1.067)", value: 1.067 },
    { label: "Major Second (1.125)", value: 1.125 },
    { label: "Minor Third (1.2)", value: 1.2 },
    { label: "Major Third (1.25)", value: 1.25 },
    { label: "Perfect Fourth (1.333)", value: 1.333 },
    // biome-ignore lint/suspicious/noApproximativeNumericConstant: rounded musical ratio for preset label/value consistency
    { label: "Augmented Fourth (1.414)", value: 1.414 },
    { label: "Perfect Fifth (1.5)", value: 1.5 },
    { label: "Golden Ratio (1.618)", value: 1.618 },
];

/**
 * Controls for an exponential scale extension: ratio, base size, and
 * step counts. Edits route through `scaleState.updateScale`; the preview
 * table at the bottom updates live.
 */
export function ExponentialScaleControl({ binding }: ExponentialScaleControlProps) {
    const meta = useScaleState((s) => s.bindings[binding.token]);
    const edit = useScaleState((s) => s.edits[binding.token]);
    const updateScale = useScaleState((s) => s.updateScale);
    const baseline = useBaseline();

    if (!meta || meta.kind !== "scale") return null;
    const effective = selectEffectiveScale(baseline, edit, meta.parentPath);
    if (!effective || effective.mode !== "exponential") return null;
    const scale = effective as ExponentialScaleConfig;
    const label = labelForBinding(binding);

    return (
        <div className="scale-control">
            <div className="scale-row">
                <span className="scale-label">{label} ratio</span>
                <select
                    className="scale-select"
                    value={String(scale.ratio.max)}
                    onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isFinite(next)) return;
                        updateScale(binding.token, (s) => ({
                            ...s,
                            ratio: { min: next, max: next },
                        }));
                    }}
                    aria-label={`${label} ratio`}
                >
                    {RATIO_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                            {preset.label}
                        </option>
                    ))}
                </select>
            </div>

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
                                min: { ...s.base.min, value: roundTo(next * 0.95, 4) },
                                max: { ...s.base.max, value: next },
                            },
                        }));
                    }}
                    aria-label={`${label} base`}
                />
                <span className="scale-value">{scale.base.max.value.toFixed(3)}</span>
            </div>

            <div className="scale-row">
                <span className="scale-label">{label} steps up</span>
                <input
                    className="scale-number"
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={scale.steps.positive}
                    onChange={(e) => {
                        const next = Number.parseInt(e.target.value, 10);
                        if (!Number.isFinite(next) || next < 0) return;
                        updateScale(binding.token, (s) => {
                            const exp = s as ExponentialScaleConfig;
                            return { ...exp, steps: { ...exp.steps, positive: next } };
                        });
                    }}
                    aria-label={`${label} steps up`}
                />
            </div>

            <div className="scale-row">
                <span className="scale-label">{label} steps down</span>
                <input
                    className="scale-number"
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    value={scale.steps.negative}
                    onChange={(e) => {
                        const next = Number.parseInt(e.target.value, 10);
                        if (!Number.isFinite(next) || next < 0) return;
                        updateScale(binding.token, (s) => {
                            const exp = s as ExponentialScaleConfig;
                            return { ...exp, steps: { ...exp.steps, negative: next } };
                        });
                    }}
                    aria-label={`${label} steps down`}
                />
            </div>

            <ScalePreview extension={scale} />
        </div>
    );
}

function roundTo(value: number, precision: number): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
}
