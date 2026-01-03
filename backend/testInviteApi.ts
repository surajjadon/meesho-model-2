// testInviteApi.ts
// Run this with: npx ts-node testInviteApi.ts

// NOTE: We use standard 'fetch' (available in Node 18+). 
// If you are on an older Node version, install 'node-fetch' or 'axios'.

const PORT = 24554; // Ensure this matches your server.ts PORT
const API_URL = `http://localhost:${PORT}/api/team/invite`;

const mockFrontendData = {
  name: "Backend Test User",
  email: "amit8989673830@gmail.com", 
  phone: "9876543210",
  role: "Manager",
  modules: {
    cropper: true,
    inventory: true,
    payments: false,
    returns: true,
    admin: false
  },
  gstAccess: {
    allFuture: true,
    selectedIds: []
  }
};

const runTest = async () => {
  console.log("🚀 Sending POST request to:", API_URL);
  console.log("📦 Payload:", mockFrontendData);

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer PASTE_YOUR_REAL_TOKEN_HERE' // <--- Add this line
      },
      body: JSON.stringify(mockFrontendData)
    });

    const data = await response.json();

    console.log("------------------------------------------------");
    console.log(`STATUS: ${response.status}`);
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
    console.log("------------------------------------------------");

    if (response.status === 201 || response.status === 200) {
      console.log("✅ SUCCESS! Check your inbox for the invite email.");
    } else {
      console.log("❌ FAILED. Check the error message above.");
    }

  } catch (error) {
    console.error("❌ Network Error. Is the server running?");
    console.error(error);
  }
};

// Load env vars just to get the email for the test payload
import dotenv from 'dotenv';
dotenv.config();

runTest();