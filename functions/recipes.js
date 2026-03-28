const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { getAuth } = require("firebase-admin/auth");

const SPOONACULAR_KEY = defineSecret("SPOONACULAR_KEY");
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

exports.getRecipeSuggestions = onRequest(
  { cors: true, secrets: [SPOONACULAR_KEY] },
  async (req, res) => {
    try {
      await verifyAuth(req);
      
      const { ingredients, number = 60 } = req.query;
      
      if (!ingredients) {
        res.status(400).json({ success: false, message: "Missing ingredients" });
        return;
      }

      const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=${number}&ranking=2&ignorePantry=true&apiKey=${SPOONACULAR_KEY.value()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        res.status(response.status).json({ success: false, message: "Spoonacular API error" });
        return;
      }
      
      const data = await response.json();
      res.json({ success: true, recipes: data });
    } catch (err) {
      console.error("getRecipeSuggestions error:", err);
      if (err.message.includes("Unauthorized")) {
        res.status(401).json({ success: false, message: "Unauthorized" });
      } else {
        res.status(500).json({ success: false, message: "Internal error" });
      }
    }
  }
);

exports.getRecipeDetails = onRequest(
  { cors: true, secrets: [SPOONACULAR_KEY] },
  async (req, res) => {
    try {
      await verifyAuth(req);
      
      const { id } = req.query;
      
      if (!id) {
        res.status(400).json({ success: false, message: "Missing recipe id" });
        return;
      }

      const url = `https://api.spoonacular.com/recipes/${id}/information?apiKey=${SPOONACULAR_KEY.value()}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        res.status(response.status).json({ success: false, message: "Spoonacular API error" });
        return;
      }
      
      const data = await response.json();
      res.json({ success: true, recipe: data });
    } catch (err) {
      console.error("getRecipeDetails error:", err);
      if (err.message.includes("Unauthorized")) {
        res.status(401).json({ success: false, message: "Unauthorized" });
      } else {
        res.status(500).json({ success: false, message: "Internal error" });
      }
    }
  }
);
