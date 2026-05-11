import { type ScaleExtension, calculateScale } from "@sugarcube-sh/core/client";
import type { GeneratedStep } from "@sugarcube-sh/core/client";
import { useBaseline } from "../store/hooks";

type ScalePreviewProps = {
    extension: ScaleExtension;
};

export function ScalePreview({ extension }: ScalePreviewProps) {
    const viewport = useBaseline().config.variables.transforms.fluid;
    const steps = calculateScale(extension);

    return (
        <div className="scale-preview">
            {steps.map((step) => (
                <div className="scale-row" key={step.name}>
                    <span className="scale-label">{step.name}</span>
                    <span className="scale-value">{formatClamp(step, viewport)}</span>
                </div>
            ))}
        </div>
    );
}

const ROOT_FONT_SIZE = 16;

function formatClamp(step: GeneratedStep, viewport: { min: number; max: number }): string {
    const minSize = toPixels(step.min);
    const maxSize = toPixels(step.max);

    if (minSize === maxSize) {
        return `${minSize / ROOT_FONT_SIZE}rem`;
    }

    const minSizeRem = minSize / ROOT_FONT_SIZE;
    const maxSizeRem = maxSize / ROOT_FONT_SIZE;
    const minViewportRem = viewport.min / ROOT_FONT_SIZE;
    const maxViewportRem = viewport.max / ROOT_FONT_SIZE;

    const slope = (maxSizeRem - minSizeRem) / (maxViewportRem - minViewportRem);
    const intersection = -1 * minViewportRem * slope + minSizeRem;

    return `clamp(${minSizeRem}rem, ${intersection.toFixed(2)}rem + ${(slope * 100).toFixed(
        2
    )}vw, ${maxSizeRem}rem)`;
}

function toPixels(value: { value: number; unit: "rem" | "px" }): number {
    return value.unit === "px" ? value.value : value.value * ROOT_FONT_SIZE;
}
