import { auth } from '../firebaseConfig';

export async function authenticatedFetch(url, options = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Not authenticated');
  }

  const token = await user.getIdToken(true);
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  return fetch(url, { ...options, headers });
}

export async function lookupBarcode(barcode) {
  const cleanBarcode = String(barcode || "").trim();
  const response = await authenticatedFetch(
    `https://lookupbarcode-moat6vqvca-uc.a.run.app?barcode=${encodeURIComponent(cleanBarcode)}`
  );

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Barcode lookup failed");
  }

  return data;
}