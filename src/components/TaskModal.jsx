import React, { useContext, useState, useEffect } from "react";
import { TaskContext } from "../context/TaskContext";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";

const CATEGORIES = ["To Do", "In Progress", "Review", "Completed"];
const CATEGORY_COLORS = {
  "To Do": "#4a90e2",
  "In Progress": "#f5a623",
  Review: "#7ed321",
  Completed: "#9b9b9b"
};

export default function TaskModal({ open, onClose, startDate, endDate }) {
  const { setTasks } = useContext(TaskContext);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("To Do");

  useEffect(() => {
    if (open) {
      setName("");
      setCategory("To Do");
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) return alert("Task name required");
    const newTask = {
      id: uuidv4(),
      name: name.trim(),
      category,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      color: CATEGORY_COLORS[category] || "#4a90e2"
    };
    setTasks((s) => [...s, newTask]);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h3>Create Task</h3>
        <p className="modal-dates">
          {format(startDate, "PP")} — {format(endDate, "PP")}
        </p>

        <label>
          Task name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Implement login"
            autoFocus
          />
        </label>

        <label>
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="modal-actions">
          <button className="btn" onClick={handleSave}>
            Save
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
