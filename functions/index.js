const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

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