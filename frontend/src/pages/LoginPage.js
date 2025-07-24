// LoginPage component handles user login
import { Link, useNavigate } from "react-router-dom";
import "../css/LoginPage.css";
import { useState, useEffect } from "react";
import { isLoggedIn as checkAuth } from "../utils/auth"; // renamed import to avoid conflict
import Navbar from "../components/Navbar";
import { API_URL } from "../config";

const LoginPage = () => {
  // State for username, password, and error messages
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Login";
  }, []);

  useEffect(() => {
    document.body.className = "login";
    return () => {
      document.body.className = "";
    };
  }, []);

  // Handles form submission and login logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Send login request to backend
      console.log("Login fetch URL:", `${API_URL}/login`);
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      // Store login state and redirect
      localStorage.setItem("loggedIn", "true");
      localStorage.setItem("username", data.username);
      localStorage.setItem("userID", data.userID);
      

      // Only store token if it exists in response
      if (data.access_token) {
        localStorage.setItem("token", data.access_token);
      }

      navigate("/todos");
    } catch (err) {
      console.error("Login error:", err);
      setError("Something went wrong. Please try again.");
    }
  };

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

  // Render the login form
  return (
    <div>
      <Navbar />
      <div className="login-container">
        <form className="login-box" onSubmit={handleSubmit}>
          <h2>Log In</h2>

          <label>Username</label>
          <input
            placeholder="Enter your username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          ></input>

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          ></input>

          {/* Display error message if login fails */}
          {error && <div className="error-message">{error}</div>}

          <button type="submit">Log In</button>

          <div className="signup-link">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
