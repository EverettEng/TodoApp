import { Link } from "react-router-dom";
import Login from "./Login";
// Navbar component for navigation (currently empty, add links as needed)
const Navbar = () => {
  return (
    <nav className="navbar">
      <ul>
        <Link to={"/home"}>Todos</Link>
        <Link to={"/profile"}>Profile</Link>
        <Login />
      </ul>
    </nav>
  );
};

export default Navbar;
