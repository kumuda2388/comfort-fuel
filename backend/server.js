/* With firebase we do not require backend server*/

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

const PORT = 8080;
app.listen(PORT, () => console.log("Server running on port " + PORT));
