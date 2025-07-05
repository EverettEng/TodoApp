import { Link } from "react-router-dom"
import "../css/LoginPage.css"
import { useState } from "react"


const LoginPage = () => {

    return (
        <div className="login-container">
            <form className="login-box">
                <h2>Log In</h2>

                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" required></input>

                <label>Password</label>
                <input type="password" placeholder="Enter your password" required></input>

                <button>Log In</button>

                <p>Don't have an account? Sign up <Link to="/signup">here</Link></p>
            </form>
        </div>
    )
}

export default LoginPage