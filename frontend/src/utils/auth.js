import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";

export function getToken() {
  return localStorage.getItem("token");
}

export function isTokenExpired(token) {
  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;
    return decoded.exp < now;
  } catch {
    return true;
  }
}

export function isLoggedIn() {
  const token = getToken();
  return token && !isTokenExpired(token);
}

// NEW: Function to verify token with backend
export async function isValidToken() {
  const token = getToken();

  // First check if token exists and isn't expired
  if (!token || isTokenExpired(token)) {
    return false;
  }

  try {
    // Make a simple API call to verify the token is still valid
    const response = await fetch(`${API_URL}/todos`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return true; // Token is valid and user exists
    } else {
      // Token is invalid or user doesn't exist
      console.log("Token validation failed:", response.status);
      clearAllAuthData(); // Clear invalid token data
      return false;
    }
  } catch (error) {
    console.error("Error verifying token:", error);
    clearAllAuthData(); // Clear potentially invalid token data
    return false;
  }
}

export function logout() {
  // Clear all user-related data
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("userID");
  localStorage.removeItem("numIncompleteTodos");
  localStorage.removeItem("numCompletedTodos");
  localStorage.removeItem("numOverdueTodos");
  localStorage.setItem("loggedIn", "false");

  // Force redirect to home page
  window.location.href = "/";
}

export function clearAllAuthData() {
  // More aggressive clearing for account deletion
  localStorage.clear();
  sessionStorage.clear();
}
