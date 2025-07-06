// Entry point for the React application
// Sets up routing for all main pages using React Router
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import TodoPage from "./pages/TodoPage";
import ProfilePage from "./pages/ProfilePage";
import SignUpPage from "./pages/SignUpPage";
import NotFoundPage from "./pages/NotFoundPage";
import InfoPage from "./pages/InfoPage";

// Define all routes for the app
const router = createBrowserRouter([
  {
    path: "/",
    element: <InfoPage />,
  },
  {
    path: "/home",
    element: <TodoPage />,
    errorElement: <NotFoundPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/profile",
    element: <ProfilePage />,
  },
  {
    path: "/signup",
    element: <SignUpPage />,
  },
]);

// Mount the app to the root div
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
