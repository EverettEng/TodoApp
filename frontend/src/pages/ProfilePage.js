import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../css/ProfilePage.css";
import { getToken, clearAllAuthData } from "../utils/auth";
import { API_URL } from "../config";

const ProfilePage = () => {
  useEffect(() => {
    document.body.className = "profile-page";
    return () => {
      document.body.className = "";
    };
  }, []);

  useEffect(() => {
    document.title = "Todos";
  }, []);

  const currentUser = localStorage.getItem("username");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const deleteAccount = async (userID, password) => {
    try {
      setError("");
      const response = await fetch(`${API_URL}/delete_user/${userID}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.detail);
        throw new Error("Failed to delete user");
      }
      clearAllAuthData();
      navigate("/");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {!confirmDelete ? (
        <>
          <Navbar />
          <div className="profile-content">
            <div className="profile-header">
              <h1 className="profile-title">Hello, {currentUser}</h1>
              <p className="profile-subtitle">
                Here's an overview of your todos
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">
                  {localStorage.getItem("numIncompleteTodos")}
                </div>
                <div className="stat-label">Incomplete</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {localStorage.getItem("numCompletedTodos")}
                </div>
                <div className="stat-label">Completed</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">
                  {localStorage.getItem("numOverdueTodos")}
                </div>
                <div className="stat-label">Overdue</div>
              </div>
            </div>

            <div className="danger-zone">
              <h3 className="danger-title">Account Settings</h3>
              <button
                className="delete-account"
                onClick={() => setConfirmDelete(true)}
              >
                Delete Account
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="confirm-delete-container">
          <form className="login-box">
            <h2>
              If you wish to permanently delete your account, please enter your
              password below.
            </h2>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            ></input>
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                deleteAccount(localStorage.getItem("userID"), password);
              }}
            >
              Confirm Delete
            </button>
            <p className="error-message">{error}</p>
            <div>
              Don't want to delete your account? Go back to{" "}
              <Link className="profile-link" to="/todos">
                Todos
              </Link>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
