import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useHost } from "../host/host-provider";
import { useDiscard, usePendingChanges, usePendingChangesCount } from "../store/hooks";
import { useSave } from "./use-save";

type DesignActionsProps = {
    diffOpen: boolean;
    onToggleDiff: () => void;
    diffPanelId: string;
};

export function DesignActions({ diffOpen, onToggleDiff, diffPanelId }: DesignActionsProps) {
    const { discardLabel } = useHost().capabilities;
    const pendingCount = usePendingChangesCount();
    const diff = usePendingChanges();
    const discard = useDiscard();
    const { saving, label, feedback, onSave, reset: resetSave } = useSave(diff);

    const handleDiscard = async () => {
        resetSave();
        await discard();
    };

    const changesLabel = `${pendingCount} ${pendingCount === 1 ? "change" : "changes"}`;

    return (
        <div className="design-actions" role="toolbar" aria-label="Design changes actions">
            <button
                type="button"
                onClick={onToggleDiff}
                aria-expanded={diffOpen}
                aria-controls={diffPanelId}
            >
                {diffOpen ? <ChevronDownIcon aria-hidden /> : <ChevronRightIcon aria-hidden />}
                <span>{changesLabel}</span>
            </button>
            <button
                type="button"
                onClick={handleDiscard}
                aria-label={`${discardLabel} all pending design changes`}
            >
                {discardLabel}
            </button>
            <button type="button" onClick={onSave} disabled={saving}>
                {label}
            </button>
            {feedback}
        </div>
    );
}
