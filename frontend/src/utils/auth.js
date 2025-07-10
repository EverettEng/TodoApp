// src/utils/auth.js
import { jwtDecode } from "jwt-decode";

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
