import Navbar from "../components/Navbar";
import '../css/TodoPage.css';
import { useEffect } from "react";

const TodoPage = () => {

  useEffect(() => {
      document.body.className = "todo-page";
      return () => {
        document.body.className = "";
      };
  }, []);
  
  useEffect(() => {
      document.title = "Todos";
  }, []);
  
  return (<div>
    <Navbar />
  </div>);
};

export default TodoPage;
