import { describe, expect, it } from "vitest";

import { marginTier, spareAtDeparture } from "./checkpointRow.js";

describe("spareAtDeparture", () => {
  it("is the report's margin, as the lede prints it", () => {
    // Lac d'Estaing: 0h07 to spare in the lede, so 0h07 in the row.
    expect(spareAtDeparture({ margin_s_actual: 7 * 60 + 20 })).toBe(7 * 60 + 20);
  });

  it("never lets a missed cutoff round to zero", () => {
    expect(spareAtDeparture({ margin_s_actual: -20 })).toBe(-60);
    expect(spareAtDeparture({ margin_s_actual: -600 })).toBe(-600);
  });

  it("is null without a cutoff", () => {
    expect(spareAtDeparture({ margin_s_actual: null })).toBeNull();
  });
});

describe("marginTier", () => {
  it("is OK at 1h or more, Tight under, Over past the cutoff", () => {
    expect(marginTier(3600)).toBe("ok");
    expect(marginTier(3599)).toBe("tight");
    expect(marginTier(0)).toBe("tight");
    expect(marginTier(-60)).toBe("over");
    expect(marginTier(null)).toBeNull();
  });
});
