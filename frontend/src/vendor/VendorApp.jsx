import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./vendorStyles.css";
import { auth, db, googleProvider } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  signInWithPopup,
} from "firebase/auth";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

export default function VendorApp() {
  const [section, setSection] = useState("home");
  const formRef = useRef(null);
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

  const [recipes, setRecipes] = useState([]);
  const [recipeTitle, setRecipeTitle] = useState("");
  const [recipeDesc, setRecipeDesc] = useState("");
  const [recipeImage, setRecipeImage] = useState("");
  const [sizes, setSizes] = useState({ small: "", medium: "", large: "" });
  const [ingredients, setIngredients] = useState([
    { name: "", amount: "", customizable: false },
  ]);
  const [editId, setEditId] = useState(null);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipesError, setRecipesError] = useState("");

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
        loadRecipes();
      } else {
        setRecipes([]);
        setProfileName("");
        setProfileEmail("");
      }
    });
    return () => unsub();
  }, []);

  // Sync dark mode with body and localStorage so theme persists across routes
  useEffect(() => {
    const saved = localStorage.getItem("darkMode") === "true";
    setDarkMode(saved);
    if (saved) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    localStorage.setItem("darkMode", darkMode ? "true" : "false");
  }, [darkMode]);

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

  async function handleGoogleLogin() {
    setAuthError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureVendorProfile(result.user);
    } catch (err) {
      setAuthError(err.message);
    }
  }

  async function handleLogout() {
    await signOut(auth);
    setSection("home");
  }

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return `$${num.toFixed(2)}`;
  };

  async function loadRecipes() {
    setRecipesLoading(true);
    setRecipesError("");
    try {
      const snap = await getDocs(collection(db, "recipes"));
      const list = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title || d.data().name || "",
        description: d.data().description || d.data().desc || "",
        image: d.data().image || d.data().imageUrl || "",
        sizes: d.data().sizes || { small: "", medium: "", large: "" },
        ingredients: d.data().ingredients || [],
      }));
      setRecipes(list);
    } catch (err) {
      setRecipesError("Failed to load recipes");
    } finally {
      setRecipesLoading(false);
    }
  }

  async function handleRecipeSubmit(e) {
    e.preventDefault();
    setRecipesError("");
    try {
      const docData = {
        title: recipeTitle,
        description: recipeDesc,
        image: recipeImage,
        sizes: {
          small: sizes.small !== "" ? Number(sizes.small) : "",
          medium: sizes.medium !== "" ? Number(sizes.medium) : "",
          large: sizes.large !== "" ? Number(sizes.large) : "",
        },
        ingredients: ingredients
          .filter((ing) => ing.name || ing.amount)
          .map((ing) => ({
            name: ing.name || "",
            amount: ing.amount || "",
            customizable: !!ing.customizable,
          })),
      };

      if (editId) {
        await updateDoc(doc(db, "recipes", editId), docData);
      } else {
        await addDoc(collection(db, "recipes"), docData);
      }
      setRecipeTitle("");
      setRecipeDesc("");
      setRecipeImage("");
      setSizes({ small: "", medium: "", large: "" });
      setIngredients([{ name: "", amount: "", customizable: false }]);
      setEditId(null);
      loadRecipes();
    } catch (err) {
      setRecipesError("Failed to save recipe");
    }
  }

  function startEdit(recipe) {
    setEditId(recipe.id);
    setRecipeTitle(recipe.title || "");
    setRecipeDesc(recipe.description || "");
    setRecipeImage(recipe.image || "");
    setSizes({
      small: recipe.sizes?.small ?? "",
      medium: recipe.sizes?.medium ?? "",
      large: recipe.sizes?.large ?? "",
    });
    setIngredients(
      recipe.ingredients && recipe.ingredients.length
        ? recipe.ingredients.map((ing) => ({
            name: ing.name || "",
            amount: ing.amount || "",
            customizable: !!ing.customizable,
          }))
        : [{ name: "", amount: "", customizable: false }]
    );
    setSection("recipes");
    // scroll to form for quick editing
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  async function ensureVendorProfile(currentUser) {
    try {
      const ref = doc(db, "vendors", currentUser.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) return snap.data();
      const fallbackName =
        currentUser.displayName ||
        (currentUser.email ? currentUser.email.split("@")[0] : "Vendor");
      const data = { username: fallbackName, email: currentUser.email || "" };
      await setDoc(ref, data);
      return data;
    } catch (err) {
      return {
        username: currentUser.displayName || currentUser.email || "Vendor",
        email: currentUser.email || "",
      };
    }
  }

  if (authLoading) return <div style={{ padding: 24 }}>Loading...</div>;

  if (!user) {
    return (
      <div className="auth-container">
        <div className="logo" style={{ marginBottom: 10 }}>
          <div className="logo-title">Comfort Fuel</div>
          <div className="logo-sub">Vendor Portal</div>
        </div>
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
          <button className="btn-google" type="button" onClick={handleGoogleLogin} style={{ width: "100%", marginTop: 10 }}>
            Continue with Google
          </button>
          <p style={{ marginTop: 12 }}>
            Forgot your password?{" "}
            <Link className="portal-link" to="/change-password">
              Change password
            </Link>
          </p>
          <p style={{ marginTop: 12 }}>
            Are you a customer?{" "}
            <Link className="portal-link" to="/login">
              Go to customer portal
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-title">Comfort Fuel</div>
          <div className="logo-sub">Vendor</div>
        </div>
        <ul className="nav">
          <li>
            <a className={navClass("home")} onClick={(e) => { e.preventDefault(); setSection("home"); }}>
              Home
            </a>
          </li>
          <li>
            <a className={navClass("recipes")} onClick={(e) => { e.preventDefault(); setSection("recipes"); }}>
              Recipes
            </a>
          </li>
          <li>
            <a className={navClass("orders")} onClick={(e) => { e.preventDefault(); setSection("orders"); }}>
              Orders
            </a>
          </li>
          <li>
            <a className={navClass("chats")} onClick={(e) => { e.preventDefault(); setSection("chats"); }}>
              Chats
            </a>
          </li>
          <li>
            <a className={navClass("analytics")} onClick={(e) => { e.preventDefault(); setSection("analytics"); }}>
              Analytics
            </a>
          </li>
          <li>
            <a className={navClass("profile")} onClick={(e) => { e.preventDefault(); setSection("profile"); }}>
              Profile
            </a>
          </li>
        </ul>
      </aside>

      <main className="main">
        <section id="home" className={show("home")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title" id="welcome">
              Welcome, {profileName || "Vendor"}
            </h1>
            <p className="subtitle">Manage your menu, orders, and customer chats.</p>
          </div>
          <div className="metrics">
            <div className="metric-card">
              <div className="metric-label">Orders today</div>
              <div className="metric-value" id="metric-orders">--</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Revenue today</div>
              <div className="metric-value" id="metric-revenue">$--</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Live chats</div>
              <div className="metric-value" id="metric-chats">--</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Top meal (7d)</div>
              <div className="metric-value" id="metric-top">--</div>
            </div>
          </div>
        </section>

        <section id="recipes" className={show("recipes")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">Recipes</h1>
            <p className="subtitle">Create and edit your menu items.</p>
          </div>
          <div className="card">
            <div className="flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <h3>Recipes</h3>
              <span className="badge badge-accepted">Menu</span>
            </div>
            {recipesLoading && <p className="subtitle">Loading recipes...</p>}
            {recipesError && <p className="error-text">{recipesError}</p>}
            <div id="recipes-list">
              {recipes.map((m) => (
                <div className="card" key={m.id}>
                  <div className="flex" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div className="meal-name" style={{ fontSize: "1rem" }}>{m.title}</div>
                      <div className="meal-desc">{m.description}</div>
                      {m.image && (
                        <div style={{ marginTop: 8 }}>
                          <img
                            src={m.image}
                            alt={m.name}
                            style={{
                              maxWidth: "100%",
                              maxHeight: "220px",
                              width: "100%",
                              height: "auto",
                              objectFit: "contain",
                              borderRadius: 8,
                            }}
                          />
                        </div>
                      )}
                      <div className="meal-desc" style={{ marginTop: 6 }}>
                        <strong>Sizes:</strong>{" "}
                        {["small", "medium", "large"]
                          .filter((key) => m.sizes?.[key] !== undefined && m.sizes?.[key] !== "")
                          .map((key) => `${key}: ${formatPrice(m.sizes[key])}`)
                          .join("  ")}
                      </div>
                      {m.ingredients && m.ingredients.length > 0 && (
                        <div className="meal-desc" style={{ marginTop: 6 }}>
                          <strong>Ingredients:</strong>{" "}
                          {m.ingredients
                            .map((ing) => {
                              const base = `${ing.name || "Item"} (${ing.amount || ""})`;
                              return ing.customizable ? `${base}*` : base;
                            })
                            .join(", ")}
                        </div>
                      )}
                    </div>
                    <button className="btn-secondary" type="button" onClick={() => startEdit(m)}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <h4 style={{ marginTop: 18 }}>{editId ? "Edit Recipe" : "Add Recipe"}</h4>
            <form className="stack-vert" onSubmit={handleRecipeSubmit} ref={formRef}>
              <input
                placeholder="Recipe title"
                value={recipeTitle}
                onChange={(e) => setRecipeTitle(e.target.value)}
                required
              />
              <textarea
                placeholder="Description"
                value={recipeDesc}
                onChange={(e) => setRecipeDesc(e.target.value)}
                required
              ></textarea>
              <input
                type="text"
                placeholder="Image URL (optional)"
                value={recipeImage}
                onChange={(e) => setRecipeImage(e.target.value)}
              />
              <div className="stack-vert">
                <label className="field-label">Sizes (price)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Small price"
                  value={sizes.small}
                  onChange={(e) => setSizes({ ...sizes, small: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Medium price"
                  value={sizes.medium}
                  onChange={(e) => setSizes({ ...sizes, medium: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Large price"
                  value={sizes.large}
                  onChange={(e) => setSizes({ ...sizes, large: e.target.value })}
                />
              </div>
              <div className="stack-vert">
                <div className="field-label">Ingredients</div>
                {ingredients.map((ing, idx) => (
                  <div className="card" key={idx} style={{ padding: 12, marginTop: 6 }}>
                    <input
                      placeholder="Name"
                      value={ing.name}
                      onChange={(e) => {
                        const next = [...ingredients];
                        next[idx].name = e.target.value;
                        setIngredients(next);
                      }}
                    />
                    <input
                      placeholder="Amount (e.g., 50g)"
                      value={ing.amount}
                      onChange={(e) => {
                        const next = [...ingredients];
                        next[idx].amount = e.target.value;
                        setIngredients(next);
                      }}
                    />
                    <div className="inline-checkbox">
                      <span>Customizable</span>
                      <input
                        type="checkbox"
                        checked={!!ing.customizable}
                        onChange={(e) => {
                          const next = [...ingredients];
                          next[idx].customizable = e.target.checked;
                          setIngredients(next);
                        }}
                      />
                    </div>
                    <div className="inline-remove">
                      <button
                        className="btn-secondary"
                        type="button"
                        onClick={() => {
                          const next = ingredients.filter((_, i) => i !== idx);
                          setIngredients(next.length ? next : [{ name: "", amount: "", customizable: false }]);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() =>
                    setIngredients([...ingredients, { name: "", amount: "", customizable: false }])
                  }
                  style={{ marginTop: 6 }}
                >
                  Add Ingredient
                </button>
              </div>
              <div className="flex" style={{ gap: 10 }}>
                <button className="btn-primary" type="submit">Save Recipe</button>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => {
                    setEditId(null);
                    setRecipeTitle("");
                    setRecipeDesc("");
                    setRecipeImage("");
                    setSizes({ small: "", medium: "", large: "" });
                    setIngredients([{ name: "", amount: "", customizable: false }]);
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
            <p className="subtitle">Track incoming orders and status.</p>
          </div>
          <div className="card">
            <div className="flex" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <span className="badge badge-pending">Live</span>
            </div>
            <table className="table">
              <thead>
                <tr><th>ID</th><th>Items</th><th>Status</th><th>Total</th><th>Action</th></tr>
              </thead>
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
            <p className="subtitle">Conversations with customers.</p>
          </div>
          <div className="card">
            <p className="subtitle">placeholder</p>
          </div>
        </section>

        <section id="analytics" className={show("analytics")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">My Analytics</h1>
            <p className="subtitle">Performance and trends.</p>
          </div>
          <div className="card">
            <p className="subtitle">placeholder</p>
          </div>
        </section>

        <section id="profile" className={show("profile")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">Profile & Settings</h1>
            <p className="subtitle">Your account preferences.</p>
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
