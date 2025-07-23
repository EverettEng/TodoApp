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

  const status = loggedIn ? "Logout" : "Login";

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    navigate("/login");
  };

  return (
    <div>
      <Link
        className="login-button"
        to={"/login"}
        onClick={loggedIn ? handleLogout : null}
      >
        {status}
      </Link>
    </div>
  );
};

export default Login;
