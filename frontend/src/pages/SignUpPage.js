// SignUpPage component handles user registration
import "../css/LoginPage.css";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { API_URL } from "../config";

const SignUpPage = () => {
  // State for username, password, confirm password, and error messages
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Sign Up";
  }, []);

  useEffect(() => {
    document.body.className = "signup";
    return () => {
      document.body.className = "";
    };
  }, []);

  // Handles form submission and signup logic
  const handleSubmit = async (event_object) => {
    event_object.preventDefault();

    // Validate username format (letters, numbers, and underscore only)
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      setError("Username can only contain letters, numbers, and underscores");
      return;
    }

    // Validate password contains only allowed characters
    const passwordRegex = /^[a-zA-Z0-9@#$%^&*()_\-+={}|\\:;"'<>,./?!]+$/;
    if (!passwordRegex.test(password)) {
      setError(
        "Password can only contain: letters, numbers, and these symbols: @ # $ % ^ & * ( ) _ - + = { } | \\ : ; \" ' < > , . / ? !"
      );
      return;
    }

    // Validate password contains at least one letter
    const passwordHasLetter = /[a-zA-Z]/.test(password);
    if (!passwordHasLetter) {
      setError("Password must contain at least one letter");
      return;
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // Send signup request to backend
      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.detail || "Signup failed");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    }
  };

  // Render the signup form
  return (
    <div>
      <Navbar />
      <div className="login-container">
        <form className="login-box" onSubmit={handleSubmit}>
          <h2>Sign Up</h2>

          <label>Username</label>
          <input
            placeholder="Your username (3-20 characters)"
            required
            minLength={3}
            maxLength={20}
            value={username}
            onChange={(event_object) => setUsername(event_object.target.value)}
          ></input>

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password (Min 8 characters, must contain at least 1 letter)"
            required
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event_object) => setPassword(event_object.target.value)}
          ></input>

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="Confirm your password"
            required
            minLength={8}
            maxLength={72}
            value={confirmPassword}
            onChange={(event_object) =>
              setConfirmPassword(event_object.target.value)
            }
          ></input>

          {/* Display error message if signup fails */}
          {error && <div className="error-message">{error}</div>}

          <button type="submit">Sign Up</button>

          <div className="signup-link">
            Already have an account? <Link to="/login">Log In</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUpPage;
