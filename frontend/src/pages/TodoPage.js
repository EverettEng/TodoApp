import Navbar from "../components/Navbar";
import "../css/TodoPage.css";
import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import { API_URL } from "../config";

/**
 * TodoPage Component
 *
 * A comprehensive todo management interface that allows users to:
 * - Create new todos with title, description, and due date
 * - View all todos in a sorted list (overdue first, then by completion status, then by due date)
 * - Edit existing todos inline
 * - Toggle completion status
 * - Delete todos
 * - Track statistics (completed, incomplete, overdue counts) in localStorage
 *
 * The component manages authentication via JWT tokens and communicates with a REST API
 * for all CRUD operations. It provides real-time validation and error handling.
 *
 * @returns {JSX.Element} The TodoPage component
 */
const TodoPage = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================

  /**
   * Form state for creating new todos
   * @type {Object}
   * @property {string} title - The todo title (max 100 characters)
   * @property {string} description - The todo description (max 500 characters, optional)
   * @property {string} dueDate - The due date in datetime-local format
   */
  const [form, setForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  /**
   * Form state for editing existing todos
   * @type {Object}
   * @property {string} title - The edited todo title
   * @property {string} description - The edited todo description
   * @property {string} dueDate - The edited due date in datetime-local format
   */
  const [editingForm, setEditingForm] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  /**
   * ID of the todo currently being edited
   * @type {number|null} - Todo ID when editing, null when not editing
   */
  const [editingTodo, setEditingTodo] = useState(null);

  /**
   * Array of all todo items fetched from the API
   * @type {Array<Object>} Array of todo objects with id, title, description, due_date, completed properties
   */
  const [todos, setTodos] = useState([]);

  /**
   * Error messages for different operations
   * @type {Object}
   * @property {string} create - Error message for todo creation
   * @property {string} edit - Error message for todo editing
   */
  const [error, setError] = useState({
    create: "",
    edit: "",
  });

  // ==========================================
  // SIDE EFFECTS & LIFECYCLE
  // ==========================================

  /**
   * Effect: Update localStorage statistics whenever todos change
   *
   * Calculates and stores three statistics:
   * - numCompletedTodos: Count of completed todos
   * - numIncompleteTodos: Count of incomplete, non-overdue todos
   * - numOverdueTodos: Count of incomplete todos past their due date
   *
   * These statistics are used by other parts of the application (likely dashboard)
   */
  useEffect(() => {
    let completed = 0;
    let incomplete = 0;
    let overdue = 0;

    const now = new Date();

    // Categorize each todo based on completion status and due date
    for (const todo of todos) {
      if (new Date(todo.due_date) < now && !todo.completed) {
        overdue++;
      } else if (todo.completed) {
        completed++;
      } else {
        incomplete++;
      }
    }

    // Store statistics in localStorage for use by other components
    localStorage.setItem("numCompletedTodos", completed);
    localStorage.setItem("numIncompleteTodos", incomplete);
    localStorage.setItem("numOverdueTodos", overdue);
  }, [todos]); // Dependency: re-run when todos array changes

  /**
   * Effect: Fetch todos from API on component mount
   *
   * Makes an authenticated GET request to retrieve all todos for the current user.
   * Uses the JWT token from auth utils for authorization.
   */
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
  }, []); // Empty dependency array: run once on mount

  /**
   * Effect: Set page-specific body class for styling
   *
   * Applies 'todo-page' class to document.body for page-specific CSS.
   * Cleanup function removes the class when component unmounts.
   */
  useEffect(() => {
    document.body.className = "todo-page";
    return () => {
      document.body.className = "";
    };
  }, []); // Empty dependency array: run once on mount

  /**
   * Effect: Set page title
   *
   * Updates the browser tab title to "Todos" when this component is active.
   */
  useEffect(() => {
    document.title = "Todos";
  }, []); // Empty dependency array: run once on mount

  // ==========================================
  // EVENT HANDLERS - TODO CREATION
  // ==========================================

  /**
   * Handles form input changes for the create todo form
   *
   * Updates the form state with new values as the user types.
   * Uses computed property names to update the correct field.
   *
   * @param {Event} e - The input change event
   */
  const handleChange = async (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  /**
   * Handles form submission for creating a new todo
   *
   * Validates the due date (must be in future), constructs payload,
   * sends POST request to API, and updates local state on success.
   *
   * @param {Event} e - The form submission event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Construct API payload
    const payload = {
      title: form.title,
      description: form.description,
      due_date: new Date(form.dueDate).toISOString(),
      completed: false,
    };

    // Validate due date is in the future
    const now = new Date();
    if (form.dueDate < now.toISOString()) {
      setError((prev) => ({
        ...prev,
        create: "Due date must be in the future",
      }));
      return;
    }
    setError(""); // Clear any previous errors

    try {
      // Send authenticated POST request to create todo
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

      // Add new todo to local state and reset form
      const newTodo = await response.json();
      setTodos((prev) => [...prev, newTodo]);
      setForm({ title: "", description: "", dueDate: "" });
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // EVENT HANDLERS - TODO OPERATIONS
  // ==========================================

  /**
   * Toggles the completion status of a todo
   *
   * Sends PUT request to API to update completion status,
   * then updates local state to reflect the change.
   *
   * @param {number} todoId - The ID of the todo to toggle
   * @param {boolean} status - The current completion status
   */
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

  /**
   * Deletes a todo from the system
   *
   * Sends DELETE request to API, then removes the todo from local state.
   *
   * @param {number} todoID - The ID of the todo to delete
   */
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

  // ==========================================
  // EVENT HANDLERS - TODO EDITING
  // ==========================================

  /**
   * Initiates editing mode for a specific todo
   *
   * Prevents multiple todos from being edited simultaneously.
   * Sets up the editing form with current todo values.
   *
   * @param {Object} todo - The todo object to edit
   */
  const startEdit = (todo) => {
    // Prevent editing multiple todos at once
    if (!(editingTodo === null)) {
      setError((prev) => ({
        ...prev,
        edit: "Currently editing a Todo. Please finish or delete edits first.",
      }));
      return;
    }

    // Set editing state and populate form with current values
    setEditingTodo(todo.id);
    setEditingForm({
      title: todo.title,
      description: todo.description,
      // Convert ISO date to datetime-local format for input field
      dueDate: new Date(todo.due_date).toISOString().slice(0, 16),
    });
  };

  /**
   * Cancels editing mode and clears the editing form
   *
   * Resets editingTodo to null and clears all editing form fields.
   */
  const deleteEdit = () => {
    setEditingTodo(null);
    setEditingForm({ title: "", description: "", dueDate: "" });
  };

  /**
   * Handles input changes in the editing form
   *
   * Updates editingForm state as user modifies todo fields during editing.
   *
   * @param {Event} e - The input change event
   */
  const handleEditChange = (e) => {
    setEditingForm({ ...editingForm, [e.target.name]: e.target.value });
  };

  /**
   * Saves changes to an edited todo
   *
   * Sends PUT request with updated todo data, updates local state,
   * and exits editing mode on success.
   *
   * @param {number} todoID - The ID of the todo being updated
   */
  const handleUpdate = async (todoID) => {
    try {
      // Construct update payload
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

      // Exit editing mode
      setEditingTodo(null);

      // Update local state with response data
      const updatedTodo = await response.json();
      setTodos((prev) =>
        prev.map((todo) => (todo.id === todoID ? updatedTodo : todo))
      );

      // Clear editing form
      deleteEdit();
    } catch (err) {
      console.error(err);
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div>
      <Navbar />
      <div className="todo-container">
        <h1> Todo List </h1>

        {/* ==========================================
            TODO CREATION FORM
            ========================================== */}
        <h2>Create Todo</h2>
        <form className="todo-form" onSubmit={handleSubmit}>
          {/* Title Input - Required, max 100 characters */}
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

          {/* Description Input - Optional, max 500 characters */}
          <textarea
            className="description-input"
            type="text"
            name="description"
            placeholder="Description of todo (Optional, max 500 characters)"
            value={form.description}
            onChange={handleChange}
            maxLength={500}
          ></textarea>

          {/* Due Date and Submit Button Container */}
          <div className="due-date-container">
            <div className="due-date-left">
              <label htmlFor="dueDate" className="due-date-label">
                Due Date
              </label>
              {/* Due Date Input - Required, datetime-local type */}
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

          {/* Error Message Display for Creation */}
          <p className="error-message">{error.create}</p>
        </form>

        {/* ==========================================
            TODO LIST DISPLAY
            ========================================== */}
        <h2>Todos</h2>
        <div className="todo-list">
          {/* Error Message Display for Editing */}
          <p className="error-message">{error.edit}</p>

          {/* 
            Todo List with Custom Sorting:
            1. Overdue incomplete todos first
            2. Then completed vs incomplete (incomplete first)
            3. Then by due date (earliest first)
          */}
          {todos
            .slice() // Create shallow copy to avoid mutating original array
            .sort((a, b) => {
              const now = new Date();
              const aOverdue = !a.completed && new Date(a.due_date) < now;
              const bOverdue = !b.completed && new Date(b.due_date) < now;

              // Prioritize overdue todos
              if (aOverdue !== bOverdue) return aOverdue ? -1 : 1; // Checks if either a or b are overdue. If one is, return -1 if
              // a is overdue, meaning that a comes before b, and otherwise return 1 meaning that b is overdue and it comes before a.
              // Exit here if the overdue statuses differ

              // Then prioritize incomplete todos over completed ones
              if (a.completed !== b.completed) return a.completed ? 1 : -1; // Does the opposite of the previous if statement. Puts
              // completed tasks after incomplete ones Exit here if completed statuses differ

              // Finally sort by due date (earliest first)
              return new Date(a.due_date) - new Date(b.due_date); // Exit here if they are both incomplete/complete, overdue/due,
              // but dates differ
            })
            .map((todo) => {
              return (
                <div key={todo.id} className="todo-item">
                  {/* ==========================================
                      DISPLAY MODE (Not Editing)
                      ========================================== */}
                  {!(editingTodo === todo.id) ? (
                    <>
                      {/* Todo Information Display */}
                      <div className="todo-description-container">
                        {/* Todo Title with Completion-based Styling */}
                        <h3
                          className={
                            todo.completed
                              ? "todo-item-completed"
                              : "todo-item-incomplete"
                          }
                        >
                          {todo.title}
                        </h3>

                        {/* Todo Description */}
                        <p className="todo-description">{todo.description}</p>

                        {/* Todo Metadata: Due Date and Status */}
                        <div className="todo-details">
                          {/* Due Date with Days Remaining Calculation */}
                          <p className="todo-due-date">
                            Due:{" "}
                            {new Date(todo.due_date).toLocaleString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            (In{" "}
                            {Math.floor(
                              (new Date(todo.due_date) - new Date()) /
                                (1000 * 60 * 60 * 24)
                            )}{" "}
                            days.)
                          </p>

                          {/* Status with Dynamic Styling Based on Completion and Due Date */}
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

                      {/* Action Buttons for Display Mode */}
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
                    /* ==========================================
                       EDIT MODE (Currently Editing)
                       ========================================== */
                    <>
                      {/* Editing Form Fields */}
                      <div className="todo-description-container">
                        {/* Editable Title Input */}
                        <input
                          type="text"
                          name="title"
                          className="edit-todo-title"
                          placeholder="Title (Max 100 characters)"
                          value={editingForm.title}
                          onChange={handleEditChange}
                        />

                        {/* Editable Description Textarea */}
                        <textarea
                          name="description"
                          placeholder="Description of todo (Optional, max 500 characters)"
                          className="edit-todo-description"
                          value={editingForm.description}
                          onChange={handleEditChange}
                        />

                        {/* Editable Due Date */}
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

                      {/* Action Buttons for Edit Mode */}
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
