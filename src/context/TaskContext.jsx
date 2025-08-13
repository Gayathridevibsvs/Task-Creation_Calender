import React, { createContext, useEffect, useState } from "react";

export const TaskContext = createContext();

/**
 * Task shape:
 * {
 *  id: string,
 *  name: string,
 *  category: "To Do" | "In Progress" | "Review" | "Completed",
 *  start: ISO string,
 *  end: ISO string,
 *  color: string (hex)
 * }
 */

export const TaskProvider = ({ children }) => {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({
    categories: [], // multi-select categories to show. empty => all
    timeWeeks: 0,   // 0 = all, 1 = within 1 week, 2 = 2 weeks, 3 = 3 weeks
    search: ""      // live search
  });

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("month_tasks_v1");
      if (raw) setTasks(JSON.parse(raw));
    } catch (e) {
      console.error("load tasks failed", e);
    }
  }, []);

  // persist
  useEffect(() => {
    try {
      localStorage.setItem("month_tasks_v1", JSON.stringify(tasks));
    } catch (e) {
      console.error("save tasks failed", e);
    }
  }, [tasks]);

  return (
    <TaskContext.Provider value={{ tasks, setTasks, filters, setFilters }}>
      {children}
    </TaskContext.Provider>
  );
};
