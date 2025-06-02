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
db.on("error", (error) => console.error("Connection error:", error));
db.once("open", () => console.log("Connected to database"));

// Define a Schema for page configurations
const pageSchema = new mongoose.Schema({
  pageId: { type: String, required: true, unique: true }, // e.g., "faithchristianliving"
  title: String,
  description: String,
  searchQuery: String, // Default YouTube search term for the page
  defaultSort: { type: String, default: "relevance" },
  subcategories: [String], // Array of subcategory names for filtering
});
const Page = mongoose.model("Page", pageSchema);

// Define a Schema for videos (storing fetched YouTube data)
const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  thumbnail: String,
  publishedAt: Date,
  viewCount: Number,
  likeCount: Number,
  commentCount: Number,
  searchQuery: String, // The search term that found this video
});

const Video = mongoose.model("Video", videoSchema);

const app = express();
app.use(cors());
app.use(express.json());

// Example Express endpoint update
app.get("/api/videos/:searchQuery", async (req, res) => {
  try {
    const searchQuery = req.params.searchQuery;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;
    const skip = (page - 1) * limit;
    const sortField = req.query.sort;

    let sortObj = {};
    if (sortField === "likeCount") {
      sortObj.likeCount = -1;
    } else if (sortField === "viewCount") {
      sortObj.viewCount = -1;
    } else if (sortField === "publishedAt") {
      sortObj.publishedAt = -1;
    } else if (sortField === "commentCount") {
      sortObj.commentCount = -1;
    } else {
      // Default sort (fallback)
      sortObj.viewCount = -1;
    }

    const videos = await Video.find({
      status: "Published",         // Only include videos marked as Published
      toBeDeleted: false,          // Exclude videos marked for deletion
      $or: [
        { searchQuery: searchQuery },
        { title: { $regex: searchQuery, $options: "i" } },
        { description: { $regex: searchQuery, $options: "i" } },
      ],
    })
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ error: "Failed to retrieve videos" });
  }
});

// **API Route to Fetch and Store YouTube Videos**
app.get("/api/fetch-videos/:query", async (req, res) => {
  try {
    const query = req.params.query;
    console.log(`Fetching YouTube videos for: ${query}`);

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${graceKey}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.items) return res.status(404).json({ error: "No videos found" });

    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${graceKey}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    const videoDetails = statsData.items.map((video) => ({
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.default.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount, 10) || 0,
      likeCount: parseInt(video.statistics.likeCount, 10) || 0,
      commentCount: parseInt(video.statistics.commentCount, 10) || 0,
      searchQuery: query,
    }));

    // Save or update in MongoDB
    for (const video of videoDetails) {
      await Video.findOneAndUpdate(
        { videoId: video.videoId },
        video,
        { upsert: true, new: true }
      );
    }

    res.json({ message: "Videos successfully updated in database", videos: videoDetails });
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    res.status(500).json({ error: "Failed to retrieve videos" });
  }
});

// **API Route to Fetch Page Configuration from Database**
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

// Admin endpoint: Get videos needing review
app.get("/api/admin/videos/needs-review", async (req, res) => {
  try {
    // Find videos with status "Needs Review" and not marked to be deleted
    const videos = await Video.find({
      status: "Needs Review",
      toBeDeleted: false,
    });
    res.json(videos);
  } catch (error) {
    console.error("Error fetching videos for review:", error);
    res.status(500).json({ error: "Failed to retrieve videos for review" });
  }
});

// Admin endpoint: Update video status by video _id
app.put("/api/admin/videos/:id", async (req, res) => {
  try {
    const { status } = req.body;
    console.log("Updating video ID:", req.params.id, "New Status:", status);

    if (!["Published", "Needs Review", "Unpublished"].includes(status)) {
      return res.status(400).json({ error: "Invalid status provided" });
    }

    const preUpdateVideo = await Video.findById(req.params.id);
    console.log("Before Update:", preUpdateVideo);

    const updatedVideo = await Video.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedVideo) {
      return res.status(404).json({ error: "Video not found" });
    }

    console.log("After Update:", updatedVideo);
    res.json(updatedVideo);
  } catch (error) {
    console.error("Error updating video status:", error);
    res.status(500).json({ error: "Failed to update video status" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));