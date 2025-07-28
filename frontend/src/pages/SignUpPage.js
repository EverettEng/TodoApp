/**
 * SignUpPage Component
 *
 * Handles user registration with comprehensive form validation and error handling.
 *
 * Features:
 * - Username validation (alphanumeric + underscore only, 3-20 characters)
 * - Password validation (specific character set, minimum 8 chars, must contain letter)
 * - Password confirmation matching
 * - Real-time error display
 * - Automatic redirect to login page on successful registration
 * - Integration with backend authentication API
 *
 * Validation Rules:
 * - Username: Letters, numbers, and underscores only (3-20 characters)
 * - Password: Must contain at least one letter, 8-72 characters
 * - Password characters: Letters, numbers, and specific symbols
 * - Passwords must match
 *
 * @returns {JSX.Element} The SignUpPage component
 */

// Component imports
import "../css/LoginPage.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { API_URL } from "../config";

const SignUpPage = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  /**
   * Username input state
   * @type {string} - User's chosen username (3-20 characters, alphanumeric + underscore)
   */
  const [username, setUsername] = useState("");

  /**
   * Password input state
   * @type {string} - User's chosen password (8-72 characters, must contain letter)
   */
  const [password, setPassword] = useState("");

  /**
   * Password confirmation input state
   * @type {string} - Confirmation of user's password (must match password)
   */
  const [confirmPassword, setConfirmPassword] = useState("");

  /**
   * Error message state for form validation and API errors
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
   * Updates the browser tab title to "Sign Up" when this component loads.
   */
  useEffect(() => {
    document.title = "Sign Up";
  }, []); // Empty dependency array: run once on mount

  /**
   * Effect: Apply page-specific body class for styling
   *
   * Adds "signup" class to document.body for page-specific CSS styling.
   * Cleanup function removes the class when component unmounts to prevent
   * style bleeding to other pages.
   */
  useEffect(() => {
    document.body.className = "signup";
    return () => {
      document.body.className = "";
    };
  }, []); // Empty dependency array: run once on mount

  // ==========================================
  // FORM VALIDATION & SUBMISSION
  // ==========================================

  /**
   * Handles form submission and user registration process
   *
   * Performs comprehensive client-side validation before sending registration
   * request to the backend API. Validates username format, password complexity,
   * and password confirmation matching.
   *
   * Validation Steps:
   * 1. Username format validation (alphanumeric + underscore only)
   * 2. Password character set validation
   * 3. Password must contain at least one letter
   * 4. Password confirmation matching
   * 5. API request with error handling
   * 6. Redirect to login page on success
   *
   * @param {Event} event_object - The form submission event
   */
  const handleSubmit = async (event_object) => {
    event_object.preventDefault();

    // ==========================================
    // CLIENT-SIDE VALIDATION
    // ==========================================

    /**
     * Username Format Validation
     *
     * Ensures username contains only:
     * - Letters (a-z, A-Z)
     * - Numbers (0-9)
     * - Underscores (_)
     *
     * Rejects usernames with spaces, special characters, etc.
     */
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    /**
     * Password Character Set Validation
     *
     * Ensures password contains only allowed characters:
     * - Letters (a-z, A-Z)
     * - Numbers (0-9)
     * - Specific symbols: @ # $ % ^ & * ( ) _ - + = { } | \ : ; " ' < > , . / ? !
     *
     * This prevents potential security issues with unsupported characters.
     */
    const passwordRegex = /^[a-zA-Z0-9@#$%^&*()_\-+={}|\\:;"'<>,./?!]+$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Password can only contain: letters, numbers, and these symbols: @ # $ % ^ & * ( ) _ - + = { } | \\ : ; \" ' < > , . / ? !"
      );
      return;
    }

    /**
     * Password Letter Requirement Validation
     *
     * Ensures password contains at least one alphabetic character.
     * This prevents purely numeric passwords which are less secure.
     */
    const passwordHasLetter = /[a-zA-Z]/.test(password);
    if (!passwordHasLetter) {
      setError("Password must contain at least one letter");
      return;
    }

    /**
     * Password Confirmation Validation
     *
     * Ensures both password fields match exactly to prevent typos
     * that would lock users out of their accounts.
     */
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // ==========================================
    // API REQUEST & RESPONSE HANDLING
    // ==========================================

    try {
      /**
       * Registration API Request
       *
       * Sends POST request to backend with username and password.
       * Uses JSON format and sets appropriate content-type header.
       */
      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      /**
       * Response Handling
       *
       * Checks if registration was successful:
       * - If failed: Display error message from API or generic message
       * - If successful: Redirect to login page for user to sign in
       */
      if (!response.ok) {
        setError(data.detail || "Signup failed");
      } else {
        // Registration successful - redirect to login page
        navigate("/login");
      }
    } catch (err) {
      /**
       * Network/Fetch Error Handling
       *
       * Catches network errors, server unavailability, or other
       * issues that prevent the request from completing.
       */
      console.error(err);
      setError("Something went wrong");
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div>
      <Navbar />
      <div className="login-container">
        <form className="login-box" onSubmit={handleSubmit}>
          <h2>Sign Up</h2>

          {/* ==========================================
              USERNAME INPUT FIELD
              ========================================== */}
          <label>Username</label>
          <input
            placeholder="Your username (3-20 characters)"
            required
            minLength={3} // HTML5 validation: minimum 3 characters
            maxLength={20} // HTML5 validation: maximum 20 characters
            value={username}
            onChange={(event_object) => setUsername(event_object.target.value)}
          ></input>

          {/* ==========================================
              PASSWORD INPUT FIELD
              ========================================== */}
          <label>Password</label>
          <input
            type="password" // Masks password input for security
            placeholder="Enter your password (Min 8 characters, must contain at least 1 letter)"
            required
            minLength={8} // HTML5 validation: minimum 8 characters
            maxLength={72} // HTML5 validation: maximum 72 characters
            value={password}
            onChange={(event_object) => setPassword(event_object.target.value)}
          ></input>

          {/* ==========================================
              PASSWORD CONFIRMATION FIELD
              ========================================== */}
          <label>Confirm Password</label>
          <input
            type="password" // Masks confirmation input for security
            placeholder="Confirm your password"
            required
            minLength={8} // HTML5 validation: minimum 8 characters
            maxLength={72} // HTML5 validation: maximum 72 characters
            value={confirmPassword}
            onChange={(event_object) =>
              setConfirmPassword(event_object.target.value)
            }
          ></input>

          {/* ==========================================
              ERROR MESSAGE DISPLAY
              ========================================== */}
          {/* Conditionally render error message if validation fails or API returns error */}
          {error && <div className="error-message">{error}</div>}

          {/* ==========================================
              FORM SUBMISSION BUTTON
              ========================================== */}
          <button type="submit">Sign Up</button>

          {/* ==========================================
              NAVIGATION LINK TO LOGIN
              ========================================== */}
          <div className="signup-link">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
