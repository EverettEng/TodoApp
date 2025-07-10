import Navbar from "../components/Navbar";
import "../css/InfoPage.css";
import {useEffect} from "react";

const InfoPage = () => {
  useEffect(() => {
    document.body.className = "info-page";
    return () => {
      document.body.className = "";
    };
  }, []);

    useEffect(() => {
        document.title = "Todo App";
    }, []);
  return (
    <div>
      <Navbar />
    </div>
  );
};

export default InfoPage;
