import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useHost } from "../host/host-provider";
import type { SaveBundle } from "../host/types";
import { diffToFileEdits } from "../tokens/diff-to-edits";
import type { TokenDiffEntry } from "../tokens/types";

type SaveStatus =
    | { kind: "idle" }
    | { kind: "saving" }
    | { kind: "persisted" }
    | { kind: "pr-submitted"; number: number; url: string }
    | { kind: "failed"; error: string };

const SAVED_PIP_DURATION_MS = 2000;

type UseSaveResult = {
    saving: boolean;
    label: string;
    feedback: ReactNode;
    onSave: () => Promise<void>;
    reset: () => void;
};

export function useSave(diff: readonly TokenDiffEntry[]): UseSaveResult {
    const host = useHost();
    const diffRef = useRef(diff);
    diffRef.current = diff;

    const [status, setStatus] = useState<SaveStatus>({ kind: "idle" });

    useEffect(() => {
        if (status.kind !== "persisted") return;
        const t = setTimeout(() => setStatus({ kind: "idle" }), SAVED_PIP_DURATION_MS);
        return () => clearTimeout(t);
    }, [status.kind]);

    const reset = useCallback(() => setStatus({ kind: "idle" }), []);

    const onSave = useCallback(async () => {
        setStatus({ kind: "saving" });
        const result = await host.save(buildSaveBundle(diffRef.current));
        setStatus(result);
    }, [host]);

    return {
        saving: status.kind === "saving",
        label: status.kind === "saving" ? "Saving…" : host.capabilities.saveLabel,
        feedback: renderFeedback(status),
        onSave,
        reset,
    };
}

function buildSaveBundle(diff: readonly TokenDiffEntry[]): SaveBundle {
    const files = diffToFileEdits(diff);
    const title =
        diff.length === 1 && diff[0] ? `Update ${diff[0].path}` : `Update ${diff.length} tokens`;
    return { title, description: "", files };
}

function renderFeedback(status: SaveStatus): ReactNode {
    switch (status.kind) {
        case "persisted":
            return (
                <output className="save-pip">
                    <span>Saved</span>
                </output>
            );
        case "pr-submitted":
            return (
                <a
                    className="save-pr-link"
                    href={status.url}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View PR #{status.number}
                </a>
            );
        case "failed":
            return (
                <span className="save-error" role="alert">
                    {status.error}
                </span>
            );
        default:
            return null;
    }
}
