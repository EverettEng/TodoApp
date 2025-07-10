// NotFoundPage component displays a 404 error for undefined routes
import { Link } from "react-router-dom";
import "../css/NotFoundPage.css";
import { use, useEffect } from "react";

const NotFoundPage = () => {
  // Render the 404 not found page

  useEffect(() => {
    document.body.className = "not-found";
    return () => {
      document.body.className = "";
    };
  }, []);
  
  useEffect(() => {
    document.title = "404 Not Found - Todo App";
  }, []);

  return (
    <div className="not-found">
      <h1>404 Not Found</h1>
      What you are looking for does not exist. Go <Link to="/">home</Link>
    </div>
  );
};

export default NotFoundPage;
