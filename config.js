// API Configuration
// For local development: http://localhost:5000
// For production: Your deployed backend URL
const API_BASE_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:5000' 
  : 'https://vercel-ai-sql-backend-ocnx.vercel.app';

// Export for use in other scripts
window.API_BASE_URL = API_BASE_URL;
