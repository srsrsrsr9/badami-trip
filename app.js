const { useState, useEffect, useCallback, useRef } = React;

// ─────────────────────────────────────────────────────────────────────────
// Trip data — the fixed plan. Only the checklist items (below) live in
// Firestore; the schedule/map for each day is just reference content.
// ─────────────────────────────────────────────────────────────────────────

const TRIP_COLLECTION = "trip";
const TRIP_DOC_ID = "badami-oct-2026";
const PEOPLE = ["Vinay", "Sravanthi"];

const TRIP_DAYS = [
  {
    id: "2026-10-16",
    dayLabel: "Fri, Oct 16",
    title: "Hyderabad \u2192 Badami",
    plan: [
      "6:30 AM depart Bachupally",
      "~9:00 AM breakfast stop (Jadcherla / Mahbubnagar)",
      "~11:30 AM lunch & fuel stop (Raichur)",
      "~3:30\u20134:00 PM check in, Badami",
      "5:15 PM (optional) sunset walk \u2014 Bhutanatha + Agastya Lake",
    ],
    mapEmbed: "https://maps.google.com/maps?saddr=Bachupally,+Hyderabad&daddr=Badami,+Karnataka&output=embed",
  },
  {
    id: "2026-10-17",
    dayLabel: "Sat, Oct 17",
    title: "Badami town",
    plan: [
      "7:00 AM breakfast",
      "7:30\u20139:45 AM Cave Temples, ahead of heat and tour buses",
      "9:45\u201310:15 AM Archaeological Museum",
      "10:15 AM\u20133:30 PM lunch + downtime \u2014 the hottest stretch of the day",
      "4:00\u20135:00 PM Bhutanatha + Agastya Lake",
      "5:15\u20136:10 PM fort / Malegitti Shivalaya at sunset (optional)",
    ],
    mapEmbed: "https://maps.google.com/maps?q=Badami+Cave+Temples,+Karnataka&output=embed",
  },
  {
    id: "2026-10-18",
    dayLabel: "Sun, Oct 18",
    title: "Pattadakal \u00b7 Aihole \u00b7 Mahakuta \u00b7 Banashankari",
    plan: [
      "8:00 AM depart Badami",
      "8:15\u20138:45 AM Mahakuta",
      "9:15\u201311:45 AM Pattadakal",
      "12:00\u20131:15 PM Aihole",
      "1:15\u20132:00 PM lunch",
      "2:30\u20133:00 PM Banashankari, on the way in",
      "3:15 PM back in Badami, evening free",
    ],
    mapEmbed: "https://maps.google.com/maps?saddr=Badami,+Karnataka&daddr=Aihole,+Karnataka&output=embed",
  },
  {
    id: "2026-10-19",
    dayLabel: "Mon, Oct 19",
    title: "Badami \u2192 Hyderabad",
    plan: [
      "6:30 AM depart Badami",
      "~9:00 AM / ~11:30 AM breakfast & lunch stops, same rhythm as Day 1",
      "~3:30\u20134:00 PM home",
    ],
    mapEmbed: "https://maps.google.com/maps?saddr=Badami,+Karnataka&daddr=Bachupally,+Hyderabad&output=embed",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function toItem(text) {
  return { id: uid(), text, done: false, assignee: null };
}

function seedItems() {
  return {
    "2026-10-16": [
      "Book Badami hotel for the weekend (confirm soon)",
      "Car service check: tyres, spare, coolant",
      "Download offline maps for the route",
      "Car charger / power bank",
      "First-aid kit & regular medicines",
      "Pack caps, sunscreen, comfortable shoes",
    ].map(toItem),
    "2026-10-17": ["Cash for cave temple & museum tickets"].map(toItem),
    "2026-10-18": [
      "Cash for Pattadakal & Aihole tickets",
      "Water bottles & snacks for the circuit",
    ].map(toItem),
    "2026-10-19": ["Confirm hotel checkout time"].map(toItem),
  };
}

function pad(n) {
  return String(n).padStart(2, "0");
}

function todayId() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysBetween(fromId, toId) {
  const [fy, fm, fd] = fromId.split("-").map(Number);
  const [ty, tm, td] = toId.split("-").map(Number);
  const from = new Date(fy, fm - 1, fd);
  const to = new Date(ty, tm - 1, td);
  return Math.round((to - from) / 86400000);
}

function getTripStatus() {
  const t = todayId();
  const first = TRIP_DAYS[0].id;
  const last = TRIP_DAYS[TRIP_DAYS.length - 1].id;
  if (t < first) return { phase: "before", daysUntil: daysBetween(t, first) };
  if (t > last) return { phase: "after" };
  return { phase: "during", dayId: t };
}

function initialExpandedDayId(status) {
  if (status.phase === "during") return status.dayId;
  if (status.phase === "before") return TRIP_DAYS[0].id;
  return TRIP_DAYS[TRIP_DAYS.length - 1].id;
}

// ─────────────────────────────────────────────────────────────────────────
// Tiny hand-rolled icons (no icon library needed — keeps this dependency-free)
// ─────────────────────────────────────────────────────────────────────────

function IconPlus({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconTrash({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function IconCheck({ size = 13, color = "currentColor" }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconClose({ size = 14 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconMove({ size = 15 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="21" y1="3" x2="13" y2="11" />
      <path d="M19 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6" />
    </svg>
  );
}

function IconChevron({ open }) {
  return (
    <svg className={`chevron${open ? " open" : ""}`} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function GoogleG() {
  return (
    <svg className="google-g" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 019.5 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.94 23.94 0 000 24c0 3.86.92 7.5 2.56 10.78z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.9l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Screens shown before the trip data is reachable
// ─────────────────────────────────────────────────────────────────────────

function SignInScreen({ onSignIn }) {
  return (
    <div className="signin-screen">
      <div className="signin-card">
        <h1>Badami Trip</h1>
        <p>Sign in with the Google account you and Sravanthi both use to see and update the shared trip plan.</p>
        <button className="google-btn" onClick={onSignIn}>
          <GoogleG />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

function RestrictedScreen({ email, onSignOut }) {
  return (
    <div className="signin-screen">
      <div className="signin-card">
        <h1>Private trip</h1>
        <p>Signed in as {email}, but this account isn't on the guest list for this trip planner.</p>
        <button className="google-btn" onClick={onSignOut}>Sign out and try another account</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main app
// ─────────────────────────────────────────────────────────────────────────

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [items, setItems] = useState(null);
  const [expandedDayId, setExpandedDayId] = useState(null);
  const [movingItemId, setMovingItemId] = useState(null);
  const [newItemText, setNewItemText] = useState("");
  const [saveError, setSaveError] = useState(false);
  const seededRef = useRef(false);
  const todayCardRef = useRef(null);
  const status = getTripStatus();

  // Auth state
  useEffect(() => {
    const unsub = firebase.auth().onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) setExpandedDayId((prev) => prev || initialExpandedDayId(status));
    });
    firebase.auth().getRedirectResult().catch(() => {
      // surfaced via onAuthStateChanged staying null; nothing else to do here
    });
    return unsub;
    // eslint-disable-next-line
  }, []);

  const isAllowed = user && window.ALLOWED_EMAILS.includes(user.email);

  // Firestore sync — only once signed in with an allowed account
  useEffect(() => {
    if (!isAllowed) {
      setItems(null);
      return;
    }
    const ref = firebase.firestore().collection(TRIP_COLLECTION).doc(TRIP_DOC_ID);
    const unsub = ref.onSnapshot(
      (snap) => {
        if (snap.exists && snap.data().items) {
          setItems(snap.data().items);
        } else if (!seededRef.current) {
          seededRef.current = true;
          const seed = seedItems();
          ref.set({ items: seed }).catch(() => setSaveError(true));
          setItems(seed);
        }
      },
      () => setSaveError(true)
    );
    return unsub;
    // eslint-disable-next-line
  }, [isAllowed]);

  // Gently scroll today's card into view once, after first render of the list
  useEffect(() => {
    if (status.phase === "during" && todayCardRef.current) {
      todayCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line
  }, [items !== null]);

  const persist = useCallback((next) => {
    setItems(next);
    firebase
      .firestore()
      .collection(TRIP_COLLECTION)
      .doc(TRIP_DOC_ID)
      .set({ items: next })
      .then(() => setSaveError(false))
      .catch(() => setSaveError(true));
  }, []);

  function toggleDay(dayId) {
    setMovingItemId(null);
    setNewItemText("");
    setExpandedDayId((prev) => (prev === dayId ? null : dayId));
  }

  function addItem(dayId, text) {
    const trimmed = text.trim();
    if (!trimmed || !items) return;
    persist({ ...items, [dayId]: [...(items[dayId] || []), toItem(trimmed)] });
    setNewItemText("");
  }

  function toggleItem(dayId, itemId) {
    if (!items) return;
    persist({
      ...items,
      [dayId]: items[dayId].map((it) => (it.id === itemId ? { ...it, done: !it.done } : it)),
    });
  }

  function deleteItem(dayId, itemId) {
    if (!items) return;
    persist({ ...items, [dayId]: items[dayId].filter((it) => it.id !== itemId) });
  }

  function cycleAssignee(dayId, itemId) {
    if (!items) return;
    persist({
      ...items,
      [dayId]: items[dayId].map((it) => {
        if (it.id !== itemId) return it;
        const idx = PEOPLE.indexOf(it.assignee);
        const next = idx === -1 ? PEOPLE[0] : idx === PEOPLE.length - 1 ? null : PEOPLE[idx + 1];
        return { ...it, assignee: next };
      }),
    });
  }

  function moveItem(fromDayId, toDayId, itemId) {
    if (!items || fromDayId === toDayId) return;
    const item = (items[fromDayId] || []).find((it) => it.id === itemId);
    if (!item) return;
    persist({
      ...items,
      [fromDayId]: items[fromDayId].filter((it) => it.id !== itemId),
      [toDayId]: [...(items[toDayId] || []), item],
    });
    setMovingItemId(null);
  }

  function signIn() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  }

  function signOut() {
    firebase.auth().signOut();
  }

  if (authLoading) {
    return <div className="loading-screen">Loading…</div>;
  }
  if (!user) {
    return <SignInScreen onSignIn={signIn} />;
  }
  if (!isAllowed) {
    return <RestrictedScreen email={user.email} onSignOut={signOut} />;
  }
  if (!items) {
    return <div className="loading-screen">Loading your trip…</div>;
  }

  return (
    <div className="shell">
      <header className="header">
        <div>
          <h1 className="trip-title">Badami Trip</h1>
          <p className="trip-dates">Oct 16–19, 2026 · Hyderabad round trip</p>
        </div>
        <div className="auth-chip">
          <div className="auth-chip-top">
            {user.photoURL && <img className="auth-avatar" src={user.photoURL} alt="" />}
            <span className="auth-name">{user.displayName ? user.displayName.split(" ")[0] : user.email}</span>
          </div>
          <button className="signout-btn" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <StatusBanner status={status} />

      <div className="day-list">
        {TRIP_DAYS.map((day) => {
          const isToday = status.phase === "during" && status.dayId === day.id;
          const isPast = todayId() > day.id;
          return (
            <div key={day.id} ref={isToday ? todayCardRef : null}>
              <DayCard
                day={day}
                items={items[day.id] || []}
                isToday={isToday}
                isPast={isPast}
                expanded={expandedDayId === day.id}
                onToggle={() => toggleDay(day.id)}
                movingItemId={movingItemId}
                setMovingItemId={setMovingItemId}
                newItemText={newItemText}
                setNewItemText={setNewItemText}
                onAddItem={(text) => addItem(day.id, text)}
                onToggleItem={(itemId) => toggleItem(day.id, itemId)}
                onDeleteItem={(itemId) => deleteItem(day.id, itemId)}
                onCycleAssignee={(itemId) => cycleAssignee(day.id, itemId)}
                onMoveItem={(toDayId, itemId) => moveItem(day.id, toDayId, itemId)}
              />
            </div>
          );
        })}
      </div>

      {saveError && <div className="error-banner">Couldn't save just now. Check your connection.</div>}
    </div>
  );
}

function StatusBanner({ status }) {
  let text;
  if (status.phase === "before") {
    text = status.daysUntil === 1 ? "Trip starts tomorrow." : `Trip starts in ${status.daysUntil} days.`;
  } else if (status.phase === "during") {
    const idx = TRIP_DAYS.findIndex((d) => d.id === status.dayId);
    text = `Day ${idx + 1} of ${TRIP_DAYS.length} \u2014 today's plan is open below.`;
  } else {
    text = "Trip completed \u2014 hope Badami was wonderful!";
  }
  return <div className={`status-banner${status.phase === "during" ? " today" : ""}`}>{text}</div>;
}

function DayCard({
  day,
  items,
  isToday,
  isPast,
  expanded,
  onToggle,
  movingItemId,
  setMovingItemId,
  newItemText,
  setNewItemText,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onCycleAssignee,
  onMoveItem,
}) {
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const otherDays = TRIP_DAYS.filter((d) => d.id !== day.id);

  return (
    <div className={`day-card${isToday ? " is-today" : ""}`}>
      <button className="day-header" onClick={onToggle}>
        <div className="day-header-left">
          <span className="day-date">{day.dayLabel}</span>
          <span className="day-title-text">{day.title}</span>
        </div>
        <div className="day-header-right">
          {isToday && <span className="day-badge">Today</span>}
          {!isToday && isPast && <span className="day-badge past">Past</span>}
          <IconChevron open={expanded} />
        </div>
      </button>

      {items.length > 0 && (
        <div className="day-progress-track">
          <div className="day-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {expanded && (
        <div className="day-body">
          <p className="section-label">Plan</p>
          <ul className="plan-list">
            {day.plan.map((line, i) => (
              <li key={i} className="plan-item">{line}</li>
            ))}
          </ul>

          <div className="map-wrap">
            <iframe
              className="map-frame"
              src={day.mapEmbed}
              title={`Map for ${day.title}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>

          <p className="section-label">Checklist — {items.length ? `${done} of ${items.length} done` : "nothing yet"}</p>
          <div className="item-list">
            {items.length === 0 && <p className="empty-text">Add your first item below.</p>}
            {items.map((item) => (
              <React.Fragment key={item.id}>
                <div className="item-row">
                  <button
                    className={`checkbox${item.done ? " done" : ""}`}
                    onClick={() => onToggleItem(item.id)}
                    aria-label={item.done ? "Mark as not done" : "Mark as done"}
                  >
                    {item.done && <IconCheck color="var(--surface)" />}
                  </button>
                  <span className={`item-text${item.done ? " done" : ""}`}>{item.text}</span>
                  <button className="assignee-chip" onClick={() => onCycleAssignee(item.id)} aria-label="Cycle assignee">
                    {item.assignee ? item.assignee[0] : "\u2013"}
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => setMovingItemId(movingItemId === item.id ? null : item.id)}
                    aria-label="Move to another day"
                  >
                    <IconMove />
                  </button>
                  <button className="icon-btn" onClick={() => onDeleteItem(item.id)} aria-label="Delete item">
                    <IconClose />
                  </button>
                </div>
                {movingItemId === item.id && (
                  <div className="move-picker">
                    {otherDays.map((d) => (
                      <button key={d.id} className="move-chip" onClick={() => onMoveItem(d.id, item.id)}>
                        {d.dayLabel}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="add-row">
            <input
              className="add-input"
              placeholder="Add an item\u2026"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddItem(newItemText);
              }}
            />
            <button className="add-btn" onClick={() => onAddItem(newItemText)} aria-label="Add item">
              <IconPlus size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
