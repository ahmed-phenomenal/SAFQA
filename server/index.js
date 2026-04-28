import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import translateRoutes from "./translate.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.send("Translation server running");
});

app.use("/api", translateRoutes);

app.listen(PORT, () => {
  console.log(`Translation server running on http://localhost:${PORT}`);
});