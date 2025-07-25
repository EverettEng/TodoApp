import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import "../css/Navbar.css";
import { isLoggedIn, logout } from "../utils/auth";

const Login = () => {
  const navigate = useNavigate();
  const [loggedIn, setLoggedIn] = useState(isLoggedIn());

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setLoggedIn(isLoggedIn());
    };

    window.addEventListener("storage", handleStorageChange);

    // Also check periodically in case localStorage changes in same tab
    const interval = setInterval(() => {
      setLoggedIn(isLoggedIn());
    }, 1000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = (e) => {
    e.preventDefault(); // Prevent Link navigation
    logout();
    setLoggedIn(false);
    navigate("/login");
  };

  const handleLoginClick = (e) => {
    // Let the Link handle navigation for login
    if (loggedIn) {
      handleLogout(e);
    }
  };

  return (
    <div>
      <Link
        className="login-button"
        to={loggedIn ? "#" : "/login"} // Don't navigate when logged in
        onClick={handleLoginClick}
      >
        {loggedIn ? "Logout" : "Login"}
      </Link>
    </div>
  );
};

export default Login;
