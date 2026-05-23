/**
 * API Configuration
 * 
 * This file determines the correct backend URL based on the environment.
 * 
 * Why this is needed:
 * - In development: Vite dev server can proxy API calls to localhost:3001
 * - In production: Frontend is deployed separately, so we need the full URL
 * 
 * Environment detection:
 * - import.meta.env.DEV = true in development (Vite dev server)
 * - import.meta.env.DEV = false in production (built app)
 */

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001" // Local development
  : "https://browserforge.onrender.com"; // Production backend

export { API_BASE };
