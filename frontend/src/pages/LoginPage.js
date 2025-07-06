// LoginPage component handles user login
import { Link, useNavigate } from "react-router-dom";
import "../css/LoginPage.css";
import { useState } from "react";

const LoginPage = () => {
  // State for username, password, and error messages
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Handles form submission and login logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Send login request to backend
      const response = await fetch("http://localhost:8000/login", {
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

      navigate("/home");
    } catch (err) {
      console.error(err);
      setError("Something went wrong");
    }
  };

  // Render the login form
  return (
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
  );
};

export default LoginPage;
