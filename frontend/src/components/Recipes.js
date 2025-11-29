import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { db, auth } from "../firebase";
import { FaShoppingCart } from "react-icons/fa";

function Recipes() {
  const user = auth.currentUser;
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState(null);
  const [size, setSize] = useState("medium");
  const [quantity, setQuantity] = useState(1);
  const [selectedIngredients, setSelectedIngredients] = useState([]);
  const [note, setNote] = useState("");

  // Load recipes from Firestore
  useEffect(() => {
    const fetchRecipes = async () => {
      const recipesCol = collection(db, "recipes");
      const recipeSnapshot = await getDocs(recipesCol);
      const recipeList = recipeSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(recipeList);
      setFilteredRecipes(recipeList);
    };

    fetchRecipes();
  }, []);

  // Update filtered recipes when filterText changes
  useEffect(() => {
    const filtered = recipes.filter(recipe =>
      recipe.title.toLowerCase().includes(filterText.toLowerCase()) ||
      recipe.description.toLowerCase().includes(filterText.toLowerCase())
    );
    setFilteredRecipes(filtered);
  }, [filterText, recipes]);

  const openModal = (recipe) => {
    setCurrentRecipe(recipe);
    setModalOpen(true);
    setSize("medium");
    setQuantity(1);
    setSelectedIngredients(recipe.ingredients.map(ing => ing.name)); // default all
    setNote("");
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentRecipe(null);
  };

  const toggleIngredient = (name, customizable) => {
    if (!customizable) return;
    if (selectedIngredients.includes(name)) {
      setSelectedIngredients(selectedIngredients.filter(i => i !== name));
    } else {
      setSelectedIngredients([...selectedIngredients, name]);
    }
  };

  const addToCart = async () => {
    if (!user || !currentRecipe) return;

    const cartRef = doc(db, "cart", user.uid);

    const item = {
      recipeId: currentRecipe.id,
      title: currentRecipe.title,
      size,
      quantity,
      selectedIngredients,
      note,
      price: currentRecipe.sizes[size],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const cartSnap = await getDoc(cartRef);

    if (!cartSnap.exists()) {
      await setDoc(cartRef, {
        items: [item],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      await updateDoc(cartRef, {
        items: arrayUnion(item),
        updatedAt: serverTimestamp()
      });
    }

    closeModal();
    alert("Added to cart!");
  };

  return (
    <div className="main-content recipes-page">
      <h1 className="page-title">Our Recipes</h1>

      {/* Filter input */}
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <input
          type="text"
          placeholder="Search recipes..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{
            width: "80%",
            maxWidth: "400px",
            padding: "0.5rem 1rem",
            borderRadius: "8px",
            border: "1px solid #ccc",
            fontSize: "1rem"
          }}
        />
      </div>

      <div className="recipes-grid">
        {filteredRecipes.map(recipe => (
          <div key={recipe.id} className="recipe-card">
            <img src={recipe.image} alt={recipe.title} className="recipe-image" />
            <h2 className="recipe-title">{recipe.title}</h2>
            <p className="recipe-description">{recipe.description}</p>
            <button className="btn-primary" onClick={() => openModal(recipe)}>
              <FaShoppingCart style={{ marginRight: "5px" }} /> Add to Cart
            </button>
          </div>
        ))}
        {filteredRecipes.length === 0 && (
          <p style={{ textAlign: "center", gridColumn: "1 / -1" }}>No recipes found.</p>
        )}
      </div>

      {modalOpen && currentRecipe && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={e => e.stopPropagation()}
            style={{ width: "95%", maxWidth: "550px", padding: "2.5rem", fontSize: "1.1rem" }}
          >
            <h2 style={{ marginBottom: "1rem", fontSize: "1.8rem" }}>{currentRecipe.title}</h2>
            <p style={{ marginBottom: "1rem" }}>{currentRecipe.description}</p>

            <h3 style={{ marginBottom: "0.5rem" }}>Ingredients:</h3>
            <div style={{ marginBottom: "1rem" }}>
              {currentRecipe.ingredients.map((ing, idx) => (
                <div key={idx} style={{ marginBottom: "0.5rem" }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedIngredients.includes(ing.name)}
                      disabled={!ing.customizable}
                      onChange={() => toggleIngredient(ing.name, ing.customizable)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {ing.name} ({ing.amount}) {ing.customizable ? "" : "(Required)"}
                  </label>
                </div>
              ))}
            </div>

            <h3 style={{ marginBottom: "0.5rem" }}>Size:</h3>
            <div style={{ marginBottom: "1rem" }}>
              {["small", "medium", "large"].map(s => (
                <label key={s} style={{ marginRight: "15px" }}>
                  <input
                    type="radio"
                    name="size"
                    value={s}
                    checked={size === s}
                    onChange={() => setSize(s)}
                    style={{ marginRight: "0.3rem" }}
                  />
                  {s} (${currentRecipe.sizes[s]})
                </label>
              ))}
            </div>

            <h3 style={{ marginBottom: "0.5rem" }}>Quantity:</h3>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value))}
              style={{ width: "60px", marginBottom: "1rem" }}
            />

            <h3 style={{ marginBottom: "0.5rem" }}>Note:</h3>
            <textarea
              placeholder="Send a note to the vendor"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              style={{ width: "100%", padding: "10px", borderRadius: "6px", marginBottom: "1.5rem" }}
            />

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button className="btn-primary" onClick={addToCart}>Add to Cart</button>
              <button className="btn-secondary" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Recipes;
