export const STUDIO_RPC = {
    SAVE: "sugarcube:studio:save",
    DISCARD: "sugarcube:studio:discard",
    SHARED_STATE_WORKING: "sugarcube:studio:working",
    SHARED_STATE_DISK: "sugarcube:studio:disk",
} as const;

export const STUDIO_MESSAGE = {
    INIT: "sugarcube:studio:init",
    READY: "sugarcube:studio:ready",
    SAVE: "sugarcube:studio:save",
    SAVE_RESULT: "sugarcube:studio:save-result",
    CSS_UPDATE: "sugarcube:studio:css-update",
} as const;

export type StudioRpc = (typeof STUDIO_RPC)[keyof typeof STUDIO_RPC];
export type StudioMessage = (typeof STUDIO_MESSAGE)[keyof typeof STUDIO_MESSAGE];
