import Navbar from "../components/Navbar";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../css/ProfilePage.css";
import { getToken } from "../utils/auth";

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

  const deleteAccount = async (userID, password) => {
    try {
      const response = await fetch(
        `http://localhost:8000/delete_user/${userID}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ password }),
        }
      );
      if (!response.ok) throw new Error("Failed to delete user");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {!confirmDelete ? (
        <>
          <Navbar />
          <h1 className="greeting">Hello, {currentUser}</h1>
          <h2 className="todo-information">
            Here is some information about your todos:
          </h2>
          <div className="todo-stats">
            <p>
              Number of unfinished todos:{" "}
              {localStorage.getItem("numIncompleteTodos")}
            </p>
            <p>
              Number of completed todos:{" "}
              {localStorage.getItem("numCompletedTodos")}
            </p>
            <p>
              Number of overdue todos: {localStorage.getItem("numOverdueTodos")}
            </p>
          </div>
          <button onClick={() => setConfirmDelete(true)}>Delete Account</button>
        </>
      ) : (
        <div className="confirm-delete-container">
          <form className="login-box">
            <h2>
              If you wish to permanently delete your account, please enter your
              password below.
            </h2>
            <label>Password</label>
            <input type="password" value={password}></input>
            <button
              type="submit"
              onClick={(e) => {
                e.preventDefault();
                deleteAccount(localStorage.getItem("userID"), password);
              }}
            >
              Sign Up
            </button>

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
