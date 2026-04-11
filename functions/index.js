const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const nodemailer = require("nodemailer");
const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');

const EMAIL_USER = defineSecret("EMAIL_USER");
const EMAIL_PASS = defineSecret("EMAIL_PASS");

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });
const db = getFirestore();
const adminAuth = getAuth();

async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing token");
  }
  const token = authHeader.split("Bearer ")[1];
  const decodedToken = await adminAuth.verifyIdToken(token);
  return decodedToken.uid;
}

exports.addProduct = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { userId, name, expiryDate, expiryTimestampUtc, status, quantity, unit } = req.body || {};

    if (authenticatedUid !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!userId || !name || !expiryDate) {
      res.status(400).json({ success: false, message: "Missing required fields" });
      return;
    }

    const parsedQty = Number(quantity);
    const safeQuantity = Number.isFinite(parsedQty) && parsedQty >= 0 ? parsedQty : 1;
    const safeUnit = (unit || "item").toString().trim().slice(0, 20) || "item";
    const now = new Date().toISOString();

    const docRef = await db.collection("products").add({
      userId,
      name: name.toString().trim(),
      expiryDate,
      expiryTimestampUtc: expiryTimestampUtc || new Date(expiryDate).toISOString(),
      status: status || "active",
      quantity: safeQuantity,
      unit: safeUnit,
      createdAt: now,
      updatedAt: now,
      usedAt: null,
      wastedAt: null,
      deletedAt: null
    });

    res.json({ success: true, id: docRef.id });
  } catch (err) {
    console.error("addProduct error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.getProducts = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { userId } = req.query;

    if (authenticatedUid !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!userId) {
      res.status(400).json({ success: false, message: "Missing userId" });
      return;
    }

    const snapshot = await db.collection("products")
      .where("userId", "==", userId)
      .where("status", "==", "active")
      .get();

    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ success: true, products });
  } catch (err) {
    console.error("getProducts error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.deleteProduct = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { productId } = req.body || {};

    if (!productId) {
      res.status(400).json({ success: false, message: "Missing productId" });
      return;
    }

    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists || productDoc.data().userId !== authenticatedUid) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const now = new Date().toISOString();
    await db.collection("products").doc(productId).update({
      status: "deleted",
      deletedAt: now,
      updatedAt: now
    });

    res.json({ success: true });
  } catch (err) {
    console.error("deleteProduct error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.updateProduct = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { productId, name, expiryDate, quantity, unit } = req.body || {};

    if (!productId) {
      res.status(400).json({ success: false, message: "Missing productId" });
      return;
    }

    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists || productDoc.data().userId !== authenticatedUid) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const updates = { updatedAt: new Date().toISOString() };

    if (name !== undefined) {
      const trimmed = name.toString().trim();
      if (!trimmed) { res.status(400).json({ success: false, message: "Name cannot be empty" }); return; }
      updates.name = trimmed;
    }

    if (expiryDate !== undefined) {
      updates.expiryDate = expiryDate;
      updates.expiryTimestampUtc = new Date(expiryDate).toISOString();
    }

    if (quantity !== undefined) {
      const parsedQty = Number(quantity);
      if (!Number.isFinite(parsedQty) || parsedQty < 0) {
        res.status(400).json({ success: false, message: "Quantity must be a number >= 0" });
        return;
      }
      updates.quantity = parsedQty;
    }

    if (unit !== undefined) {
      const safeUnit = unit.toString().trim().slice(0, 20);
      if (!safeUnit) { res.status(400).json({ success: false, message: "Unit cannot be empty" }); return; }
      updates.unit = safeUnit;
    }

    await db.collection("products").doc(productId).update(updates);
    res.json({ success: true });
  } catch (err) {
    console.error("updateProduct error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.updateProductStatus = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { productId, status } = req.body || {};

    if (!productId || !["used", "wasted"].includes(status)) {
      res.status(400).json({ success: false, message: "Invalid payload" });
      return;
    }

    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists || productDoc.data().userId !== authenticatedUid) {
      res.status(403).json({ success: false, message: "Forbidden" });
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
    res.json({ success: true });
  } catch (err) {
    console.error("updateProductStatus error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.undoProductStatus = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { productId } = req.body || {};

    if (!productId) {
      res.status(400).json({ success: false, message: "Missing productId" });
      return;
    }

    const productDoc = await db.collection("products").doc(productId).get();
    if (!productDoc.exists || productDoc.data().userId !== authenticatedUid) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const now = new Date().toISOString();
    await db.collection("products").doc(productId).update({
      status: "active",
      usedAt: null,
      wastedAt: null,
      updatedAt: now
    });

    res.json({ success: true });
  } catch (err) {
    console.error("undoProductStatus error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.getHistory = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { userId, limit = 50 } = req.query;

    if (authenticatedUid !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!userId) {
      res.status(400).json({ success: false, message: "Missing userId" });
      return;
    }

    const snapshot = await db.collection("products")
      .where("userId", "==", userId)
      .where("status", "in", ["used", "wasted", "deleted"])
      .get();

    const items = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, Number(limit));

    res.json({ success: true, items });
  } catch (err) {
    console.error("getHistory error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.getWeeklyAnalytics = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { userId, weeks = 4 } = req.query;
    const weekCount = Number(weeks);

    if (authenticatedUid !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!userId || ![4, 8, 12].includes(weekCount)) {
      res.status(400).json({ success: false, message: "Invalid userId/weeks" });
      return;
    }

    const snapshot = await db.collection("products")
      .where("userId", "==", userId)
      .where("status", "in", ["used", "wasted"])
      .get();

    const now = new Date();
    const buckets = [];
    for (let i = weekCount - 1; i >= 0; i--) {
      const anchor = new Date(now);
      anchor.setDate(anchor.getDate() - i * 7);
      const start = startOfWeek(anchor);
      const end = endOfWeek(anchor);
      buckets.push({ label: weekLabel(start), start, end, used: 0, wasted: 0 });
    }

    snapshot.docs.forEach(doc => {
      const item = doc.data();
      if (item.status === "used" && item.usedAt) {
        const usedDate = new Date(item.usedAt);
        const bucket = buckets.find(b => usedDate >= b.start && usedDate < b.end);
        if (bucket) bucket.used += 1;
      }
      if (item.status === "wasted" && item.wastedAt) {
        const wastedDate = new Date(item.wastedAt);
        const bucket = buckets.find(b => wastedDate >= b.start && wastedDate < b.end);
        if (bucket) bucket.wasted += 1;
      }
    });

    const totalUsed = buckets.reduce((sum, b) => sum + b.used, 0);
    const totalWasted = buckets.reduce((sum, b) => sum + b.wasted, 0);
    const denom = totalUsed + totalWasted;

    res.json({
      success: true,
      labels: buckets.map(b => b.label),
      used: buckets.map(b => b.used),
      wasted: buckets.map(b => b.wasted),
      wasteRate: denom === 0 ? 0 : totalWasted / denom
    });
  } catch (err) {
    console.error("getWeeklyAnalytics error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.dailyExpiryCheck = onSchedule(
  { schedule: "every 24 hours", secrets: [EMAIL_USER, EMAIL_PASS] },
  async () => {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: EMAIL_USER.value(), pass: EMAIL_PASS.value() }
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const threeDaysFromNow = new Date(today);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const snapshot = await db.collection("products").where("status", "==", "active").get();

      const expiringProducts = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => {
          if (!p.expiryDate) return false;
          const expiry = new Date(p.expiryDate);
          expiry.setHours(0, 0, 0, 0);
          return expiry >= today && expiry <= threeDaysFromNow;
        });

      const byUser = {};
      for (const p of expiringProducts) {
        if (!byUser[p.userId]) byUser[p.userId] = [];
        byUser[p.userId].push(p);
      }

      for (const userId of Object.keys(byUser)) {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) continue;
        const userEmail = userDoc.data().email;
        if (!userEmail) continue;

        const items = byUser[userId].map(p => `${p.name} (expires ${p.expiryDate})`).join("\n");

        await transporter.sendMail({
          from: EMAIL_USER.value(),
          to: userEmail,
          subject: "PantryPlan - Items Expiring Soon!",
          text: `Hi,\n\nThe following items in your pantry are expiring soon:\n\n${items}\n\nLog in to PantryPlan to use them before they expire!\n\nPantryPlan`
        });

        console.log("Expiry email sent to:", userEmail);
      }

      console.log("dailyExpiryCheck complete");
    } catch (err) {
      console.error("dailyExpiryCheck error:", err);
    }
  }
);

exports.getInsightsSummary = onRequest({ cors: true }, async (req, res) => {
  try {
    const authenticatedUid = await verifyAuth(req);
    const { userId } = req.query;

    if (authenticatedUid !== userId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (!userId) {
      res.status(400).json({ success: false, message: "Missing userId" });
      return;
    }

    const snapshot = await db.collection("products").where("userId", "==", userId).get();
    const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const wastedIn30Days = allItems.filter(i => i.status === "wasted" && i.wastedAt && new Date(i.wastedAt) >= thirtyDaysAgo && new Date(i.wastedAt) <= now);
    const wasteCountByName = {};
    wastedIn30Days.forEach(i => {
      const key = (i.name || "Unknown").trim().toLowerCase();
      if (!wasteCountByName[key]) wasteCountByName[key] = { name: i.name || "Unknown", count: 0 };
      wasteCountByName[key].count += 1;
    });
    const topWasted = Object.values(wasteCountByName).sort((a, b) => b.count - a.count).slice(0, 5);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const activeItems = allItems.filter(i => i.status === "active");

    const expiringList = activeItems
      .map(i => {
        if (!i.expiryDate) return null;
        const expiry = new Date(i.expiryDate);
        expiry.setHours(0, 0, 0, 0);
        const daysLeft = Math.ceil((expiry - startOfToday) / (1000 * 60 * 60 * 24));
        return { id: i.id, name: i.name, expiryDate: i.expiryDate, daysLeft };
      })
      .filter(i => i && i.daysLeft >= 0 && i.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const in1Day = expiringList.filter(i => i.daysLeft <= 1).length;
    const in3Days = expiringList.filter(i => i.daysLeft <= 3).length;
    const in7Days = expiringList.filter(i => i.daysLeft <= 7).length;

    res.json({ success: true, topWasted, expiringSoon: { in1Day, in3Days, in7Days, items: expiringList.slice(0, 6) } });
  } catch (err) {
    console.error("getInsightsSummary error:", err);
    if (err.message.includes("Unauthorized")) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    } else {
      res.status(500).json({ success: false, message: "Internal error" });
    }
  }
});

exports.scanExpiry = onRequest({ cors: true }, async (req, res) => {
  try {
    const { imageBase64 } = req.body
    if (!imageBase64) return res.status(400).json({ error: 'No image' })

    const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' })
    const token = await auth.getAccessToken()

    const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image: { content: imageBase64 }, features: [{ type: 'TEXT_DETECTION' }] }]
      })
    })

    const data = await response.json()
    const text = data.responses?.[0]?.fullTextAnnotation?.text || ''

    const patterns = [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/,
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/,
      /(\d{1,2})[\/\-\.](\d{4})/,
      /(\d{1,2})[\/\-\.](\d{2})/,
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern)
      if (!match) continue
      if (match.length === 4) {
        let [, day, month, year] = match
        if (year.length === 2) year = '20' + year
        return res.json({ date: `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` })
      } else {
        let [, month, year] = match
        if (year.length === 2) year = '20' + year
        return res.json({ date: `${year}-${month.padStart(2, '0')}-01` })
      }
    }

    res.json({ date: null, rawText: text })
  } catch (err) {
    console.error('scanExpiry error:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

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

const recipes = require('./recipes');
exports.getRecipeSuggestions = recipes.getRecipeSuggestions;
exports.getRecipeDetails = recipes.getRecipeDetails;
