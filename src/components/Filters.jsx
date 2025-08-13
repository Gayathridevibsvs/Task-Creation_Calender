import React, { useContext } from "react";
import { TaskContext } from "../context/TaskContext";

const CATEGORIES = ["To Do", "In Progress", "Review", "Completed"];

export default function Filters() {
  const { filters, setFilters } = useContext(TaskContext);

  const toggleCategory = (c) => {
    setFilters((f) => {
      const has = f.categories.includes(c);
      return { ...f, categories: has ? f.categories.filter((x) => x !== c) : [...f.categories, c] };
    });
  };

  return (
    <div className="filters">
      <div className="filter-section">
        <strong>Category</strong>
        {CATEGORIES.map((c) => (
          <label key={c} className="filter-item">
            <input
              type="checkbox"
              checked={filters.categories.includes(c)}
              onChange={() => toggleCategory(c)}
            />
            {c}
          </label>
        ))}
      </div>

      <div className="filter-section">
        <strong>Time (from today)</strong>
        <label className="filter-item">
          <input
            type="radio"
            name="time"
            checked={filters.timeWeeks === 0}
            onChange={() => setFilters((f) => ({ ...f, timeWeeks: 0 }))}
          />{" "}
          All
        </label>
        <label className="filter-item">
          <input
            type="radio"
            name="time"
            checked={filters.timeWeeks === 1}
            onChange={() => setFilters((f) => ({ ...f, timeWeeks: 1 }))}
          />{" "}
          1 week
        </label>
        <label className="filter-item">
          <input
            type="radio"
            name="time"
            checked={filters.timeWeeks === 2}
            onChange={() => setFilters((f) => ({ ...f, timeWeeks: 2 }))}
          />{" "}
          2 weeks
        </label>
        <label className="filter-item">
          <input
            type="radio"
            name="time"
            checked={filters.timeWeeks === 3}
            onChange={() => setFilters((f) => ({ ...f, timeWeeks: 3 }))}
          />{" "}
          3 weeks
        </label>
      </div>

      <div className="filter-section">
        <strong>Search</strong>
        <input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
      </div>
    </div>
  );
}
