import "../css/LoginPage.css";
import { Link } from "react-router-dom";

const SignUpPage = () => {
  return (
    <div className="login-container">
      <form className="login-box">
        <h2>Sign up</h2>

        <label>Username</label>
        <input placeholder="This will be your username" required></input>

        <label>Email Address</label>
        <input type="email" placeholder="Enter your email" required></input>

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          required
        ></input>

        <label>Confirm Password</label>
        <input
          type="password"
          placeholder="Re-type your password"
          required
        ></input>

        <button>Sign Up</button>

        <p>
          Have an account? Log in <Link to="/login">here</Link>
        </p>
      </form>
    </div>
  );
};

export default SignUpPage;
