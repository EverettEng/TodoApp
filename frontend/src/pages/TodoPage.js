import Navbar from "../components/Navbar";
import "../css/TodoPage.css";
import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import { API_URL } from "../config";

const TodoPage = () => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [editingForm, setEditingForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });
  const [editingTodo, setEditingTodo] = useState(null);
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState({
    create: "",
    edit: "",
  });

  useEffect(() => {
    let completed = 0;
    let incomplete = 0;
    let overdue = 0;

    const now = new Date();

    for (const todo of todos) {
      if (new Date(todo.due_date) < now && !todo.completed) {
        overdue++;
      } else if (todo.completed) {
        completed++;
      } else {
        incomplete++;
      }
    }

    localStorage.setItem("numCompletedTodos", completed);
    localStorage.setItem("numIncompleteTodos", incomplete);
    localStorage.setItem("numOverdueTodos", overdue);
  }, [todos]);

  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const response = await fetch(`${API_URL}/api/todos`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });
        if (!response.ok) throw new Error("Failed to fetch todos");
        const data = await response.json();
        setTodos(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTodos();
  }, []);

  useEffect(() => {
    document.body.className = "todo-page";
    return () => {
      document.body.className = "";
    };
  }, []);

  useEffect(() => {
    document.title = "Todos";
  }, []);

  const handleChange = async (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      title: form.title,
      description: form.description,
      due_date: new Date(form.dueDate).toISOString(),
      completed: false,
    };

    const now = new Date();
    if (form.dueDate < now.toISOString()) {
      setError((prev) => ({
        ...prev,
        create: "Due date must be in the future",
      }));
      return;
    }
    setError("");

    try {
      // Send login request to backend
      console.log("Token being sent:", getToken());
      console.log("Payload being sent:", payload);
      const response = await fetch(`${API_URL}/api/create_todo`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to add todo");

      const newTodo = await response.json();
      setTodos((prev) => [...prev, newTodo]);
      setForm({ title: "", description: "", dueDate: "" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleComplete = async (todoId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/update_todo/${todoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ completed: !status }),
      });

      if (!response.ok) throw new Error("Failed to update todo");

      /*
    Updates the 'todos' state by toggling the 'completed' status of a specific todo.
  
    Step-by-step:
    1. setTodos receives a function that gives access to the previous state (`prev`).
    2. We call .map() on the previous list of todos to return a new, updated list.
    3. For each todo in the list:
     - If the todo's id matches the target id:
         - Return a new todo object with all previous properties (...todo),
         - But with 'completed' set to the opposite of the current status.
     - Otherwise, return the todo unchanged.
    The ... is a spread operator and returns a shallow copy of the todo object (key value pairs).
    */

      setTodos((prev) =>
        prev.map((todo) =>
          todo.id === todoId ? { ...todo, completed: !status } : todo
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTodo = async (todoID) => {
    try {
      const response = await fetch(`${API_URL}/api/delete_todo/${todoID}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete todo");

      /*
      Updates the 'todos' state to remove the deleted todo:
      1. setTodos receives a function that gets the previous todos array (prev).
      2. .filter() returns a new array including only todos whose id is not equal to the deleted one.
      3. This effectively removes the deleted todo from the UI.
      */
      setTodos((prev) => prev.filter((todo) => todo.id !== todoID));
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (todo) => {
    if (!(editingTodo === null)) {
      setError((prev) => ({
        ...prev,
        edit: "Currently editing a Todo. Please finish or delete edits first.",
      }));
      return;
    }
    setEditingTodo(todo.id);
    setEditingForm({
      title: todo.title,
      description: todo.description,
      dueDate: new Date(todo.due_date).toISOString().slice(0, 16),
    });
  };

  const deleteEdit = () => {
    setEditingTodo(null);
    setEditingForm({ title: "", description: "", dueDate: "" });
  };

  const handleEditChange = (e) => {
    setEditingForm({ ...editingForm, [e.target.name]: e.target.value });
  };
  const handleUpdate = async (todoID) => {
    try {
      const payload = {
        title: editingForm.title,
        description: editingForm.description,
        due_date: new Date(editingForm.dueDate).toISOString(),
      };
      const response = await fetch(`${API_URL}/api/update_todo/${todoID}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to update todo");

      setEditingTodo(null);

      const updatedTodo = await response.json();
      setTodos((prev) =>
        prev.map((todo) => (todo.id === todoID ? updatedTodo : todo))
      );

      deleteEdit();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <Navbar />
      <div className="todo-container">
        <h1> Todo List </h1>
        <h2>Create Todo</h2>
        <form className="todo-form" onSubmit={handleSubmit}>
          <input
            className="title-input"
            type="text"
            name="title"
            placeholder="Title (Max 100 characters)"
            value={form.title}
            onChange={handleChange}
            maxLength={100}
            required
          ></input>

          <textarea
            className="description-input"
            type="text"
            name="description"
            placeholder="Description of todo (Optional, max 500 characters)"
            value={form.description}
            onChange={handleChange}
            maxLength={500}
          ></textarea>
          <div className="due-date-container">
            <div className="due-date-left">
              <label htmlFor="dueDate" className="due-date-label">
                Due Date
              </label>
              <input
                id="dueDate"
                className="due-date-input"
                type="datetime-local"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                required
              />
            </div>
            <button className="submit-button" type="submit">
              Create Todo
            </button>
          </div>
          <p className="error-message">{error.create}</p>
        </form>
        <h2>Todos</h2>
        <div className="todo-list">
          <p className="error-message">{error.edit}</p>
          {todos
            .slice()
            .sort((a, b) => {
              const now = new Date();
              const aOverdue = !a.completed && new Date(a.due_date) < now;
              const bOverdue = !b.completed && new Date(b.due_date) < now;

              if (aOverdue !== bOverdue) return aOverdue ? -1 : 1; // Checks if either a or b are overdue. If one is, return -1 if
              // a is overdue, meaning that a comes before b, and otherwise return 1 meaning that b is overdue and it comes before a.
              // Exit here if the overdue statuses differ

              if (a.completed !== b.completed) return a.completed ? 1 : -1; // Does the opposite of tlhe previous if statement. Puts
              // completed tasks after incomplete ones Exit here if completed statuses differ

              return new Date(a.due_date) - new Date(b.due_date); // Exit here if they are both incomplete/complete, overdue/due,
              // but dates differ
            })
            .map((todo) => {
              return (
                <div key={todo.id} className="todo-item">
                  {!(editingTodo === todo.id) ? (
                    <>
                      <div className="todo-description-container">
                        <h3
                          className={
                            todo.completed
                              ? "todo-item-completed"
                              : "todo-item-incomplete"
                          }
                        >
                          {todo.title}
                        </h3>
                        <p className="todo-description">{todo.description}</p>
                        <div className="todo-details">
                          <p className="todo-due-date">
                            Due:{" "}
                            {new Date(todo.due_date).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          <p
                            className={
                              new Date(todo.due_date) < new Date() &&
                              !todo.completed
                                ? "todo-status-overdue"
                                : todo.completed
                                ? "todo-status-completed"
                                : "todo-status-incomplete"
                            }
                          >
                            {todo.completed ? "Completed" : "To Do"}
                          </p>
                        </div>
                      </div>
                      <div className="todo-actions">
                        <button
                          onClick={() =>
                            handleToggleComplete(todo.id, todo.completed)
                          }
                        >
                          Toggle Complete
                        </button>
                        <button onClick={() => handleDeleteTodo(todo.id)}>
                          Delete Todo
                        </button>
                        <button onClick={() => startEdit(todo)}>
                          Edit Todo
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="todo-description-container">
                        <input
                          type="text"
                          name="title"
                          className="edit-todo-title"
                          placeholder="Title (Max 100 characters)"
                          value={editingForm.title}
                          onChange={handleEditChange}
                        />
                        <textarea
                          name="description"
                          placeholder="Description of todo (Optional, max 500 characters)"
                          className="edit-todo-description"
                          value={editingForm.description}
                          onChange={handleEditChange}
                        />
                        <div className="todo-details">
                          <input
                            type="datetime-local"
                            className="edit-todo-date"
                            name="dueDate"
                            value={editingForm.dueDate}
                            onChange={handleEditChange}
                          />
                        </div>
                      </div>
                      <div className="todo-actions">
                        <button onClick={() => handleUpdate(todo.id)}>
                          Save
                        </button>
                        <button onClick={deleteEdit}>Delete Edits</button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default TodoPage;
