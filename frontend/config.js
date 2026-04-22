const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
// When you deploy the backend, replace 'https://your-production-backend.com' with the real URL
const API_BASE = isLocalhost ? "http://localhost:8000" : "https://your-production-backend.com";
