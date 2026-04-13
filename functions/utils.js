function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfWeek(date) {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(e.getDate() + 7);
  return e;
}

function weekLabel(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
}

function daysUntilExpiry(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Expired";
  if (diffDays === 0) return "Expires today";
  if (diffDays === 1) return "1 day left";
  return `${diffDays} days left`;
}

function expiryTextClass(expiryDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "text-danger";
  if (diffDays <= 2) return "text-warning";
  return "text-success";
}

function formatQty(quantity, unit) {
  const q = Number(quantity);
  const safeQ = Number.isFinite(q) ? q : 1;
  const safeUnit = (unit || "item").toString();
  return `${safeQ} ${safeUnit}`;
}

function parseExpiryDate(text) {
  const patterns = [
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
    /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/,
    /(\d{1,2})[\/\-\.](\d{4})/,
    /(\d{1,2})[\/\-\.](\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    if (match.length === 4) {
      let [, day, month, year] = match;
      if (year.length === 2) year = "20" + year;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    } else {
      let [, month, year] = match;
      if (year.length === 2) year = "20" + year;
      return `${year}-${month.padStart(2, "0")}-01`;
    }
  }
  return null;
}


function validateProduct({ userId, name, expiryDate }) {
  if (!userId || !name || !expiryDate) return "Missing required fields";
  if (!name.toString().trim()) return "Name cannot be empty";
  return null;
}

function validateQuantity(quantity) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed) || parsed < 0) return "Quantity must be a number >= 0";
  return null;
}

function validateUnit(unit) {
  if (!unit || !unit.toString().trim()) return "Unit cannot be empty";
  return null;
}

function buildWeekBuckets(weekCount) {
  const now = new Date();
  const buckets = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const anchor = new Date(now);
    anchor.setDate(anchor.getDate() - i * 7);
    const start = startOfWeek(anchor);
    const end = endOfWeek(anchor);
    buckets.push({ label: weekLabel(start), start, end, used: 0, wasted: 0 });
  }
  return buckets;
}

module.exports = {
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
};
