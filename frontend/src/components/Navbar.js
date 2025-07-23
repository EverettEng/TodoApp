import { Link } from "react-router-dom";
import Login from "./Login";
import "../css/Navbar.css";

// Navbar component for navigation (currently empty, add links as needed)
const Navbar = () => {
  return (
    <nav className="navbar">
      <ul>
        <li>
          <Link to="/">Home</Link>
        </li>
        <li>
          <Link to="/todos">Todos</Link>
        </li>
        <li>
          <Link to="/profile">Profile</Link>
        </li>
        <li>
          <Login />
        </li>
        {localStorage.getItem("loggedIn") === "true" ? null : (
          <li>
            <Link to="/signup" >Sign Up</Link>
          </li>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
