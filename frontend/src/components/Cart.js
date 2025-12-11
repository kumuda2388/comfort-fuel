import React, { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../firebase";

function Cart() {
  const user = auth.currentUser;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // Load cart
  useEffect(() => {
    const fetchCart = async () => {
      if (!user) return;

      const cartRef = doc(db, "cart", user.uid);
      const cartSnap = await getDoc(cartRef);

      if (cartSnap.exists()) {
        const data = cartSnap.data().items || [];
        setItems(data);

        const totalPrice = data.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        setTotal(totalPrice);
      }
    };

    fetchCart();
  }, [user]);

  // Delete item
  const removeItem = async (index) => {
    const newItems = items.filter((_, idx) => idx !== index);
    setItems(newItems);

    const cartRef = doc(db, "cart", user.uid);
    await updateDoc(cartRef, {
      items: newItems,
      updatedAt: serverTimestamp()
    });

    const newTotal = newItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(newTotal);
  };

  // Update quantity
  const updateQuantity = async (index, newQuantity) => {
    const updatedItems = [...items];
    updatedItems[index].quantity = newQuantity;
    setItems(updatedItems);

    const cartRef = doc(db, "cart", user.uid);
    await updateDoc(cartRef, {
      items: updatedItems,
      updatedAt: serverTimestamp()
    });

    const newTotal = updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(newTotal);
  };

  // Place order
  const placeOrder = async () => {
    if (items.length === 0) {
      alert("Cart is empty!");
      return;
    }

    const orderRef = doc(db, "orders", user.uid);
    const cartRef = doc(db, "cart", user.uid);

    // Use client timestamp inside array entries
    const orderData = {
      items,
      total,
      status: "ordered",
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const orderSnap = await getDoc(orderRef);

    if (orderSnap.exists()) {
      const existingOrders = orderSnap.data().orders || [];
      await updateDoc(orderRef, {
        orders: [...existingOrders, orderData], // safe now
        updatedAt: serverTimestamp()
      });
    } else {
      await setDoc(orderRef, {
        orders: [orderData],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    // Empty cart
    await updateDoc(cartRef, { items: [], updatedAt: serverTimestamp() });
    setItems([]);
    setTotal(0);

    // Add notifications
    // Notification for user
    await addDoc(collection(db, "notifications"), {
      userId: user.uid, // user-specific notifications
      message: `Your order has been placed successfully.`,
      type: "order", 
      read: false, // unread by default
      createdAt: serverTimestamp(), // timestamp
      updatedAt: serverTimestamp()
    });
    const userDoc = await getDoc(doc(db, "users", user.uid));
    let userName = "Customer";
    
    if (userDoc.exists()) {
      userName = userDoc.data().first_name|| "Customer";
    }
    await addDoc(collection(db, "vendor_notifications"), {
      userId: user.uid,
      message: `${userName} has placed a new order.`,
      type: "vendorOrder",
      read: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("Order placed successfully!");
  };

  return (
    <div className="main-content cart-page">
      <h1 className="page-title">Your Cart</h1>
      {items.length === 0 ? (
        <p>Your cart is empty.</p>
      ) : (
        <table className="cart-table" style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Title</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Size</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Ingredients</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Note</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Quantity</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Price</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "10px" }}>{item.title}</td>
                <td style={{ padding: "10px" }}>{item.size}</td>
                <td style={{ padding: "10px" }}>{item.selectedIngredients.join(", ")}</td>
                <td style={{ padding: "10px" }}>{item.note || "-"}</td>
                <td style={{ padding: "10px" }}>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQuantity(index, parseInt(e.target.value))}
                    style={{ width: "60px" }}
                  />
                </td>
                <td style={{ padding: "10px" }}>${item.price * item.quantity}</td>
                <td style={{ padding: "10px" }}>
                  <button className="btn-secondary" onClick={() => removeItem(index)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {items.length > 0 && (
        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Total: ${total}</h2>
          <button className="btn-primary" onClick={placeOrder}>Place Order</button>
        </div>
      )}
    </div>
  );
}

export default Cart;
