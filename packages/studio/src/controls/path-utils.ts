import type { PanelBinding } from "@sugarcube-sh/core/client";

export function joinTokenPath(...segments: string[]): string {
    return segments
        .flatMap((s) => s.split("."))
        .filter(Boolean)
        .join(".");
}

export function wrapRef(path: string): string {
    return `{${path}}`;
}

export function unwrapRef(value: unknown): string | undefined {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        return trimmed.slice(1, -1).trim();
    }
    return undefined;
}

export function stripTrailingGlob(path: string): string {
    let p = path;
    while (p.endsWith(".*")) p = p.slice(0, -2);
    return p;
}

export function lastSegment(path: string): string {
    const p = stripTrailingGlob(path);
    const lastDot = p.lastIndexOf(".");
    return lastDot === -1 ? p : p.substring(lastDot + 1);
}

export function labelForBinding(binding: PanelBinding): string {
    if (binding.label) return binding.label;
    const path = binding.type === "palette-swap" ? binding.family : binding.token;
    return lastSegment(path);
}

export function resolveTerminalPath(path: string, getToken: (path: string) => unknown): string {
    const seen = new Set<string>();
    let current = path;
    while (true) {
        if (seen.has(current)) return current;
        seen.add(current);
        const next = unwrapRef(getToken(current));
        if (!next) return current;
        current = next;
    }
}
