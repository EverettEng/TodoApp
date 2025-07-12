import { Link, useNavigate } from "react-router-dom";
import "../css/Navbar.css";
import { isLoggedIn, logout } from "../utils/auth";

const Login = () => {
  const navigate = useNavigate();
  const status = isLoggedIn() ? "Logout" : "Login";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div>
      <Link
        className="login-button"
        to={"/login"}
        onClick={isLoggedIn() ? handleLogout : null}
      >
        {status}
      </Link>
    </div>
  );
};

export default Login;
