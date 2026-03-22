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

exports.addProduct = onRequest(
  { cors: true },
  async (request, response) => {
    const { userId, name, expiryDate, expiryTimestampUtc, status } = request.body;

    const res = await db.collection('products').add({
      userId,
      name,
      expiryDate,
      expiryTimestampUtc,
      status: status || 'active',
      createdAt: new Date().toISOString()
    });

    if (res.id) {
      response.json({ success: true, id: res.id });
    } else {
      response.status(500).json({ success: false });
    }
  }
);

exports.getProducts = onRequest(
  { cors: true },
  async (request, response) => {
    const { userId } = request.query;

    const snapshot = await db.collection('products')
      .where('userId', '==', userId)
      .get();

    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    response.json({ success: true, products });
  }
);

exports.deleteProduct = onRequest(
  { cors: true },
  async (request, response) => {
    const { productId } = request.body;

    await db.collection('products').doc(productId).delete();

    response.json({ success: true });
  }
);

exports.updateProduct = onRequest(
  { cors: true },
  async (request, response) => {
    const { productId, ...updates } = request.body;

    await db.collection('products').doc(productId).update(updates);

    response.json({ success: true });
  }
);

exports.dailyExpiryCheck = onSchedule(
  { schedule: "every 24 hours", secrets: ["EMAIL_USER", "EMAIL_PASS"] },
  async (event) => {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EMAIL_USER.value(),
        pass: EMAIL_PASS.value()
      }
    });

    const today = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(today.getDate() + 3);

    console.log('Today:', today.toISOString());
    console.log('Three days from now:', threeDaysFromNow.toISOString());

    const snapshot = await db.collection('products')
      .where('status', '==', 'active')
      .get();

    console.log('Total active products found:', snapshot.docs.length);

    const expiringProducts = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(product => {
        const expiry = new Date(product.expiryDate);
        console.log('Product:', product.name, 'Expiry:', expiry.toISOString());
        return expiry <= threeDaysFromNow && expiry >= today;
      });

    console.log('Expiring products:', expiringProducts.length);

    const byUser = {};
    expiringProducts.forEach(product => {
      if (!byUser[product.userId]) byUser[product.userId] = [];
      byUser[product.userId].push(product);
    });

    console.log('Users to notify:', Object.keys(byUser).length);

    for (const userId in byUser) {
      const userDoc = await db.collection('users').doc(userId).get();
      console.log('User doc exists:', userDoc.exists);
      if (!userDoc.exists) continue;

      const userEmail = userDoc.data().email;
      console.log('Sending email to:', userEmail);
      const items = byUser[userId].map(p => `${p.name} (expires ${p.expiryDate})`).join('\n');

      await transporter.sendMail({
        from: EMAIL_USER.value(),
        to: userEmail,
        subject: 'PantryPlan - Items Expiring Soon!',
        text: `Hi,\n\nThe following items in your pantry are expiring soon:\n\n${items}\n\nLog in to PantryPlan to use them before they expire!\n\nPantryPlan`
      });

      console.log('Email sent to:', userEmail);
    }

    console.log('Expiry check complete');
  }
);