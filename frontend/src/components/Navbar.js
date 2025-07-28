import { Link, useNavigation } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./Login";
import "../css/Navbar.css";

const Navbar = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkClick = () => {
    setIsLoading(true);
    // Use requestAnimationFrame to ensure the component has rendered
    requestAnimationFrame(() => {
      setTimeout(() => setIsLoading(false), 100);
    });
  };

  return (
    <>
      <nav className="navbar">
        <ul>
          <li>
            <Link to="/" onClick={handleLinkClick}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/todos" onClick={handleLinkClick}>
              Todos
            </Link>
          </li>
          <li>
            <Link to="/profile" onClick={handleLinkClick}>
              Profile
            </Link>
          </li>
          <li>
            <Login />
          </li>
          {localStorage.getItem("loggedIn") === "true" ? null : (
            <li>
              <Link to="/signup" onClick={handleLinkClick}>
                Sign Up
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Loading Bar */}
      <div className={`loading-bar ${isLoading ? "loading" : ""}`}>
        <div className="loading-bar-fill"></div>
      </div>
    </>
  );
};

export default Navbar;
