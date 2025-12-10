import React, { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

function Orders() {
  const user = auth.currentUser;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      const ordersRef = doc(db, "orders", user.uid);
      const ordersSnap = await getDoc(ordersRef);

      if (ordersSnap.exists()) {
        let data = ordersSnap.data().orders || [];

        // sort newest first
        data = data.sort((a, b) => {
          return new Date(b.createdAt?.seconds * 1000) -
                 new Date(a.createdAt?.seconds * 1000);
        });

        setOrders(data);
      }

      setLoading(false);
    };

    fetchOrders();
  }, [user]);

  if (loading) return <p>Loading orders...</p>;

  return (
    <div className="main-content">
      <h1 className="page-title">Your Orders</h1>

      {orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ccc" }}>
              <th style={{ padding: "10px", textAlign: "left" }}>Order Date</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Items</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Total</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #ccc" }}>
                <td style={{ padding: "10px" }}>
                  {order.createdAt?.seconds
                    ? new Date(order.createdAt.seconds * 1000).toLocaleString()
                    : "-"}
                </td>

                <td style={{ padding: "10px" }}>
                  {order.items.map((i, index) => (
                    <div key={index} style={{ marginBottom: "8px" }}>
                      <strong>{i.title}</strong> ({i.size})  
                      — Qty: {i.quantity}  
                      — ${i.price * i.quantity}
                      <br />
                      <small>Ingredients: {i.selectedIngredients.join(", ")}</small>
                    </div>
                  ))}
                </td>

                <td style={{ padding: "10px" }}>${order.total}</td>

                <td style={{ padding: "10px" }}>{order.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Orders;
