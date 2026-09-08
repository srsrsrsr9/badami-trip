// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Set persistent login session
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Badami Trip Data (Oct 16–19, 2026)
const TRIP_DAYS = [
  {
    id: 'day1',
    date: '2026-10-16',
    title: 'Fri, Oct 16 — Hyd → Badami',
    subtitle: 'Drive to Badami & Lake Sunset',
    mapUrl: 'https://maps.google.com/maps?q=Hyderabad+to+Badami&output=embed',
    schedule: [
      '6:30 AM — Depart Bachupally',
      '9:00 AM — Breakfast stop (Jadcherla/Mahbubnagar stretch)',
      '11:30 AM — Lunch/fuel stop (Raichur)',
      '3:30–4:00 PM — Check in at Badami hotel',
      '5:15 PM — Stroll to Bhutanatha + Agastya Lake for sunset (~6:05 PM)'
    ]
  },
  {
    id: 'day2',
    date: '2026-10-17',
    title: 'Sat, Oct 17 — Badami Town',
    subtitle: 'Caves, Museum & Fort',
    mapUrl: 'https://maps.google.com/maps?q=Badami+Cave+Temples&output=embed',
    schedule: [
      '7:00 AM — Breakfast',
      '7:30–9:45 AM — Cave Temples (ahead of heat and crowds)',
      '9:45–10:15 AM — Archaeological Museum',
      '10:15 AM–3:30 PM — Lunch & afternoon downtime',
      '4:00–5:00 PM — Bhutanatha Temple & Agastya Lake',
      '5:15–6:10 PM — Malegitti Shivalaya / Fort for sunset'
    ]
  },
  {
    id: 'day3',
    date: '2026-10-18',
    title: 'Sun, Oct 18 — Heritage Circuit',
    subtitle: 'Pattadakal, Aihole & Mahakuta',
    mapUrl: 'https://maps.google.com/maps?q=Pattadakal,+Karnataka&output=embed',
    schedule: [
      '8:00 AM — Depart hotel',
      '8:15–8:45 AM — Mahakuta Temple',
      '9:15–11:45 AM — Pattadakal Group of Monuments',
      '12:00–1:15 PM — Aihole complex',
      '1:15–2:00 PM — Lunch',
      '2:30–3:00 PM — Banashankari Temple on the way back',
      '3:15 PM — Return to Badami (evening free)'
    ]
  },
  {
    id: 'day4',
    date: '2026-10-19',
    title: 'Mon, Oct 19 — Badami → Hyd',
    subtitle: 'Return Journey',
    mapUrl: 'https://maps.google.com/maps?q=Badami+to+Hyderabad&output=embed',
    schedule: [
      '6:30 AM — Depart Badami',
      '9:00 AM — Breakfast stop',
      '1:00 PM — Lunch stop',
      '3:30–4:00 PM — Arrive home in Hyderabad'
    ]
  }
];

const DEFAULT_ITEMS = [
  { id: 'item-1', text: 'Book hotel in Badami', dayId: 'day1', completed: false, assignedTo: '' },
  { id: 'item-2', text: 'Car safety check & tyre pressure', dayId: 'day1', completed: false, assignedTo: 'V' },
  { id: 'item-3', text: 'Download Google Offline Maps', dayId: 'day1', completed: false, assignedTo: 'V' },
  { id: 'item-4', text: 'Pack driving snacks & water bottles', dayId: 'day1', completed: false, assignedTo: 'S' },
  { id: 'item-5', text: 'Buy entrance tickets online if available', dayId: 'day2', completed: false, assignedTo: '' },
  { id: 'item-6', text: 'Pack comfortable walking shoes & hats', dayId: 'day2', completed: false, assignedTo: '' }
];

function App() {
  const [user, setUser] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [accessDenied, setAccessDenied] = React.useState(null);
  const [items, setItems] = React.useState([]);
  const [newItemText, setNewItemText] = React.useState('');
  const [newItemDay, setNewItemDay] = React.useState('day1');

  // Auto-expand today's day during the trip, or default to Day 1
  const todayStr = new Date().toISOString().split('T')[0];
  const initialActiveDay = TRIP_DAYS.find(d => d.date === todayStr)?.id || 'day1';
  const [activeDay, setActiveDay] = React.useState(initialActiveDay);

  // Authentication state listener with case-insensitive email check
  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        const email = (currentUser.email || '').toLowerCase().trim();
        const allowed = (typeof ALLOWED_EMAILS !== 'undefined' ? ALLOWED_EMAILS : []).map(e => e.toLowerCase().trim());

        if (allowed.length === 0 || allowed.includes(email)) {
          setUser(currentUser);
          setAccessDenied(null);
        } else {
          setUser(null);
          setAccessDenied(currentUser.email);
          auth.signOut();
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore document sync
  React.useEffect(() => {
    if (!user) return;

    const docRef = db.collection('trip').doc('badami');
    const unsubscribe = docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        setItems(data.items || []);
      } else {
        docRef.set({ items: DEFAULT_ITEMS });
        setItems(DEFAULT_ITEMS);
      }
    }, (error) => {
      console.error("Firestore sync error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const updateItemsInFirestore = (newItems) => {
    setItems(newItems);
    db.collection('trip').doc('badami').set({ items: newItems }, { merge: true });
  };

  const handleGoogleSignIn = () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch((error) => {
      console.error("Sign-in popup error:", error);
      alert("Sign-in error: " + error.message);
    });
  };

  const handleSignOut = () => {
    auth.signOut();
  };

  const toggleItemComplete = (id) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    updateItemsInFirestore(newItems);
  };

  const moveItemDay = (id, targetDayId) => {
    const newItems = items.map(item =>
      item.id === id ? { ...item, dayId: targetDayId } : item
    );
    updateItemsInFirestore(newItems);
  };

  const toggleAssignee = (id) => {
    const cycle = { '': 'V', 'V': 'S', 'S': '' };
    const newItems = items.map(item =>
      item.id === id ? { ...item, assignedTo: cycle[item.assignedTo || ''] } : item
    );
    updateItemsInFirestore(newItems);
  };

  const addItem = (e) => {
    e.preventDefault();
    if (!newItemText.trim()) return;
    const newItem = {
      id: 'item-' + Date.now(),
      text: newItemText.trim(),
      dayId: newItemDay,
      completed: false,
      assignedTo: ''
    };
    updateItemsInFirestore([...items, newItem]);
    setNewItemText('');
  };

  const deleteItem = (id) => {
    const newItems = items.filter(item => item.id !== id);
    updateItemsInFirestore(newItems);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
        Loading Badami Trip Planner...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: '420px', margin: '60px auto', background: '#ffffff', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <h1 style={{ fontFamily: 'serif', fontSize: '2.2rem', color: '#2c3e50', marginBottom: '8px' }}>Badami Trip</h1>
        <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: '24px' }}>
          Sign in with the Google account you and Sravanthi both use to see and update the shared trip plan.
        </p>

        {accessDenied && (
          <div style={{ background: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.88rem' }}>
            Access denied for <strong>{accessDenied}</strong>. Account is not in ALLOWED_EMAILS.
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#ffffff',
            border: '1px solid #dadce0',
            borderRadius: '24px',
            padding: '10px 24px',
            fontSize: '1rem',
            fontWeight: '500',
            color: '#3c4043',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '18px', height: '18px' }} />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '2px solid #eee', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'serif', margin: 0, fontSize: '1.8rem', color: '#2c3e50' }}>Badami Road Trip</h1>
          <span style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>Oct 16 – Oct 19, 2026</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '0.85rem', color: '#555' }}>{user.email}</span>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: '1px solid #ccc', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <form onSubmit={addItem} style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Add checklist or packing item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.95rem' }}
        />
        <select
          value={newItemDay}
          onChange={(e) => setNewItemDay(e.target.value)}
          style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '0.9rem', background: '#fff' }}
        >
          {TRIP_DAYS.map(day => (
            <option key={day.id} value={day.id}>{day.title.split('—')[0]}</option>
          ))}
        </select>
        <button
          type="submit"
          style={{ padding: '10px 18px', background: '#27ae60', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          Add Item
        </button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {TRIP_DAYS.map((day) => {
          const isExpanded = activeDay === day.id;
          const dayItems = items.filter(item => item.dayId === day.id);

          return (
            <div
              key={day.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '12px',
                overflow: 'hidden',
                background: '#ffffff',
                boxShadow: isExpanded ? '0 4px 12px rgba(0,0,0,0.06)' : 'none'
              }}
            >
              <div
                onClick={() => setActiveDay(isExpanded ? null : day.id)}
                style={{
                  padding: '16px 20px',
                  background: isExpanded ? '#f8f9fa' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  borderBottom: isExpanded ? '1px solid #eee' : 'none'
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#2c3e50' }}>{day.title}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#7f8c8d' }}>{day.subtitle}</p>
                </div>
                <span style={{ fontSize: '1.2rem', color: '#7f8c8d' }}>{isExpanded ? '▲' : '▼'}</span>
              </div>

              {isExpanded && (
                <div style={{ padding: '20px' }}>
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', color: '#34495e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Itinerary</h4>
                    <ul style={{ margin: 0, paddingLeft: '20px', color: '#444', lineHeight: '1.6', fontSize: '0.95rem' }}>
                      {day.schedule.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ marginBottom: '24px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd' }}>
                    <iframe
                      title={day.title}
                      src={day.mapUrl}
                      width="100%"
                      height="220"
                      style={{ border: 0 }}
                      allowFullScreen=""
                      loading="lazy"
                    ></iframe>
                  </div>

                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: '0.95rem', color: '#34495e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Tasks & Packing ({dayItems.filter(i => i.completed).length}/{dayItems.length})
                    </h4>

                    {dayItems.length === 0 ? (
                      <p style={{ fontSize: '0.88rem', color: '#999', fontStyle: 'italic' }}>No items added for this day yet.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {dayItems.map((item) => (
                          <div
                            key={item.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justify: 'space-between',
                              padding: '10px 12px',
                              background: item.completed ? '#f9f9f9' : '#fff',
                              border: '1px solid #eee',
                              borderRadius: '8px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                              <input
                                type="checkbox"
                                checked={item.completed}
                                onChange={() => toggleItemComplete(item.id)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                              <span style={{
                                textDecoration: item.completed ? 'line-through' : 'none',
                                color: item.completed ? '#888' : '#2c3e50',
                                fontSize: '0.95rem'
                              }}>
                                {item.text}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button
                                onClick={() => toggleAssignee(item.id)}
                                title="Assign to srinivas (V) or Sravanthi (S)"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: '1px solid #ccc',
                                  background: item.assignedTo === 'V' ? '#3498db' : item.assignedTo === 'S' ? '#e74c3c' : '#eee',
                                  color: item.assignedTo ? '#fff' : '#666',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold',
                                  cursor: 'pointer'
                                }}
                              >
                                {item.assignedTo || '—'}
                              </button>

                              <select
                                value={item.dayId}
                                onChange={(e) => moveItemDay(item.id, e.target.value)}
                                style={{ fontSize: '0.8rem', padding: '4px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff' }}
                              >
                                {TRIP_DAYS.map(d => (
                                  <option key={d.id} value={d.id}>Move to {d.title.split('—')[0]}</option>
                                ))}
                              </select>

                              <button
                                onClick={() => deleteItem(item.id)}
                                style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}
                                title="Delete item"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

ReactDOM.render(<App />, document.getElementById('root'));
