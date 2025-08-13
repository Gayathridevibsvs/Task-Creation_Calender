import React from "react";
import { TaskProvider } from "./context/TaskContext";
import Calendar from "./components/Calendar";
import Filters from "./components/Filters";

export default function App() {
  return (
    <TaskProvider>
      <div className="app-shell">
        <header className="app-header">
          <h1>Month View Task Planner</h1>
        </header>

        <div className="app-body">
          <aside className="sidebar">
            <h2>Filters</h2>
            <Filters />
          </aside>

          <main className="main-area">
            <Calendar />
          </main>
        </div>
      </div>
    </TaskProvider>
  );
}

