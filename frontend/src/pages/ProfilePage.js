import Navbar from "../components/Navbar";
import { useEffect } from "react";
import "../css/ProfilePage.css";

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

  return (
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
          Number of completed todos: {localStorage.getItem("numCompletedTodos")}
        </p>
        <p>
          Number of overdue todos: {localStorage.getItem("numOverdueTodos")}
        </p>
      </div>
    </>
  );
};

export default ProfilePage;
