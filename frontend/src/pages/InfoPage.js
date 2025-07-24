import Navbar from "../components/Navbar";
import "../css/InfoPage.css";
import { useEffect } from "react";
import linkedin from "../images/LinkedIn_icon.png";
import github from "../images/github_icon.png";

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
      <p className="info-text">
        This is a simple Todo App built with React and Node.js. It allows users
        to create, read, update, and delete todo items.
        <br></br>
        <br></br>
        This is created by Everett Eng as a portfolio project and introduction
        to full-stack development.
      </p>
      <h1 style={{ textAlign: "center", paddingTop: "10px" }}>
        Skills used when creating this app:
      </h1>
      <ul
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: "18px",
          alignItems: "center",
          flexDirection: "column",
        }}
      >
        <li>React.js</li>
        <li>HTML</li>
        <li>CSS</li>
        <li>JavaScript</li>
        <li>FastAPI</li>
        <li>SQLite</li>
        <li>SQLAlchemy</li>
        <li>Pydantic</li>
      </ul>

      <ul className="profile-links">
        <h1>Links</h1>
        <li>
          <img src={linkedin} alt="Linkedin" />
          <a
            href="https://www.linkedin.com/in/everett-eng/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Linkedin
          </a>
        </li>
        <li>
          <img src={github} alt="Github"></img>
          <a
            href="https://github.com/EverettEng"
            target="_blank"
            rel="noopener noreferrer"
          >
            Github
          </a>
        </li>
      </ul>
    </div>
  );
};

export default InfoPage;
