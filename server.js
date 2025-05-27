import "dotenv/config";
import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import mongoose from "mongoose";

// Connect to MongoDB using MONGO_URI from your .env file
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", error => console.error("Connection error:", error));
db.once("open", () => console.log("Connected to database"));

// Define a Schema for page configurations
const pageSchema = new mongoose.Schema({
  pageId: { type: String, required: true, unique: true }, // e.g., "faithchristianliving"
  title: String,
  description: String,
  searchQuery: String,           // Default YouTube search term for the page
  defaultSort: { type: String, default: "relevance" },
  subcategories: [String]        // Array of subcategory names for filtering
});
const Page = mongoose.model("Page", pageSchema);

const app = express();
app.use(cors());

const apiKey = process.env.YOUTUBE_API_KEY;

// Endpoint to fetch sermons from YouTube
app.get("/api/sermons", async (req, res) => {
  try {
    const searchQuery = req.query.q + " Christian Sermons" || "Christian Sermons";
    const pageToken = req.query.pageToken || "";
    const sortOrder = req.query.order || "relevance"; // Default to relevance

    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      searchQuery
    )}&type=video&maxResults=8&order=${sortOrder}&pageToken=${pageToken}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    res.json({
      items: data.items,
      nextPageToken: data.nextPageToken || null,
    });
  } catch (error) {
    console.error("Error fetching sermons:", error);
    res.status(500).json({ error: "Failed to fetch sermons" });
  }
});

// Endpoint to serve page configuration from your database
app.get("/api/pages/:pageId", async (req, res) => {
  try {
    const { pageId } = req.params;
    const page = await Page.findOne({ pageId });
    if (!page) {
      return res.status(404).json({ error: "Page not found" });
    }
    res.json(page);
  } catch (error) {
    console.error("Error fetching page configuration:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));