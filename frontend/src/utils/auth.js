/**
 * Authentication Utilities Module
 *
 * Comprehensive authentication management system for JWT-based user sessions.
 * Handles token storage, validation, expiration checking, and session cleanup.
 *
 * This module provides a complete authentication layer that:
 * - Manages JWT tokens in localStorage
 * - Validates token expiration using jwt-decode
 * - Verifies token validity with backend API calls
 * - Handles secure logout and session cleanup
 * - Provides utilities for checking authentication state
 *
 * Security Features:
 * - Client-side token expiration checking
 * - Backend token validation for enhanced security
 * - Automatic cleanup of invalid/expired tokens
 * - Complete session data clearing on logout
 *
 * Dependencies:
 * - jwt-decode: For parsing and validating JWT tokens
 * - API_URL: Backend API base URL from config
 *
 * @module AuthUtils
 */

import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";

// ==========================================
// TOKEN RETRIEVAL
// ==========================================

/**
 * Retrieves the JWT token from localStorage
 *
 * This is the primary method for accessing the user's authentication token
 * throughout the application. The token is stored in localStorage to persist
 * across browser sessions.
 *
 * @returns {string|null} The JWT token if it exists, null otherwise
 *
 * @example
 * const token = getToken();
 * if (token) {
 *   // Use token for authenticated requests
 *   fetch('/api/protected', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   });
 * }
 */
export function getToken() {
  return localStorage.getItem("token");
}

// ==========================================
// TOKEN EXPIRATION VALIDATION
// ==========================================

/**
 * Checks if a JWT token has expired
 *
 * Uses the jwt-decode library to parse the token and extract the expiration
 * timestamp (exp claim). Compares against current time to determine if the
 * token is still valid.
 *
 * Security Note: This is client-side validation only. The backend should
 * always validate tokens independently as client-side checks can be bypassed.
 *
 * @param {string} token - The JWT token to check for expiration
 * @returns {boolean} true if token is expired or invalid, false if still valid
 *
 * @example
 * const token = getToken();
 * if (token && !isTokenExpired(token)) {
 *   // Token is valid and not expired
 *   makeAuthenticatedRequest();
 * }
 */
export function isTokenExpired(token) {
  try {
    // Decode the JWT to extract payload claims
    const decoded = jwtDecode(token);

    // Get current timestamp in seconds (JWT exp is in seconds, not milliseconds)
    const now = Date.now() / 1000;

    // Compare expiration time with current time
    return decoded.exp < now;
  } catch {
    // If decoding fails (malformed token, missing exp claim, etc.), treat as expired
    return true;
  }
}

// ==========================================
// AUTHENTICATION STATE CHECKING
// ==========================================

/**
 * Checks if user is currently logged in with a valid, non-expired token
 *
 * This is the primary method for determining authentication state throughout
 * the application. It performs both existence and expiration checks.
 *
 * Note: This only performs client-side validation. For enhanced security,
 * use isValidToken() which also verifies with the backend.
 *
 * @returns {boolean} true if user has valid, non-expired token, false otherwise
 *
 * @example
 * // Protect routes based on authentication state
 * if (!isLoggedIn()) {
 *   navigate('/login');
 *   return;
 * }
 *
 * // Show different UI based on auth state
 * return isLoggedIn() ? <Dashboard /> : <LoginPrompt />;
 */
export function isLoggedIn() {
  const token = getToken();
  return token && !isTokenExpired(token);
}

// ==========================================
// BACKEND TOKEN VALIDATION
// ==========================================

/**
 * NEW: Verifies token validity with backend API
 *
 * Performs comprehensive token validation by:
 * 1. Checking local token existence and expiration (client-side)
 * 2. Making authenticated API request to verify token with backend
 * 3. Automatically cleaning up invalid tokens
 *
 * This provides enhanced security by ensuring tokens are not only
 * structurally valid and non-expired, but also recognized by the backend
 * and associated with an existing user account.
 *
 * Use Cases:
 * - Critical authentication checks before sensitive operations
 * - Periodic validation of long-lived sessions
 * - Verification after token refresh or update
 *
 * @returns {Promise<boolean>} Promise resolving to true if token is valid, false otherwise
 *
 * @example
 * // Enhanced authentication check
 * const isValid = await isValidToken();
 * if (!isValid) {
 *   // Token is invalid - redirect to login
 *   navigate('/login');
 *   return;
 * }
 *
 * // Periodic validation
 * useEffect(() => {
 *   const validateSession = async () => {
 *     if (!(await isValidToken())) {
 *       handleLogout();
 *     }
 *   };
 *   validateSession();
 * }, []);
 */
export async function isValidToken() {
  const token = getToken();

  // ==========================================
  // CLIENT-SIDE PRE-VALIDATION
  // ==========================================

  /**
   * First-level validation: Check token existence and expiration
   *
   * Performs quick client-side checks before making network request.
   * If token doesn't exist or is expired, no need to validate with backend.
   */
  if (!token || isTokenExpired(token)) {
    return false;
  }

  try {
    // ==========================================
    // BACKEND VALIDATION REQUEST
    // ==========================================

    /**
     * Backend Token Verification
     *
     * Makes authenticated request to todos endpoint to verify:
     * - Token is recognized by backend
     * - Token signature is valid
     * - Associated user account still exists
     * - User has necessary permissions
     *
     * Uses todos endpoint as it's a standard authenticated route
     * that most users will have access to.
     */
    const response = await fetch(`${API_URL}/api/todos`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      // Token is valid and user exists with proper permissions
      return true;
    } else {
      // ==========================================
      // INVALID TOKEN CLEANUP
      // ==========================================

      /**
       * Token Validation Failed
       *
       * Possible reasons for failure:
       * - Token signature invalid
       * - User account deleted/disabled
       * - Token revoked by backend
       * - Insufficient permissions
       *
       * Response: Clear all authentication data to prevent
       * repeated failed requests and force re-authentication.
       */
      console.log("Token validation failed:", response.status);
      clearAllAuthData(); // Clear invalid token data
      return false;
    }
  } catch (error) {
    // ==========================================
    // NETWORK ERROR HANDLING
    // ==========================================

    /**
     * Network/Request Error Handling
     *
     * Handles scenarios like:
     * - Network connectivity issues
     * - Server unavailability
     * - Request timeout
     * - CORS issues
     *
     * Conservative approach: Clear auth data and treat as invalid
     * to prevent potential security issues with stale tokens.
     */
    console.error("Error verifying token:", error);
    clearAllAuthData(); // Clear potentially invalid token data
    return false;
  }
}

// ==========================================
// SESSION CLEANUP - STANDARD LOGOUT
// ==========================================

/**
 * Performs standard user logout with selective data cleanup
 *
 * Removes authentication-related data while preserving non-sensitive
 * application data that might be useful across sessions. This is the
 * standard logout function for normal user-initiated logouts.
 *
 * Data Removed:
 * - JWT authentication token
 * - Username (for display purposes)
 * - User ID (for API requests)
 * - Todo statistics (user-specific data)
 * - Sets loggedIn flag to false
 *
 * Data Preserved:
 * - Application settings/preferences (if any)
 * - Non-sensitive cached data
 * - Theme preferences, etc.
 *
 * @example
 * // Standard logout button handler
 * const handleLogout = () => {
 *   logout();
 *   navigate('/login');
 *   showSuccessMessage('Logged out successfully');
 * };
 *
 * // Automatic logout on token expiry
 * if (!isLoggedIn()) {
 *   logout();
 *   redirectToLogin();
 * }
 */
export function logout() {
  // ==========================================
  // AUTHENTICATION DATA REMOVAL
  // ==========================================

  /**
   * Remove Core Authentication Data
   *
   * Clears all data necessary for authentication and user identification.
   * Each item is removed individually for precision and clarity.
   */
  localStorage.removeItem("token"); // JWT authentication token
  localStorage.removeItem("username"); // User's display name
  localStorage.removeItem("userID"); // Unique user identifier

  // ==========================================
  // USER-SPECIFIC DATA CLEANUP
  // ==========================================

  /**
   * Remove User-Specific Application Data
   *
   * Clears todo statistics that are specific to the logged-in user.
   * This prevents data from one user session appearing in another.
   */
  localStorage.removeItem("numIncompleteTodos"); // Incomplete todo count
  localStorage.removeItem("numCompletedTodos"); // Completed todo count
  localStorage.removeItem("numOverdueTodos"); // Overdue todo count

  // ==========================================
  // AUTHENTICATION FLAG UPDATE
  // ==========================================

  /**
   * Update Login Status Flag
   *
   * Explicitly sets loggedIn flag to false rather than removing it.
   * This provides a clear boolean state for authentication checking.
   */
  localStorage.setItem("loggedIn", "false");
}

// ==========================================
// SESSION CLEANUP - COMPLETE CLEAR
// ==========================================

/**
 * Performs aggressive cleanup of all stored data
 *
 * More comprehensive cleanup function that removes ALL stored data
 * from both localStorage and sessionStorage. Used in scenarios where
 * complete data removal is necessary for security or privacy reasons.
 *
 * Use Cases:
 * - Account deletion
 * - Security breaches requiring complete cleanup
 * - Invalid token detection requiring fresh start
 * - User privacy requests
 * - Application reset functionality
 *
 * Warning: This removes ALL application data, not just authentication data.
 * Use logout() for standard logout scenarios.
 *
 * @example
 * // Account deletion cleanup
 * const deleteAccount = async () => {
 *   await api.deleteUserAccount();
 *   clearAllAuthData();
 *   navigate('/goodbye');
 * };
 *
 * // Security cleanup after breach detection
 * if (securityBreachDetected) {
 *   clearAllAuthData();
 *   forceReauthentication();
 * }
 */
export function clearAllAuthData() {
  // ==========================================
  // COMPLETE STORAGE CLEANUP
  // ==========================================

  /**
   * Nuclear Option: Clear All Storage
   *
   * Removes absolutely everything from both storage mechanisms:
   * - localStorage: Persistent data across browser sessions
   * - sessionStorage: Data for current browser session only
   *
   * This ensures no trace of user data remains in browser storage.
   */
  localStorage.clear(); // Remove all localStorage data
  sessionStorage.clear(); // Remove all sessionStorage data
}
