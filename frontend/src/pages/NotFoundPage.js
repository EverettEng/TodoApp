// NotFoundPage component displays a 404 error for undefined routes
import { Link } from "react-router-dom";
import "../css/NotFoundPage.css";
import { useEffect } from "react";

const NotFoundPage = () => {
  // Render the 404 not found page

  useEffect(() => {
    document.body.className = "not-found";
    return () => {
      document.body.className = "";
    };
  }, []);

  useEffect(() => {
    document.title = "404 Not Found";
  }, []);

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: "center" }}>
          <h1 style={{ textAlign: "center" }}>404 Not Found</h1>
          What you are looking for does not exist. <br /> Go{" "}
          <Link to="/" className="not-found">
            home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
