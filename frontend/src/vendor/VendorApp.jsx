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
  deleteDoc,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { FaHome, FaUtensils, FaClipboardList, FaComments, FaUser, FaSignOutAlt } from "react-icons/fa";

export default function VendorApp() {
  const [section, setSection] = useState("home");
  const formRef = useRef(null);
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const [darkMode, setDarkMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
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
  const [chatThreads, setChatThreads] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState("");
  const [selectedChatName, setSelectedChatName] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const chatUnsubRef = useRef(null);
  const [vendorOrders, setVendorOrders] = useState([]);
  const [vendorOrdersLoading, setVendorOrdersLoading] = useState(true);
  const [vendorOrdersError, setVendorOrdersError] = useState("");

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

  // Subscribe to all customer chat threads for vendor view
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "chats"), async (snap) => {
      const threads = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const messages = data.messages || [];
          const last = messages[messages.length - 1];
          let name = d.id;
          try {
            const userSnap = await getDoc(doc(db, "users", d.id));
            if (userSnap.exists()) {
              const u = userSnap.data();
              name =
                u.first_name ||
                u.name ||
                u.displayName ||
                u.googleDisplayName ||
                d.id;
            }
          } catch (err) {
            // ignore lookup errors, fallback to id
          }
          return {
            id: d.id,
            name,
            lastMessage: last?.message || "",
            lastTimestamp: last?.createdAt || null,
          };
        })
      );

      const toMillis = (ts) => {
        if (!ts) return 0;
        if (ts.toDate) return ts.toDate().getTime();
        return new Date(ts).getTime();
      };

      threads.sort((a, b) => toMillis(b.lastTimestamp) - toMillis(a.lastTimestamp));
      setChatThreads(threads);

      // reset selection if the selected chat disappeared
      if (selectedChatId && !threads.find((t) => t.id === selectedChatId)) {
        setSelectedChatId("");
        setChatMessages([]);
      }
    });

    return () => unsub();
  }, [selectedChatId]);

  // Subscribe to customer orders (flattened)
  useEffect(() => {
    setVendorOrdersLoading(true);
    const unsub = onSnapshot(
      collection(db, "orders"),
      async (snap) => {
        const allOrders = [];
        await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const ordersArr = data.orders || [];
            let customerName = d.id;
            try {
              const userSnap = await getDoc(doc(db, "users", d.id));
              if (userSnap.exists()) {
                const u = userSnap.data();
                customerName =
                  u.first_name ||
                  u.name ||
                  u.displayName ||
                  u.googleDisplayName ||
                  d.id;
              }
            } catch (err) {
              customerName = d.id;
            }

            ordersArr.forEach((order, idx) => {
              allOrders.push({
                ...order,
                userId: d.id,
                customerName,
                orderIndex: idx,
              });
            });
          })
        );
        const toMillis = (o) => {
          const ts = o.createdAt;
          if (!ts) return 0;
          if (ts.toDate) return ts.toDate().getTime();
          return new Date(ts).getTime();
        };
        allOrders.sort((a, b) => toMillis(b) - toMillis(a));
        setVendorOrders(allOrders);
        setVendorOrdersLoading(false);
        setVendorOrdersError("");
      },
      (err) => {
        setVendorOrdersError("Failed to load orders");
        setVendorOrdersLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to a specific conversation when selected
  useEffect(() => {
    if (chatUnsubRef.current) {
      chatUnsubRef.current();
    }
    if (!selectedChatId) {
      setChatMessages([]);
      setSelectedChatName("");
      return undefined;
    }

    const chatRef = doc(db, "chats", selectedChatId);
    chatUnsubRef.current = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const msgs = (data.messages || []).slice().sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
          const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
          return ta - tb;
        });
        setChatMessages(msgs);
      } else {
        setChatMessages([]);
      }
    });

    return () => {
      if (chatUnsubRef.current) {
        chatUnsubRef.current();
      }
    };
  }, [selectedChatId]);

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
      const sorted = list.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", undefined, { sensitivity: "base" })
      );
      setRecipes(sorted);
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
      if (editId) {
        setEditId(null);
      } else {
        setShowAddForm(false);
      }
      loadRecipes();
    } catch (err) {
      setRecipesError("Failed to save recipe");
    }
  }

  function startEdit(recipe) {
    setShowAddForm(false);
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
  }

  async function handleDeleteRecipe(id) {
    if (!id) return;
    const confirmDelete = window.confirm("Delete this recipe?");
    if (!confirmDelete) return;
    setRecipesError("");
    try {
      await deleteDoc(doc(db, "recipes", id));
      if (editId === id) {
        setEditId(null);
        setRecipeTitle("");
        setRecipeDesc("");
        setRecipeImage("");
        setSizes({ small: "", medium: "", large: "" });
        setIngredients([{ name: "", amount: "", customizable: false }]);
      }
      await loadRecipes();
    } catch (err) {
      setRecipesError("Failed to delete recipe");
    }
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

  function handleSelectChat(thread) {
    setSelectedChatId(thread.id);
    setSelectedChatName(thread.name || thread.id);
    setChatInput("");
  }

  async function sendVendorMessage() {
    if (!selectedChatId || !chatInput.trim()) return;
    const chatRef = doc(db, "chats", selectedChatId);
    const message = {
      sender: "vendor",
      message: chatInput.trim(),
      createdAt: new Date(),
    };
    const snap = await getDoc(chatRef);
    if (snap.exists()) {
      await updateDoc(chatRef, {
        messages: arrayUnion(message),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(chatRef, {
        messages: [message],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    setChatInput("");
  }

  async function sendOrderMessage(userId, text) {
    if (!text || !text.trim()) return;
    const chatRef = doc(db, "chats", userId);
    const message = {
      sender: "vendor",
      message: text.trim(),
      createdAt: new Date(),
    };
    const snap = await getDoc(chatRef);
    if (snap.exists()) {
      await updateDoc(chatRef, {
        messages: arrayUnion(message),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(chatRef, {
        messages: [message],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  }

  async function updateOrderStatus(userId, orderIndex, status, messageText) {
    try {
      const ref = doc(db, "orders", userId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const data = snap.data();
      const ordersArr = data.orders || [];
      if (!ordersArr[orderIndex]) return;
      ordersArr[orderIndex] = {
        ...ordersArr[orderIndex],
        status,
        updatedAt: new Date(),
      };
      await updateDoc(ref, { orders: ordersArr });
      await sendOrderMessage(userId, messageText);
    } catch (err) {
      setVendorOrdersError("Failed to update order status");
    }
  }

  function handleVendorKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendVendorMessage();
    }
  }

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
              <FaHome className="nav-icon" />
              <span>Home</span>
            </a>
          </li>
          <li>
            <a className={navClass("recipes")} onClick={(e) => { e.preventDefault(); setSection("recipes"); }}>
              <FaUtensils className="nav-icon" />
              <span>Recipes</span>
            </a>
          </li>
          <li>
            <a className={navClass("orders")} onClick={(e) => { e.preventDefault(); setSection("orders"); }}>
              <FaClipboardList className="nav-icon" />
              <span>Orders</span>
            </a>
          </li>
          <li>
            <a className={navClass("chats")} onClick={(e) => { e.preventDefault(); setSection("chats"); }}>
              <FaComments className="nav-icon" />
              <span>Chats</span>
            </a>
          </li>
          <li>
            <a className={navClass("profile")} onClick={(e) => { e.preventDefault(); setSection("profile"); }}>
              <FaUser className="nav-icon" />
              <span>Profile & Settings</span>
            </a>
          </li>
          <li className="nav-logout">
            <button className="nav-link" type="button" onClick={handleLogout}>
              <FaSignOutAlt className="nav-icon" />
              <span>Logout</span>
            </button>
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
            <h1 className="page-title">My Recipes</h1>
            <p className="subtitle">Create and edit your menu items.</p>
          </div>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 10 }}>
              <button
                className="btn-primary"
                type="button"
                onClick={() => {
                  setEditId(null);
                  setRecipeTitle("");
                  setRecipeDesc("");
                  setRecipeImage("");
                  setSizes({ small: "", medium: "", large: "" });
                  setIngredients([{ name: "", amount: "", customizable: false }]);
                  setShowAddForm((v) => !v);
                }}
              >
                {showAddForm ? "Close" : "Add Recipe"}
              </button>
            </div>
            {recipesLoading && <p className="subtitle">Loading recipes...</p>}
            {recipesError && <p className="error-text">{recipesError}</p>}
            {!editId && showAddForm && (
              <>
                <h4 style={{ marginTop: 10, marginBottom: 10 }}>Add Recipe</h4>
                <form
                  className="stack-vert"
                  onSubmit={handleRecipeSubmit}
                  ref={formRef}
                  style={{ marginBottom: 16 }}
                >
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
                        setShowAddForm(false);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </>
            )}
            <div className="recipes-content">
              <div id="recipes-list" className="recipes-list">
                <div className="alpha-nav">
                  {alphabet.map((letter) => (
                    <a key={letter} href={`#letter-${letter}`}>
                      {letter}
                    </a>
                  ))}
                </div>

                {alphabet.map((letter) => {
                  const grouped = recipes.filter(
                    (r) =>
                      (r.title || "")
                        .trim()
                        .charAt(0)
                        .toUpperCase() === letter
                  );
                  return (
                    <div key={letter} id={`letter-${letter}`} className="alpha-group">
                      <div className="alpha-header">{letter}</div>
                      {grouped.length === 0 ? (
                        <div className="meal-desc" style={{ marginBottom: 8 }}>No recipes</div>
                      ) : (
                        grouped.map((m) => (
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
                                <div style={{ height: 8 }} />
                              </div>
                              <div className="flex" style={{ gap: 8 }}>
                                <button className="btn-secondary" type="button" onClick={() => startEdit(m)}>
                                  Edit
                                </button>
                                <button className="btn-secondary" type="button" onClick={() => handleDeleteRecipe(m.id)}>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>

              {editId && (
                <div className="card edit-panel">
                  <h4>Edit Recipe</h4>
                  <form className="stack-vert" onSubmit={handleRecipeSubmit}>
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
                      <button className="btn-primary" type="submit">Update Recipe</button>
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
                          setShowAddForm(false);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </section>

        <section id="orders" className={show("orders")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">My Orders</h1>
            <p className="subtitle">Track incoming orders and status.</p>
          </div>
          <div className="card orders-card">
            {vendorOrdersLoading && <p className="subtitle">Loading orders...</p>}
            {vendorOrdersError && <p className="error-text">{vendorOrdersError}</p>}
            {!vendorOrdersLoading && vendorOrders.length === 0 && (
              <p className="subtitle">No orders yet.</p>
            )}
            {vendorOrders.length > 0 && (
              <table className="table orders-table">
                <thead>
                  <tr><th>Date</th><th>Customer</th><th>Items</th><th>Status</th><th>Total</th><th>Action</th></tr>
                </thead>
                <tbody id="orders-body">
                  {vendorOrders.map((o, idx) => {
                    const rawStatus = o.status;
                    const status = rawStatus === "ordered" || !rawStatus ? "Pending" : rawStatus;
                    const created =
                      o.createdAt?.toDate
                        ? o.createdAt.toDate().toLocaleString()
                        : o.createdAt
                        ? new Date(o.createdAt).toLocaleString()
                        : "-";
                    const totalVal = o.total || 0;
                    return (
                      <tr key={`${o.userId}-${o.orderIndex}-${idx}`}>
                        <td>{created}</td>
                        <td>{o.customerName || o.userId}</td>
                        <td>
                          {Array.isArray(o.items) && o.items.length > 0 ? (
                            o.items.map((item, iidx) => (
                              <div key={iidx} className="meal-desc">
                                <strong>{item.title || item.name || item.recipeTitle || "Item"}</strong>{" "}
                                {item.size ? `(${item.size})` : ""} x {item.quantity || 1}
                              </div>
                            ))
                          ) : typeof o.items === "string" ? (
                            <div className="meal-desc">{o.items}</div>
                          ) : (
                            <div className="meal-desc">No items</div>
                          )}
                        </td>
                        <td>{status}</td>
                        <td>${Number(totalVal).toFixed ? Number(totalVal).toFixed(2) : totalVal}</td>
                        <td>
                          <div className="flex" style={{ gap: 6 }}>
                            <button
                              className="btn-primary"
                              type="button"
                              disabled={status === "Accepted"}
                              onClick={() => {
                                const msg = window.prompt("Send a message to the customer? (optional)", "");
                                updateOrderStatus(o.userId, o.orderIndex, "Accepted", msg);
                              }}
                            >
                              Accept
                            </button>
                            <button
                              className="btn-secondary"
                              type="button"
                              disabled={status === "Rejected"}
                              onClick={() => {
                                const msg = window.prompt("Send a message to the customer? (optional)", "");
                                updateOrderStatus(o.userId, o.orderIndex, "Rejected", msg);
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section id="chats" className={show("chats")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">My Chats</h1>
            <p className="subtitle">Conversations with customers.</p>
          </div>
          <div className="card" style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, minHeight: "420px" }}>
            <div style={{ borderRight: "1px solid #e5e7eb", paddingRight: 12, overflowY: "auto" }}>
              <h4 style={{ marginBottom: 10 }}>Customers</h4>
              {chatThreads.length === 0 && <p className="subtitle">No chats yet.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {chatThreads.map((thread) => (
                  <button
                    key={thread.id}
                    className={`card ${selectedChatId === thread.id ? "active" : ""}`}
                    style={{
                      padding: 12,
                      textAlign: "left",
                      cursor: "pointer",
                      background: selectedChatId === thread.id ? "#eef2ff" : "#fff",
                      borderColor: selectedChatId === thread.id ? "#4a90e2" : "#e5e7eb",
                    }}
                    onClick={() => handleSelectChat(thread)}
                  >
                    <div className="meal-name" style={{ fontSize: "0.95rem" }}>{thread.name}</div>
                    <div className="meal-desc" style={{ marginTop: 4 }}>{thread.lastMessage || "No messages yet"}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="card" style={{ flex: 1, overflowY: "auto" }}>
                <div className="flex" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <h4 style={{ margin: 0 }}>{selectedChatName || "Select a conversation"}</h4>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} style={{ textAlign: msg.sender === "vendor" ? "right" : "left" }}>
                      <div
                        style={{
                          display: "inline-block",
                          background: msg.sender === "vendor" ? "#4a90e2" : "#e5e7eb",
                          color: msg.sender === "vendor" ? "#fff" : "#111827",
                          padding: "8px 12px",
                          borderRadius: 12,
                          maxWidth: "80%",
                        }}
                      >
                        {msg.message}
                      </div>
                      <div style={{ fontSize: "11px", color: "#6b7280" }}>
                        {msg.createdAt?.toDate
                          ? msg.createdAt.toDate().toLocaleString()
                          : new Date(msg.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {chatMessages.length === 0 && <p className="subtitle">No messages</p>}
                </div>
              </div>
              <div className="flex" style={{ display: "flex", gap: 8, flexWrap: "nowrap", alignItems: "center" }}>
                <input
                  className="input"
                  style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #e5e7eb" }}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={selectedChatId ? "Type a message..." : "Select a chat to start messaging"}
                  onKeyDown={handleVendorKeyDown}
                  disabled={!selectedChatId}
                />
                <button
                  className="btn-primary"
                  type="button"
                  style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
                  onClick={sendVendorMessage}
                  disabled={!selectedChatId || !chatInput.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="profile" className={show("profile")}>
          <div style={{ marginBottom: 16 }}>
            <h1 className="page-title">Profile & Settings</h1>
            <p className="subtitle">Your account preferences.</p>
          </div>
          <div className="card">
            <div className="field-label">Name</div>
            <div className="field-value">{profileName || "Vendor"}</div>

            <div className="field-label">Email</div>
            <div className="field-value">{profileEmail || "Not provided"}</div>

            <div className="toggle-row">
              <span>Dark Mode</span>
              <div
                className={`fake-toggle ${darkMode ? "on" : ""}`}
                onClick={() => setDarkMode(!darkMode)}
                role="button"
              ></div>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}
