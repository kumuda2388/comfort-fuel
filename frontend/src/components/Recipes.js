import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function Recipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "";
    return `$${num.toFixed(2)}`;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const snap = await getDocs(collection(db, "recipes"));
        const list = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || d.data().name || "Recipe",
          description: d.data().description || d.data().desc || "",
          image: d.data().image || d.data().imageUrl || "",
          sizes: d.data().sizes || { small: "", medium: "", large: "" },
          ingredients: d.data().ingredients || [],
        }));
        setRecipes(list);
      } catch (err) {
        setError("Failed to load recipes");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div>
      <h1>Recipes</h1>
      {loading && <p>Loading recipes...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div className="recipes-grid">
        {recipes.map((r) => (
          <div className="card" key={r.id} style={{ marginBottom: "1rem" }}>
            <div style={{ fontWeight: 600 }}>{r.title}</div>
            <div style={{ color: "#4b5563", marginTop: 4 }}>{r.description}</div>
            {r.image && (
              <div style={{ marginTop: 8 }}>
                <img src={r.image} alt={r.name} style={{ maxWidth: "100%", borderRadius: 8 }} />
              </div>
            )}
            <div style={{ marginTop: 8, fontWeight: 600 }}>
              {["small", "medium", "large"]
                .filter((key) => r.sizes?.[key] !== undefined && r.sizes?.[key] !== "")
                .map((key) => `${key}: ${formatPrice(r.sizes[key])}`)
                .join("  ")}
            </div>
            {r.ingredients && r.ingredients.length > 0 && (
              <div style={{ marginTop: 8, color: "#4b5563" }}>
                <strong>Ingredients:</strong>{" "}
                {r.ingredients
                  .map((ing) => {
                    const base = `${ing.name || "Item"} (${ing.amount || ""})`;
                    return ing.customizable ? `${base}*` : base;
                  })
                  .join(", ")}
              </div>
            )}
          </div>
        ))}
        {!loading && !recipes.length && <p>No recipes yet.</p>}
      </div>
    </div>
  );
}

export default Recipes;
