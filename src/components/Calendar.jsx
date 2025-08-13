import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { TaskContext } from "../context/TaskContext";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addDays,
  parseISO,
  differenceInCalendarDays,
  isBefore,
  isAfter
} from "date-fns";
import TaskModal from "./TaskModal";

/**
 * Approach:
 * - Build the grid covering weeks for the current month (includes prev/next month days for full weeks)
 * - Each task is split into segments by week row so multi-week tasks show as pieces in each week row
 * - Pointer selection across day cells creates a new task span; modal opens to name & pick category
 * - Dragging a task segment moves the entire task by days
 * - Dragging left/right handle resizes start/end
 */

const CATEGORY_COLORS = {
  "To Do": "#4a90e2",
  "In Progress": "#f5a623",
  Review: "#7ed321",
  Completed: "#9b9b9b"
};

export default function Calendar() {
  const { tasks, setTasks, filters } = useContext(TaskContext);
  const [today] = useState(new Date());
  const monthStart = startOfMonth(today);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sun
  const monthEnd = endOfMonth(today);
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = useMemo(
    () => eachDayOfInterval({ start: gridStart, end: gridEnd }),
    [gridStart, gridEnd]
  );

  const rows = Math.ceil(days.length / 7);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRange, setModalRange] = useState({ start: today, end: today });

  // selection states for drag-to-create
  const [selecting, setSelecting] = useState(false);
  const selectStartRef = useRef(null);
  const [selection, setSelection] = useState({ startIndex: null, endIndex: null });

  // preview during drag/resize/move
  const [previewTask, setPreviewTask] = useState(null); // {id?, startISO, endISO}

  // active dragging/resizing
  const dragStateRef = useRef(null);

  const gridRef = useRef(null);

  // apply filters (category multi select, timeWeeks relative to today, search)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      // category
      if (filters.categories.length > 0 && !filters.categories.includes(t.category)) return false;

      // time filter
      if (filters.timeWeeks > 0) {
        const windowStart = new Date();
        const windowEnd = addDays(windowStart, filters.timeWeeks * 7);
        const tStart = parseISO(t.start);
        const tEnd = parseISO(t.end);
        // overlap test
        if (isAfter(tStart, windowEnd) || isBefore(tEnd, windowStart)) return false;
      }

      // search
      if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // helpers
  const dateToIndex = (date) => {
    const fmt = format(date, "yyyy-MM-dd");
    return days.findIndex((d) => format(d, "yyyy-MM-dd") === fmt);
  };

  const indexToDate = (ix) => days[ix];

  // create segments for a task across week rows
  const taskSegments = useMemo(() => {
    const segs = [];
    for (const t of filteredTasks) {
      const si = dateToIndex(parseISO(t.start));
      const ei = dateToIndex(parseISO(t.end));
      if (si === -1 || ei === -1) continue; // out of visible range

      for (let r = 0; r < rows; r++) {
        const rowStart = r * 7;
        const rowEnd = rowStart + 6;
        if (ei < rowStart || si > rowEnd) continue;
        const s = Math.max(si, rowStart);
        const e = Math.min(ei, rowEnd);
        segs.push({
          taskId: t.id,
          name: t.name,
          category: t.category,
          color: t.color || CATEGORY_COLORS[t.category] || "#4a90e2",
          startIndex: s,
          endIndex: e,
          row: r,
          fullStartIndex: si,
          fullEndIndex: ei
        });
      }
    }
    return segs;
  }, [filteredTasks, days.length, rows]);

  // pointer helpers for selection across cells
  const handlePointerDownDay = (e, idx) => {
    if (e.button !== 0) return;
    if (dragStateRef.current) return; // avoid interfering with drag
    selectStartRef.current = idx;
    setSelection({ startIndex: idx, endIndex: idx });
    setSelecting(true);

    const onUp = () => {
      setSelecting(false);
      window.removeEventListener("pointerup", onUp);

      const s = Math.min(selectStartRef.current, selection.endIndex ?? selectStartRef.current);
      const e = Math.max(selectStartRef.current, selection.endIndex ?? selectStartRef.current);
      const startDate = indexToDate(s);
      const endDate = indexToDate(e);
      setModalRange({ start: startDate, end: endDate });
      setModalOpen(true);
    };

    window.addEventListener("pointerup", onUp);
  };

  const handlePointerEnterDay = (idx) => {
    if (!selecting) return;
    setSelection((prev) => ({ ...prev, endIndex: idx }));
  };

  // drag / move handlers
  // helper: compute day index under pointer
  const dayIndexFromPointer = (clientX, clientY) => {
    const grid = gridRef.current;
    if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const colWidth = rect.width / 7;
    const rowHeight = rect.height / rows;
    const col = Math.floor((clientX - rect.left) / colWidth);
    const row = Math.floor((clientY - rect.top) / rowHeight);
    const colClamped = Math.max(0, Math.min(6, col));
    const rowClamped = Math.max(0, Math.min(rows - 1, row));
    return rowClamped * 7 + colClamped;
  };

  const startDragTask = (e, seg) => {
    e.stopPropagation();
    e.preventDefault();
    const pointerIndex = dayIndexFromPointer(e.clientX, e.clientY);
    dragStateRef.current = {
      type: "move",
      taskId: seg.taskId,
      pointerIndexAtStart: pointerIndex,
      taskStartIndexAtStart: seg.fullStartIndex,
      taskEndIndexAtStart: seg.fullEndIndex
    };

    const onMove = (ev) => {
      const state = dragStateRef.current;
      if (!state || state.type !== "move") return;
      const idx = dayIndexFromPointer(ev.clientX, ev.clientY);
      if (idx === null) return;
      const delta = idx - state.pointerIndexAtStart;
      const newStart = state.taskStartIndexAtStart + delta;
      const newEnd = state.taskEndIndexAtStart + delta;
      // clamp
      const span = state.taskEndIndexAtStart - state.taskStartIndexAtStart;
      const clampedStart = Math.max(0, Math.min(days.length - 1 - span, newStart));
      const clampedEnd = clampedStart + span;
      setPreviewTask({
        id: state.taskId,
        start: indexToDate(clampedStart).toISOString(),
        end: indexToDate(clampedEnd).toISOString()
      });
    };

    const onUp = () => {
      const state = dragStateRef.current;
      if (state && state.type === "move") {
        if (previewTask) {
          setTasks((prev) =>
            prev.map((t) => (t.id === previewTask.id ? { ...t, start: previewTask.start, end: previewTask.end } : t))
          );
        }
      }
      dragStateRef.current = null;
      setPreviewTask(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // resizing handlers (left / right)
  const startResizeTask = (e, seg, side) => {
    e.stopPropagation();
    e.preventDefault();
    const pointerIndex = dayIndexFromPointer(e.clientX, e.clientY);
    dragStateRef.current = {
      type: "resize",
      side, // "left" or "right"
      taskId: seg.taskId,
      pointerIndexAtStart: pointerIndex,
      taskStartIndexAtStart: seg.fullStartIndex,
      taskEndIndexAtStart: seg.fullEndIndex
    };

    const onMove = (ev) => {
      const state = dragStateRef.current;
      if (!state || state.type !== "resize") return;
      const idx = dayIndexFromPointer(ev.clientX, ev.clientY);
      if (idx === null) return;
      let newStart = state.taskStartIndexAtStart;
      let newEnd = state.taskEndIndexAtStart;
      if (state.side === "left") {
        newStart = Math.min(idx, state.taskEndIndexAtStart); // cannot cross
        newStart = Math.max(0, newStart);
      } else {
        newEnd = Math.max(idx, state.taskStartIndexAtStart);
        newEnd = Math.min(days.length - 1, newEnd);
      }

      setPreviewTask({
        id: state.taskId,
        start: indexToDate(newStart).toISOString(),
        end: indexToDate(newEnd).toISOString()
      });
    };

    const onUp = () => {
      const state = dragStateRef.current;
      if (state && state.type === "resize") {
        if (previewTask) {
          setTasks((prev) =>
            prev.map((t) => (t.id === previewTask.id ? { ...t, start: previewTask.start, end: previewTask.end } : t))
          );
        }
      }
      dragStateRef.current = null;
      setPreviewTask(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // compute final segments to render: from taskSegments and preview if present
  const allSegments = useMemo(() => {
    // If previewTask is set, update the taskSegments for that task id
    const mapPreview = previewTask ? { [previewTask.id]: previewTask } : {};
    // Merge: for each original task segment, if task id matches preview then recalc its segments per row
    const result = [];
    const tasksToUse = [...filteredTasks];

    // If previewTask exists for id not currently in filteredTasks (possible on drag outside filter) we should still update underlying tasks.
    // For simplicity, we'll render segments based on filteredTasks and adjust segments for preview when id matches.

    for (const seg of taskSegments) {
      if (mapPreview[seg.taskId]) {
        // create segments for preview task using previewTask's start/end (but clipped to this row)
        const p = mapPreview[seg.taskId];
        const si = dateToIndex(parseISO(p.start));
        const ei = dateToIndex(parseISO(p.end));
        const rowStart = seg.row * 7;
        const rowEnd = rowStart + 6;
        if (ei < rowStart || si > rowEnd) continue;
        const s = Math.max(si, rowStart);
        const e = Math.min(ei, rowEnd);
        result.push({ ...seg, startIndex: s, endIndex: e, color: seg.color });
      } else {
        result.push(seg);
      }
    }
    return result;
  }, [taskSegments, previewTask, filteredTasks]);

  // small helper to open modal with day indices
  const openModalWithIndices = (s, e) => {
    setModalRange({ start: indexToDate(s), end: indexToDate(e) });
    setModalOpen(true);
  };

  // handle double-click on a day to quick create single-day task
  const handleDoubleClickDay = (idx) => {
    openModalWithIndices(idx, idx);
  };

  return (
    <div className="calendar-wrapper">
      <div className="calendar-topbar">
        <strong>{format(monthStart, "MMMM yyyy")}</strong>
      </div>

      <div className="calendar-grid" ref={gridRef} style={{ "--rows": rows }}>
        {/* weekday headings */}
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div className="weekday" key={d}>
            {d}
          </div>
        ))}

        {/* day cells (grid children) */}
        {days.map((d, i) => {
          const inMonth = d.getMonth() === monthStart.getMonth();
          const isSelected =
            selection.startIndex !== null &&
            selection.endIndex !== null &&
            i >= Math.min(selection.startIndex, selection.endIndex) &&
            i <= Math.max(selection.startIndex, selection.endIndex);
          return (
            <div
              key={format(d, "yyyy-MM-dd")}
              className={`day-cell ${inMonth ? "" : "muted"} ${isSelected ? "selected" : ""}`}
              onPointerDown={(e) => handlePointerDownDay(e, i)}
              onPointerEnter={() => handlePointerEnterDay(i)}
              onDoubleClick={() => handleDoubleClickDay(i)}
            >
              <div className="day-number">{format(d, "d")}</div>
            </div>
          );
        })}

        {/* task segments (rendered on top via grid placement) */}
        {allSegments.map((seg, idx) => {
          const colStart = (seg.startIndex % 7) + 1;
          const colEnd = (seg.endIndex % 7) + 2; // grid column end is exclusive
          const rowStart = seg.row + 2; // +1 for weekday header row; +1 because rows are 1-indexed; but we used weekday separate - we used headings before so day-grid rows start at row 2
          // However CSS uses grid-auto-rows; we placed weekday cells at first row. To keep it simple:
          // The grid we built places weekday headings as first 7 items, then days items follow. For grid positioning of tasks we will compute using CSS grid-row and grid-column in numeric values:
          // We will compute row number as seg.row + 2 because:
          // - The first grid row is weekdays (1)
          // - Day rows start at row 2
          return (
            <div
              key={seg.taskId + "-" + idx}
              className="task-seg"
              style={{
                gridColumnStart: colStart,
                gridColumnEnd: colEnd,
                gridRowStart: seg.row + 2,
                gridRowEnd: seg.row + 3,
                background: seg.color
              }}
              onPointerDown={(e) => startDragTask(e, seg)}
            >
              <div className="task-content">
                <div className="task-name">{seg.name}</div>

                {/* resize handles */}
                <div
                  className="resize-handle left"
                  onPointerDown={(e) => startResizeTask(e, seg, "left")}
                  title="Drag to change start"
                />
                <div
                  className="resize-handle right"
                  onPointerDown={(e) => startResizeTask(e, seg, "right")}
                  title="Drag to change end"
                />
              </div>
            </div>
          );
        })}
      </div>

      <TaskModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        startDate={modalRange.start}
        endDate={modalRange.end}
      />
    </div>
  );
}
