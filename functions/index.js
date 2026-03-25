const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const nodemailer = require("nodemailer");

const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });
const db = getFirestore();

/**
 * Add Product
 */
exports.addProduct = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { userId, name, expiryDate, expiryTimestampUtc, status } = request.body || {};

      if (!userId || !name || !expiryDate) {
        response.status(400).json({ success: false, message: "Missing required fields" });
        return;
      }

      const now = new Date().toISOString();

      const res = await db.collection("products").add({
        userId,
        name,
        expiryDate,
        expiryTimestampUtc: expiryTimestampUtc || new Date(expiryDate).toISOString(),
        status: status || "active",
        createdAt: now,
        updatedAt: now,
        usedAt: null,
        wastedAt: null,
        deletedAt: null
      });

      response.json({ success: true, id: res.id });
    } catch (error) {
      console.error("addProduct error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Get active products for dashboard
 */
exports.getProducts = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { userId } = request.query;
      if (!userId) {
        response.status(400).json({ success: false, message: "Missing userId" });
        return;
      }

      const snapshot = await db
        .collection("products")
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .get();

      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      response.json({ success: true, products });
    } catch (error) {
      console.error("getProducts error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Soft delete product
 */
exports.deleteProduct = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { productId } = request.body || {};
      if (!productId) {
        response.status(400).json({ success: false, message: "Missing productId" });
        return;
      }

      const now = new Date().toISOString();

      await db.collection("products").doc(productId).update({
        status: "deleted",
        deletedAt: now,
        updatedAt: now
      });

      response.json({ success: true });
    } catch (error) {
      console.error("deleteProduct error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Generic update endpoint (keep if you still use it elsewhere)
 */
exports.updateProduct = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { productId, ...updates } = request.body || {};
      if (!productId) {
        response.status(400).json({ success: false, message: "Missing productId" });
        return;
      }

      updates.updatedAt = new Date().toISOString();

      await db.collection("products").doc(productId).update(updates);
      response.json({ success: true });
    } catch (error) {
      console.error("updateProduct error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Mark product as used/wasted
 */
exports.updateProductStatus = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { productId, status } = request.body || {};

      if (!productId || !["used", "wasted"].includes(status)) {
        response.status(400).json({ success: false, message: "Invalid payload" });
        return;
      }

      const now = new Date().toISOString();
      const updates = {
        status,
        updatedAt: now,
        usedAt: status === "used" ? now : null,
        wastedAt: status === "wasted" ? now : null
      };

      await db.collection("products").doc(productId).update(updates);
      response.json({ success: true });
    } catch (error) {
      console.error("updateProductStatus error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Undo used/wasted back to active
 */
exports.undoProductStatus = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { productId } = request.body || {};
      if (!productId) {
        response.status(400).json({ success: false, message: "Missing productId" });
        return;
      }

      const now = new Date().toISOString();

      await db.collection("products").doc(productId).update({
        status: "active",
        usedAt: null,
        wastedAt: null,
        updatedAt: now
      });

      response.json({ success: true });
    } catch (error) {
      console.error("undoProductStatus error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Get history items (used/wasted/deleted)
 */
exports.getHistory = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { userId, limit = 50 } = request.query;
      if (!userId) {
        response.status(400).json({ success: false, message: "Missing userId" });
        return;
      }

      const snapshot = await db
        .collection("products")
        .where("userId", "==", userId)
        .where("status", "in", ["used", "wasted", "deleted"])
        .get();

      const items = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTime - aTime;
        })
        .slice(0, Number(limit));

      response.json({ success: true, items });
    } catch (error) {
      console.error("getHistory error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Weekly analytics (4/8/12 weeks)
 */
exports.getWeeklyAnalytics = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { userId, weeks = 4 } = request.query;
      const weekCount = Number(weeks);

      if (!userId || ![4, 8, 12].includes(weekCount)) {
        response.status(400).json({ success: false, message: "Invalid userId/weeks" });
        return;
      }

      const snapshot = await db
        .collection("products")
        .where("userId", "==", userId)
        .where("status", "in", ["used", "wasted"])
        .get();

      const now = new Date();
      const buckets = [];

      // oldest -> newest
      for (let i = weekCount - 1; i >= 0; i--) {
        const anchor = new Date(now);
        anchor.setDate(anchor.getDate() - i * 7);
        const start = startOfWeek(anchor);
        const end = endOfWeek(anchor);

        buckets.push({
          label: weekLabel(start),
          start,
          end,
          used: 0,
          wasted: 0
        });
      }

      snapshot.docs.forEach((doc) => {
        const item = doc.data();

        if (item.status === "used" && item.usedAt) {
          const usedDate = new Date(item.usedAt);
          const bucket = buckets.find((b) => usedDate >= b.start && usedDate < b.end);
          if (bucket) bucket.used += 1;
        }

        if (item.status === "wasted" && item.wastedAt) {
          const wastedDate = new Date(item.wastedAt);
          const bucket = buckets.find((b) => wastedDate >= b.start && wastedDate < b.end);
          if (bucket) bucket.wasted += 1;
        }
      });

      const totalUsed = buckets.reduce((sum, b) => sum + b.used, 0);
      const totalWasted = buckets.reduce((sum, b) => sum + b.wasted, 0);
      const denom = totalUsed + totalWasted;

      response.json({
        success: true,
        labels: buckets.map((b) => b.label),
        used: buckets.map((b) => b.used),
        wasted: buckets.map((b) => b.wasted),
        wasteRate: denom === 0 ? 0 : totalWasted / denom
      });
    } catch (error) {
      console.error("getWeeklyAnalytics error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Daily expiry email check
 */
exports.dailyExpiryCheck = onSchedule(
  { schedule: "every 24 hours", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL_USER.value(),
          pass: EMAIL_PASS.value()
        }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const snapshot = await db
        .collection("products")
        .where("status", "==", "active")
        .get();

      const expiringProducts = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((product) => {
          if (!product.expiryDate) return false;
          const expiry = new Date(product.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry >= today && expiry <= threeDaysFromNow;
        });

      const byUser = {};
      for (const product of expiringProducts) {
        if (!byUser[product.userId]) byUser[product.userId] = [];
        byUser[product.userId].push(product);
      }

      for (const userId of Object.keys(byUser)) {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) continue;

        const userEmail = userDoc.data().email;
        if (!userEmail) continue;

        const items = byUser[userId]
          .map((p) => `${p.name} (expires ${p.expiryDate})`)
          .join("\n");

        await transporter.sendMail({
          from: EMAIL_USER.value(),
          to: userEmail,
          subject: "PantryPlan - Items Expiring Soon!",
          text:
`Hi,

The following items in your pantry are expiring soon:

${items}

Log in to PantryPlan to use them before they expire!

PantryPlan`
        });

        console.log("Expiry email sent to:", userEmail);
      }

      console.log("dailyExpiryCheck complete");
    } catch (error) {
      console.error("dailyExpiryCheck error:", error);
    }
  }
);

exports.getInsightsSummary = onRequest(
  { cors: true },
  async (request, response) => {
    try {
      const { userId } = request.query;
      if (!userId) {
        response.status(400).json({ success: false, message: "Missing userId" });
        return;
      }

      const snapshot = await db
        .collection("products")
        .where("userId", "==", userId)
        .get();

      const allItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // ----- Top Wasted (last 30 days) -----
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const wastedIn30Days = allItems.filter((item) => {
        if (item.status !== "wasted" || !item.wastedAt) return false;
        const wastedDate = new Date(item.wastedAt);
        return wastedDate >= thirtyDaysAgo && wastedDate <= now;
      });

      const wasteCountByName = {};
      wastedIn30Days.forEach((item) => {
        const key = (item.name || "Unknown").trim().toLowerCase();
        if (!wasteCountByName[key]) {
          wasteCountByName[key] = { name: item.name || "Unknown", count: 0 };
        }
        wasteCountByName[key].count += 1;
      });

      const topWasted = Object.values(wasteCountByName)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // ----- Expiring Soon (active only) -----
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const activeItems = allItems.filter((item) => item.status === "active");

      const expiringList = activeItems
        .map((item) => {
          if (!item.expiryDate) return null;
          const expiry = new Date(item.expiryDate);
          expiry.setHours(0, 0, 0, 0);

          const diffMs = expiry - startOfToday;
          const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          return {
            id: item.id,
            name: item.name,
            expiryDate: item.expiryDate,
            daysLeft
          };
        })
        .filter((item) => item && item.daysLeft >= 0 && item.daysLeft <= 7)
        .sort((a, b) => a.daysLeft - b.daysLeft);

      const in1Day = expiringList.filter((i) => i.daysLeft <= 1).length;
      const in3Days = expiringList.filter((i) => i.daysLeft <= 3).length;
      const in7Days = expiringList.filter((i) => i.daysLeft <= 7).length;

      response.json({
        success: true,
        topWasted,
        expiringSoon: {
          in1Day,
          in3Days,
          in7Days,
          items: expiringList.slice(0, 6)
        }
      });
    } catch (error) {
      console.error("getInsightsSummary error:", error);
      response.status(500).json({ success: false, message: "Internal error" });
    }
  }
);

/**
 * Helpers
 */
function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun ... 6 Sat
  const diff = d.getDate() - day; // week starts Sunday
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