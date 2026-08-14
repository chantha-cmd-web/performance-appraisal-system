// Firebase SDK & Analytics configuration (kept as a separate module because
// Vite strips inline <script type="module"> blocks during the build).
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBu_skYpDvwoZgXBumhJM27Q11p5tGX_Cg",
  authDomain: "e-performance-appraisal-live.firebaseapp.com",
  projectId: "e-performance-appraisal-live",
  storageBucket: "e-performance-appraisal-live.firebasestorage.app",
  messagingSenderId: "539920929038",
  appId: "1:539920929038:web:b32f54c70fd0961c43c75f"
};

try {
  const app = initializeApp(firebaseConfig);
  getAnalytics(app);
} catch (e) {
  console.warn("Analytics not available:", e);
}
