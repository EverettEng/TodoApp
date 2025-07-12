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

  return (<div>
    <Navbar />
    Profile Page
  </div>);
};

export default ProfilePage;
