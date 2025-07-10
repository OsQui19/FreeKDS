import React, { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, dateFnsLocalizer, Views } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import { format, parse, startOfWeek, getDay } from "date-fns";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {};
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});
const DnDCalendar = withDragAndDrop(Calendar);

export default function ScheduleApp() {
  const [employees, setEmployees] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState(Views.WEEK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [undoStack, setUndoStack] = useState([]);
  const [copied, setCopied] = useState(null);
  const externalEmp = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empRes, schRes] = await Promise.all([
        fetch("/api/employees"),
        fetch("/api/schedule"),
      ]);
      if (!empRes.ok || !schRes.ok) throw new Error("load");
      const empJson = await empRes.json();
      const schJson = await schRes.json();
      setEmployees(empJson.employees || []);
      const evts = (schJson.schedule || []).map((s) => ({
        ...s,
        start: new Date(s.start_time),
        end: new Date(s.end_time),
        title:
          empJson.employees.find((e) => e.id === s.employee_id)?.name ||
          "Shift",
      }));
      setEvents(evts);
    } catch (err) {
      console.error(err);
      setError("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const save = useCallback(async (evts) => {
    setSaving(true);
    try {
      const plain = evts.map((e) => ({
        id: e.id,
        employee_id: e.employee_id,
        start_time: e.start.toISOString(),
        end_time: e.end.toISOString(),
        week_key: e.week_key,
      }));
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schedule: plain }),
      });
      if (!res.ok) throw new Error("save");
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }, []);

  const pushUndo = (next) => {
    setUndoStack((u) => [...u, events]);
    setEvents(next);
  };

  const handleDrop = ({ event, start, end }) => {
    const wk = start.toISOString().split("T")[0];
    pushUndo(
      events.map((e) => (e === event ? { ...e, start, end, week_key: wk } : e)),
    );
  };

  const handleResize = ({ event, start, end }) => {
    const wk = start.toISOString().split("T")[0];
    pushUndo(
      events.map((e) => (e === event ? { ...e, start, end, week_key: wk } : e)),
    );
  };

  const onDropFromOutside = ({ start, end }) => {
    if (externalEmp.current) {
      const empId = externalEmp.current;
      const wk = start.toISOString().split("T")[0];
      pushUndo([
        ...events,
        {
          id: Date.now(),
          employee_id: empId,
          start,
          end,
          week_key: wk,
          title: employees.find((e) => e.id === empId)?.name || "Shift",
        },
      ]);
      externalEmp.current = null;
    }
  };

  const undo = () => {
    setUndoStack((u) => {
      if (!u.length) return u;
      const last = u[u.length - 1];
      setEvents(last);
      return u.slice(0, -1);
    });
  };

  const copyEvent = (event) => {
    setCopied(event);
  };

  const pasteEvent = ({ start }) => {
    if (copied) {
      const end = new Date(start.getTime() + (copied.end - copied.start));
      onDropFromOutside({ start, end });
    }
  };

  return (
    <div>
      {error && (
        <div className="alert alert-danger">
          {error}{" "}
          <button className="btn btn-sm btn-light" onClick={() => save(events)}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="text-center w-100 p-5">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <div className="d-flex">
          <ul className="list-group me-3" style={{ width: "200px" }}>
            {employees.map((e) => (
              <li
                key={e.id}
                className="list-group-item"
                draggable
                onDragStart={() => (externalEmp.current = e.id)}
              >
                {e.name}
              </li>
            ))}
          </ul>
          <div style={{ flex: 1 }}>
            <DnDCalendar
              localizer={localizer}
              events={events}
              defaultView={view}
              views={[Views.WEEK, Views.MONTH]}
              onView={setView}
              onEventDrop={handleDrop}
              onEventResize={handleResize}
              resizable
              onDropFromOutside={onDropFromOutside}
              selectable
              onSelectEvent={copyEvent}
              onSelectSlot={pasteEvent}
              style={{ height: 600 }}
            />
          </div>
        </div>
      )}
      <div className="mt-2">
        <button
          className="btn btn-sm btn-outline-secondary me-2"
          onClick={undo}
          disabled={!undoStack.length}
        >
          Undo
        </button>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => save(events)}
          disabled={saving}
        >
          Save
          {saving && (
            <span
              className="spinner-border spinner-border-sm ms-2"
              role="status"
            ></span>
          )}
        </button>
      </div>
    </div>
  );
}
