import { describe, expect, it } from "vitest";
import { roundTo } from "../src/shared/round";

describe("roundTo", () => {
    it("rounds to 4 decimals by default", () => {
        expect(roundTo(0.123456789)).toBe(0.1235);
    });

    it("kills binary-float drift", () => {
        expect(roundTo(0.1 + 0.2)).toBe(0.3);
    });

    it("accepts a precision override", () => {
        expect(roundTo(1.23456789, 2)).toBe(1.23);
        expect(roundTo(1.23456789, 6)).toBe(1.234568);
    });

    it("returns whole numbers untouched", () => {
        expect(roundTo(42)).toBe(42);
        expect(roundTo(0)).toBe(0);
        expect(roundTo(-7)).toBe(-7);
    });

    it("rounds negative values symmetrically", () => {
        expect(roundTo(-0.12345)).toBe(-0.1234);
    });
});
