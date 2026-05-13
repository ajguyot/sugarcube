import { describe, expect, it } from "vitest";
import { isTokenSnapshot } from "../src/host/embedded-host";

describe("isTokenSnapshot", () => {
    it("accepts an object with config, trees, and resolved", () => {
        expect(isTokenSnapshot({ config: {}, trees: [], resolved: {} })).toBe(true);
    });

    it("rejects an object missing any required key", () => {
        expect(isTokenSnapshot({ trees: [], resolved: {} })).toBe(false);
        expect(isTokenSnapshot({ config: {}, resolved: {} })).toBe(false);
        expect(isTokenSnapshot({ config: {}, trees: [] })).toBe(false);
    });

    it("rejects non-object values", () => {
        expect(isTokenSnapshot(undefined)).toBe(false);
        expect(isTokenSnapshot(null)).toBe(false);
        expect(isTokenSnapshot("snapshot")).toBe(false);
        expect(isTokenSnapshot(42)).toBe(false);
    });

    it("rejects an empty object", () => {
        expect(isTokenSnapshot({})).toBe(false);
    });
});
