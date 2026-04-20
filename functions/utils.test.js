const {
  startOfWeek,
  endOfWeek,
  weekLabel,
  daysUntilExpiry,
  expiryTextClass,
  formatQty,
  parseExpiryDate,
  validateProduct,
  validateQuantity,
  validateUnit,
  buildWeekBuckets,
} = require("./utils");

// helper to get a date N days from today as YYYY-MM-DD
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ─── startOfWeek ────────────────────────────────────────────────
describe("startOfWeek", () => {
  test("returns a Sunday", () => {
    const result = startOfWeek(new Date("2024-03-13")); // Wednesday
    expect(result.getDay()).toBe(0);
  });

  test("is already Sunday — returns same day", () => {
    const result = startOfWeek(new Date("2024-03-10")); // Sunday
    expect(result.getDay()).toBe(0);
  });

  test("time is set to midnight", () => {
    const result = startOfWeek(new Date("2024-03-13T15:30:00"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
  });
});

// ─── endOfWeek ──────────────────────────────────────────────────
describe("endOfWeek", () => {
  test("is exactly 7 days after startOfWeek", () => {
    const date = new Date("2024-03-13");
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    const diff = (end - start) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(7);
  });

  test("end is after start", () => {
    const end = endOfWeek(new Date("2024-03-13"));
    const start = startOfWeek(new Date("2024-03-13"));
    expect(end > start).toBe(true);
  });
});

// ─── weekLabel ──────────────────────────────────────────────────
describe("weekLabel", () => {
  test("returns a non-empty string", () => {
    const label = weekLabel(new Date("2024-03-10"));
    expect(typeof label).toBe("string");
    expect(label.length).toBeGreaterThan(0);
  });

  test("contains the month abbreviation", () => {
    const label = weekLabel(new Date("2024-03-10"));
    expect(label).toContain("Mar");
  });
});

// ─── daysUntilExpiry ────────────────────────────────────────────
describe("daysUntilExpiry", () => {
  test("past date returns Expired", () => {
    expect(daysUntilExpiry(daysFromToday(-1))).toBe("Expired");
  });

  test("today returns Expires today", () => {
    expect(daysUntilExpiry(daysFromToday(0))).toBe("Expires today");
  });

  test("tomorrow returns 1 day left", () => {
    expect(daysUntilExpiry(daysFromToday(1))).toBe("1 day left");
  });

  test("5 days returns 5 days left", () => {
    expect(daysUntilExpiry(daysFromToday(5))).toBe("5 days left");
  });

  test("far future returns correct count", () => {
    expect(daysUntilExpiry(daysFromToday(30))).toBe("30 days left");
  });
});

// ─── expiryTextClass ────────────────────────────────────────────
describe("expiryTextClass", () => {
  test("expired returns text-danger", () => {
    expect(expiryTextClass(daysFromToday(-1))).toBe("text-danger");
  });

  test("expires today returns text-warning", () => {
    expect(expiryTextClass(daysFromToday(0))).toBe("text-warning");
  });

  test("expires in 2 days returns text-warning", () => {
    expect(expiryTextClass(daysFromToday(2))).toBe("text-warning");
  });

  test("expires in 3 days returns text-success", () => {
    expect(expiryTextClass(daysFromToday(3))).toBe("text-success");
  });

  test("far future returns text-success", () => {
    expect(expiryTextClass(daysFromToday(60))).toBe("text-success");
  });
});

// ─── formatQty ──────────────────────────────────────────────────
describe("formatQty", () => {
  test("normal quantity and unit", () => {
    expect(formatQty(3, "kg")).toBe("3 kg");
  });

  test("decimal quantity", () => {
    expect(formatQty(1.5, "L")).toBe("1.5 L");
  });

  test("zero quantity", () => {
    expect(formatQty(0, "item")).toBe("0 item");
  });

  test("missing unit defaults to item", () => {
    expect(formatQty(2, null)).toBe("2 item");
  });

  test("invalid quantity defaults to 1", () => {
    expect(formatQty("abc", "kg")).toBe("1 kg");
  });

  test("undefined quantity defaults to 1", () => {
    expect(formatQty(undefined, "kg")).toBe("1 kg");
  });
});

// ─── parseExpiryDate ────────────────────────────────────────────
describe("parseExpiryDate", () => {
  test("parses DD/MM/YYYY", () => {
    expect(parseExpiryDate("Best before 25/06/2026")).toBe("2026-06-25");
  });

  test("parses DD-MM-YYYY", () => {
    expect(parseExpiryDate("25-06-2026")).toBe("2026-06-25");
  });

  test("parses DD/MM/YY", () => {
    expect(parseExpiryDate("25/06/26")).toBe("2026-06-25");
  });

  test("parses MM/YYYY", () => {
    expect(parseExpiryDate("06/2026")).toBe("2026-06-01");
  });

  test("parses MM/YY", () => {
    expect(parseExpiryDate("06/26")).toBe("2026-06-01");
  });

  test("returns null when no date found", () => {
    expect(parseExpiryDate("no date here")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseExpiryDate("")).toBeNull();
  });
});

// ─── validateProduct ────────────────────────────────────────────
describe("validateProduct", () => {
  test("valid input returns null", () => {
    expect(validateProduct({ userId: "u1", name: "Milk", expiryDate: "2026-01-01" })).toBeNull();
  });

  test("missing userId returns error", () => {
    expect(validateProduct({ userId: "", name: "Milk", expiryDate: "2026-01-01" })).toBeTruthy();
  });

  test("missing name returns error", () => {
    expect(validateProduct({ userId: "u1", name: "", expiryDate: "2026-01-01" })).toBeTruthy();
  });

  test("missing expiryDate returns error", () => {
    expect(validateProduct({ userId: "u1", name: "Milk", expiryDate: "" })).toBeTruthy();
  });

  test("whitespace name returns error", () => {
    expect(validateProduct({ userId: "u1", name: "   ", expiryDate: "2026-01-01" })).toBeTruthy();
  });
});

// ─── validateQuantity ───────────────────────────────────────────
describe("validateQuantity", () => {
  test("valid positive number returns null", () => {
    expect(validateQuantity(5)).toBeNull();
  });

  test("zero is valid", () => {
    expect(validateQuantity(0)).toBeNull();
  });

  test("decimal is valid", () => {
    expect(validateQuantity(1.5)).toBeNull();
  });

  test("negative number returns error", () => {
    expect(validateQuantity(-1)).toBeTruthy();
  });

  test("string returns error", () => {
    expect(validateQuantity("abc")).toBeTruthy();
  });

  test("undefined returns error", () => {
    expect(validateQuantity(undefined)).toBeTruthy();
  });
});

// ─── validateUnit ───────────────────────────────────────────────
describe("validateUnit", () => {
  test("valid unit returns null", () => {
    expect(validateUnit("kg")).toBeNull();
  });

  test("empty string returns error", () => {
    expect(validateUnit("")).toBeTruthy();
  });

  test("whitespace returns error", () => {
    expect(validateUnit("   ")).toBeTruthy();
  });

  test("null returns error", () => {
    expect(validateUnit(null)).toBeTruthy();
  });
});

// ─── buildWeekBuckets ───────────────────────────────────────────
describe("buildWeekBuckets", () => {
  test("returns correct number of buckets", () => {
    expect(buildWeekBuckets(4).length).toBe(4);
    expect(buildWeekBuckets(8).length).toBe(8);
  });

  test("each bucket has required fields", () => {
    const buckets = buildWeekBuckets(4);
    buckets.forEach(b => {
      expect(b).toHaveProperty("label");
      expect(b).toHaveProperty("start");
      expect(b).toHaveProperty("end");
      expect(b).toHaveProperty("used");
      expect(b).toHaveProperty("wasted");
    });
  });

  test("buckets start at 0 used and wasted", () => {
    const buckets = buildWeekBuckets(4);
    buckets.forEach(b => {
      expect(b.used).toBe(0);
      expect(b.wasted).toBe(0);
    });
  });

  test("each bucket end is after start", () => {
    const buckets = buildWeekBuckets(4);
    buckets.forEach(b => {
      expect(b.end > b.start).toBe(true);
    });
  });

  test("buckets are in chronological order", () => {
    const buckets = buildWeekBuckets(4);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].start >= buckets[i - 1].start).toBe(true);
    }
  });
});
