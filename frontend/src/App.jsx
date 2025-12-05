import { useEffect, useState } from "react";
import "./styles.css";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from "firebase/auth";
import { collection, getDocs, addDoc, updateDoc, doc, setDoc, getDoc } from "firebase/firestore";

export default function App() {
  const [section, setSection] = useState("home");
  const [darkMode, setDarkMode] = useState(false);
  const [notify, setNotify] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  const [meals, setMeals] = useState([]);
  const [mealName, setMealName] = useState("");
  const [mealDesc, setMealDesc] = useState("");
  const [mealPrice, setMealPrice] = useState("");
  const [editId, setEditId] = useState(null);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [mealsError, setMealsError] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  const orders = [
    { id: "#1024", items: "Chicken Biryani", status: "Pending", total: "$10.99" },
    { id: "#1023", items: "Vegetable Curry", status: "Accepted", total: "$9.50" },
    { id: "#1022", items: "Lentil Soup & Bread", status: "Ready", total: "$7.25" },
  ];

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);
      if (u) {
        setEmail(u.email || "");
        const profile = await ensureVendorProfile(u);
        setProfileName(profile.username || u.displayName || u.email || "Vendor");
        setProfileEmail(profile.email || u.email || "");
        loadMeals();
      } else {
        setMeals([]);
        setProfileName("");
        setProfileEmail("");
      }
    });
    return () => unsub();
  }, []);

  const navClass = (id) => `nav-link ${section === id ? "active" : ""}`;
  const show = (id) => `page-section ${section === id ? "active" : ""}`;

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError("");
    try {
      if (authMode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (username) {
          await updateProfile(cred.user, { displayName: username });
        }
        await setDoc(doc(db, "vendors", cred.user.uid), { username, email });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setSection("home");
  }

  async function loadMeals() {
    setMealsLoading(true);
    setMealsError("");
    try {
      const snap = await getDocs(collection(db, "meals"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setMeals(list);
    } catch (err) {
      setMealsError("Failed to load meals");
    } finally {
      setMealsLoading(false);
    }
  }

  async function handleMealSubmit(e) {
    e.preventDefault();
    setMealsError("");
    try {
      if (editId) {
        await updateDoc(doc(db, "meals", editId), {
          name: mealName,
          desc: mealDesc,
          price: mealPrice,
        });
      } else {
        await addDoc(collection(db, "meals"), {
          name: mealName,
          desc: mealDesc,
          price: mealPrice,
        });
      }
      setMealName("");
      setMealDesc("");
      setMealPrice("");
      setEditId(null);
      loadMeals();
    } catch (err) {
      setMealsError("Failed to save meal");
    }
  }

  function startEdit(meal) {
    setEditId(meal.id);
    setMealName(meal.name || "");
    setMealDesc(meal.desc || "");
    setMealPrice(meal.price || "");
    setSection("meals");
  }

  async function ensureVendorProfile(currentUser) {
    try {
      const ref = doc(db, "vendors", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data();
      const fallbackName = currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "Vendor");
      const data = { username: fallbackName, email: currentUser.email || "" };
      await setDoc(ref, data);
      return data;
    } catch (err) {
      return { username: currentUser.displayName || currentUser.email || "Vendor", email: currentUser.email || "" };
    }
  }

  if (authLoading) return <div style={{ padding: 24 }}>Loading...</div>;

  if (!user) {
    return (
      <div className="auth-container">
        <div className="logo" style={{ marginBottom: 10 }}>
          <div className="logo-title">Comfort Fuel 🍱</div>
          <div className="logo-sub">Vendor</div>
        </div>
        <p className="subtitle" style={{ marginBottom: 10 }}>
          Sign up or log in to manage meals, orders, chats, and analytics.
        </p>
        <div className="auth-tabs">
          <button
            className={`auth-tab ${authMode === "login" ? "active" : ""}`}
            onClick={() => setAuthMode("login")}
          >
            Login
          </button>
          <button
            className={`auth-tab ${authMode === "signup" ? "active" : ""}`}
            onClick={() => setAuthMode("signup")}
          >
            Sign Up
          </button>
        </div>
        <div className="card">
          <form className="stack-vert" onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <input
                type="text"
                placeholder="Username (Sign Up)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="input-row">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="toggle-btn"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <button className="btn-primary" type="submit">
              {authMode === "signup" ? "Sign Up" : "Sign In"}
            </button>
          </form>
          {authError && <p className="error-text">{authError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-title">Comfort Fuel 🍱</div>
          <div className="logo-sub">Vendor</div>
        </div>
        <ul className="nav">
          <li><a className={navClass("home")} onClick={(e)=>{e.preventDefault();setSection("home");}}>Home</a></li>
          <li><a className={navClass("meals")} onClick={(e)=>{e.preventDefault();setSection("meals");}}>Meals</a></li>
          <li><a className={navClass("orders")} onClick={(e)=>{e.preventDefault();setSection("orders");}}>Orders</a></li>
          <li><a className={navClass("chats")} onClick={(e)=>{e.preventDefault();setSection("chats");}}>Chats</a></li>
          <li><a className={navClass("analytics")} onClick={(e)=>{e.preventDefault();setSection("analytics");}}>Analytics</a></li>
          <li><a className={navClass("profile")} onClick={(e)=>{e.preventDefault();setSection("profile");}}>Profile</a></li>
        </ul>
      </aside>

      <main className="main">
        <section id="home" className={show("home")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title" id="welcome">Welcome, {profileName || "Vendor"}</h1>
            <p className="subtitle">Manage your menu, orders, and customer chats.</p>
          </div>
          <div className="metrics">
            <div className="metric-card"><div className="metric-label">Orders today</div><div className="metric-value" id="metric-orders">--</div></div>
            <div className="metric-card"><div className="metric-label">Revenue today</div><div className="metric-value" id="metric-revenue">$--</div></div>
            <div className="metric-card"><div className="metric-label">Live chats</div><div className="metric-value" id="metric-chats">--</div></div>
            <div className="metric-card"><div className="metric-label">Top meal (7d)</div><div className="metric-value" id="metric-top">--</div></div>
          </div>
        </section>

        <section id="meals" className={show("meals")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">Meals 🍲</h1>
            <p className="subtitle">Create and edit your menu items.</p>
          </div>
          <div className="card">
            <div className="flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <h3>Meals</h3>
              <span className="badge badge-accepted">Menu</span>
            </div>
            {mealsLoading && <p className="subtitle">Loading meals...</p>}
            {mealsError && <p className="error-text">{mealsError}</p>}
            <div id="meals-list">
              {meals.map((m) => (
                <div className="card" key={m.id}>
                  <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="meal-name" style={{ fontSize: "1rem" }}>{m.name}</div>
                      <div className="meal-desc">{m.desc}</div>
                      <div className="meal-price" style={{ marginTop: 6 }}>${m.price}</div>
                    </div>
                    <button className="btn-secondary" type="button" onClick={() => startEdit(m)}>Edit</button>
                  </div>
                </div>
              ))}
            </div>
            <h4 style={{ marginTop: 18 }}>{editId ? "Edit Meal" : "Add Meal"}</h4>
            <form className="stack-vert" onSubmit={handleMealSubmit}>
              <input
                placeholder="Meal name"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description"
                value={mealDesc}
                onChange={(e) => setMealDesc(e.target.value)}
                required
              ></textarea>
              <input
                type="number"
                step="0.01"
                placeholder="Price"
                value={mealPrice}
                onChange={(e) => setMealPrice(e.target.value)}
                required
              />
              <div className="flex" style={{ gap: 10 }}>
                <button className="btn-primary" type="submit">Save Meal</button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setMealName("");
                    setMealDesc("");
                    setMealPrice("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>

        <section id="orders" className={show("orders")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">My Orders</h1>
            <p className="subtitle">Track incoming orders and status🧾</p>
          </div>
          <div className="card">
            <div className="flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <span className="badge badge-pending">Live</span>
            </div>
            <table className="table">
              <thead><tr><th>ID</th><th>Items</th><th>Status</th><th>Total</th><th>Action</th></tr></thead>
              <tbody id="orders-body">
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.items}</td>
                    <td>{o.status}</td>
                    <td>{o.total}</td>
                    <td><button className="btn-secondary" type="button">Update</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section id="chats" className={show("chats")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">My Chats</h1>
            <p className="subtitle">Conversations with customers 💬</p>
          </div>
          <div className="card">
            <p className="subtitle">placeholder</p>
          </div>
        </section>

        <section id="analytics" className={show("analytics")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">My Analytics</h1>
            <p className="subtitle">Performance and trends 📈</p>
          </div>
          <div className="card">
            <p className="subtitle">placeholder</p>
          </div>
        </section>

        <section id="profile" className={show("profile")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">Profile & Settings</h1>
            <p className="subtitle">Your account preferences 🌸</p>
          </div>
          <div className="card">
            <div className="field-label">Name</div>
            <div className="field-value">{profileName || "—"}</div>

            <div className="field-label">Email</div>
            <div className="field-value">{profileEmail || "—"}</div>

            <div className="toggle-row">
              <span>Dark Mode 🌙</span>
              <div
                className={`fake-toggle ${darkMode ? "on" : ""}`}
                onClick={() => setDarkMode(!darkMode)}
                role="button"
              ></div>
            </div>

            <div className="toggle-row">
              <span>Order Notifications 🔔</span>
              <div
                className={`fake-toggle ${notify ? "on" : ""}`}
                onClick={() => setNotify(!notify)}
                role="button"
              ></div>
            </div>

            <button className="logout-btn" type="button" onClick={handleLogout}>Logout</button>
          </div>
        </section>
      </main>
    </div>
  );
}
