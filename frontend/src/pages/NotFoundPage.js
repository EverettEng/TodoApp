// NotFoundPage component displays a 404 error for undefined routes
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  // Render the 404 not found page
  return (
    <div>
      <h1>404 Not Found</h1>
      What you are looking for does not exist. Go <Link to="/">home</Link>
    </div>
  );
};

export default NotFoundPage;
