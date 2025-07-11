import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
  const [dirty, setDirty] = useState(false);
  const [roleFilter, setRoleFilter] = useState("All");
  const timeKey = "scheduleTimeRange";
  const defaultRange = { start: "08:00", end: "18:00" };
  const [timeRange, setTimeRange] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(timeKey)) || defaultRange;
    } catch {
      return defaultRange;
    }
  });
  const parseTime = (val) => {
    const [h = 0, m = 0] = (val || "0:0").split(":");
    const d = new Date();
    d.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0, 0, 0);
    return d;
  };
  const roles = useMemo(() => {
    const set = new Set(employees.map((e) => e.role));
    return ["All", ...Array.from(set)];
  }, [employees]);
  const filteredEmployees = useMemo(() => {
    return roleFilter === "All"
      ? employees
      : employees.filter((e) => e.role === roleFilter);
  }, [employees, roleFilter]);
  const displayEvents = useMemo(() => {
    if (roleFilter === "All") return events;
    const allowed = new Set(
      employees.filter((e) => e.role === roleFilter).map((e) => e.id),
    );
    return events.filter((e) => allowed.has(e.employee_id));
  }, [events, employees, roleFilter]);
  const externalEmp = useRef(null);

  const getEventStyle = useCallback(
    (event) => {
      const emp = employees.find((e) => e.id === event.employee_id);
      const color = emp?.color || "#0d6efd";
      return { style: { backgroundColor: color, borderColor: color } };
    },
    [employees],
  );

  const hasOverlap = (evts) => {
    const byEmp = {};
    for (const e of evts) {
      if (!byEmp[e.employee_id]) byEmp[e.employee_id] = [];
      byEmp[e.employee_id].push(e);
    }
    for (const list of Object.values(byEmp)) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i++) {
        if (list[i].start < list[i - 1].end) return true;
      }
    }
    return false;
  };

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
      setDirty(false);
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

  useEffect(() => {
    try {
      localStorage.setItem(timeKey, JSON.stringify(timeRange));
    } catch {
      /* ignore */
    }
  }, [timeRange]);

  const save = useCallback(async (evts) => {
    setSaving(true);
    try {
      if (evts.some((e) => e.end <= e.start)) {
        setError("Shift end must be after start");
        setSaving(false);
        return;
      }
      if (hasOverlap(evts)) {
        setError("Employees have overlapping shifts");
        setSaving(false);
        return;
      }
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
      setDirty(false);
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
    setDirty(true);
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

  const pasteEvent = ({ start, end }) => {
    if (copied) {
      const newEnd = new Date(start.getTime() + (copied.end - copied.start));
      onDropFromOutside({ start, end: newEnd });
    } else {
      const opts = employees
        .map((e) => `${e.id}: ${e.name}`)
        .join("\n");
      const input = prompt(`Assign employee ID:\n${opts}`);
      const empId = parseInt(input, 10);
      if (empId && employees.find((e) => e.id === empId)) {
        externalEmp.current = empId;
        onDropFromOutside({ start, end });
      }
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
            {filteredEmployees.map((e) => (
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
            <div className="mb-2 d-flex" style={{ gap: "0.5rem" }}>
              <label className="form-label mb-0">From</label>
              <input
                type="time"
                className="form-control form-control-sm"
                style={{ width: "110px" }}
                value={timeRange.start}
                onChange={(e) =>
                  setTimeRange((r) => ({ ...r, start: e.target.value }))
                }
              />
              <label className="form-label mb-0 ms-2">To</label>
              <input
                type="time"
                className="form-control form-control-sm"
                style={{ width: "110px" }}
                value={timeRange.end}
                onChange={(e) =>
                  setTimeRange((r) => ({ ...r, end: e.target.value }))
                }
              />
              <select
                className="form-select form-select-sm ms-2"
                style={{ width: "150px" }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <DnDCalendar
              localizer={localizer}
              events={displayEvents}
              defaultView={view}
              views={[Views.WEEK, Views.MONTH]}
              onView={setView}
              onEventDrop={handleDrop}
              onEventResize={handleResize}
              resizable
              eventPropGetter={getEventStyle}
              onDropFromOutside={onDropFromOutside}
              selectable
              onSelectEvent={copyEvent}
              onSelectSlot={pasteEvent}
              min={parseTime(timeRange.start)}
              max={parseTime(timeRange.end)}
              step={15}
              timeslots={4}
              longPressThreshold={10}
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
          disabled={saving || !dirty}
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
