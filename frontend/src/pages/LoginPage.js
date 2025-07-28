/**
 * LoginPage Component
 *
 * Handles user authentication with form validation, error handling, and session management.
 *
 * Features:
 * - User login form with username/password fields
 * - Authentication state checking (redirects if already logged in)
 * - JWT token handling and localStorage session management
 * - Comprehensive error handling for network and authentication failures
 * - Automatic redirect to todos page after successful login
 * - Integration with backend authentication API
 *
 * Authentication Flow:
 * 1. Check if user is already authenticated (show different UI if logged in)
 * 2. Validate form input and send login request
 * 3. Store authentication data (token, username, userID) in localStorage
 * 4. Redirect to todos page on successful authentication
 *
 * @returns {JSX.Element} The LoginPage component
 */

// Component imports
import { Link, useNavigate } from "react-router-dom";
import "../css/LoginPage.css";
import { useState, useEffect } from "react";
import { isLoggedIn as checkAuth } from "../utils/auth"; // renamed import to avoid conflict
import Navbar from "../components/Navbar";
import { API_URL } from "../config";

const LoginPage = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  /**
   * Username input state
   * @type {string} - User's entered username for authentication
   */
  const [username, setUsername] = useState("");

  /**
   * Password input state
   * @type {string} - User's entered password for authentication
   */
  const [password, setPassword] = useState("");

  /**
   * Error message state for authentication and network errors
   * @type {string} - Current error message to display to user
   */
  const [error, setError] = useState("");

  /**
   * React Router navigation function for programmatic routing
   */
  const navigate = useNavigate();

  // ==========================================
  // SIDE EFFECTS & LIFECYCLE
  // ==========================================

  /**
   * Effect: Set page title on component mount
   *
   * Updates the browser tab title to "Login" when this component loads.
   */
  useEffect(() => {
    document.title = "Login";
  }, []); // Empty dependency array: run once on mount

  /**
   * Effect: Apply page-specific body class for styling
   *
   * Adds "login" class to document.body for page-specific CSS styling.
   * Cleanup function removes the class when component unmounts to prevent
   * style bleeding to other pages.
   */
  useEffect(() => {
    document.body.className = "login";
    return () => {
      document.body.className = "";
    };
  }, []); // Empty dependency array: run once on mount

  // ==========================================
  // AUTHENTICATION & FORM HANDLING
  // ==========================================

  /**
   * Handles form submission and user authentication process
   *
   * Performs the complete login flow including form validation, API request,
   * session data storage, and navigation. Manages both successful logins
   * and various error scenarios.
   *
   * Authentication Steps:
   * 1. Prevent default form submission behavior
   * 2. Clear any existing error messages
   * 3. Send POST request to login API endpoint
   * 4. Handle response (success or failure)
   * 5. Store authentication data in localStorage
   * 6. Redirect to todos page on success
   *
   * @param {Event} e - The form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear any previous error messages

    try {
      /**
       * Authentication API Request
       *
       * Sends POST request to backend login endpoint with user credentials.
       * Logs the request URL for debugging purposes.
       */
      console.log("Login fetch URL:", `${API_URL}/api/login`);
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      /**
       * Authentication Response Validation
       *
       * Checks if login request was successful. If not, extracts error
       * message from API response or uses generic failure message.
       */
      if (!response.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      // ==========================================
      // SESSION DATA STORAGE
      // ==========================================

      /**
       * Store Authentication State in localStorage
       *
       * Persists user session data across browser sessions:
       * - loggedIn: Boolean flag indicating authentication status
       * - username: User's username for display purposes
       * - userID: Unique user identifier for API requests
       * - token: JWT access token for authenticated requests (if provided)
       *
       * Note: localStorage persists data until explicitly cleared,
       * enabling user sessions to survive browser restarts.
       */
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("username", data.username);
      localStorage.setItem("userID", data.userID);

      /**
       * Conditional Token Storage
       *
       * Only stores JWT token if it exists in the API response.
       * This defensive programming prevents storing 'undefined' values.
       */
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      // Redirect to todos page after successful authentication
      navigate("/todos");
    } catch (err) {
      /**
       * Error Handling for Network and Unexpected Errors
       *
       * Catches and handles:
       * - Network connectivity issues
       * - Server unavailability
       * - JSON parsing errors
       * - Other unexpected failures
       *
       * Logs error details for debugging while showing user-friendly message.
       */
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

  // ==========================================
  // CONDITIONAL RENDERING - ALREADY LOGGED IN
  // ==========================================

  /**
   * Early Return: Already Authenticated User UI
   *
   * If user is already logged in (checked via auth utility function),
   * render a different interface informing them of their login status
   * and providing navigation options instead of the login form.
   *
   * This prevents users from unnecessarily re-authenticating and
   * provides clear guidance on next steps.
   */
  if (checkAuth()) {
    return (
      <div>
        <Navbar />
        <div className="login-container">
          <div className="login-box">
            <h3>
              You are already logged in. If you wish to sign into another
              account, please log out first.
            </h3>
            <p>
              Go to{" "}
              <Link className="link-to-todos" to="/todos">
                todos
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER - LOGIN FORM
  // ==========================================

  return (
    <div>
      <Navbar />
      <div className="login-container">
        <form className="login-box" onSubmit={handleSubmit}>
          <h2>Log In</h2>

          {/* ==========================================
              USERNAME INPUT FIELD
              ========================================== */}
          <label>Username</label>
          <input
            placeholder="Enter your username"
            required // HTML5 validation: field is mandatory
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          ></input>

          {/* ==========================================
              PASSWORD INPUT FIELD
              ========================================== */}
          <label>Password</label>
          <input
            type="password" // Masks password input for security
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required // HTML5 validation: field is mandatory
          ></input>

          {/* ==========================================
              ERROR MESSAGE DISPLAY
              ========================================== */}
          {/* Conditionally render error message if authentication fails or network error occurs */}
          {error && <div className="error-message">{error}</div>}

          {/* ==========================================
              FORM SUBMISSION BUTTON
              ========================================== */}
          <button type="submit">Log In</button>

          {/* ==========================================
              NAVIGATION LINK TO SIGNUP
              ========================================== */}
          <div className="signup-link">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
