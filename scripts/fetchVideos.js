import mongoose from "mongoose";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

// Define Video Schema
const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  thumbnail: String,
  publishedAt: Date,
  viewCount: Number,
  likeCount: Number,
  commentCount: Number,
  searchQuery: String,
  sortType: String,
});

const Video = mongoose.model("Video", videoSchema);

// Define VideoFetching Schema (For Subcategory Lookup)
const videoFetchingSchema = new mongoose.Schema({
  subcategory: { type: String, required: true, unique: true }, // Example: "Grace"
  apiKeyName: { type: String, required: true }, // Example: "YOUTUBE_API_KEY_GRACE"
});

const VideoFetching = mongoose.model("VideoFetching", videoFetchingSchema);

// Fetch YouTube videos
const fetchYouTubeVideos = async (query, sortType, apiKey) => {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=50&order=${sortType}&key=${apiKey}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.items) {
      console.error(`No videos found for query: "${query}" (Sort: ${sortType})`);
      return [];
    }

    // Extract video IDs
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    return statsData.items.map((video) => ({
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.default.url,
      publishedAt: video.snippet.publishedAt,
      viewCount: parseInt(video.statistics.viewCount, 10) || 0,
      likeCount: parseInt(video.statistics.likeCount, 10) || 0,
      commentCount: parseInt(video.statistics.commentCount, 10) || 0,
      searchQuery: query,
      sortType,
    }));
  } catch (error) {
    console.error(`Error fetching YouTube videos for sorting type "${sortType}":`, error);
    return [];
  }
};

// Save or update videos in the database
const saveVideosToDatabase = async (videos) => {
  for (const video of videos) {
    try {
      await Video.findOneAndUpdate(
        { videoId: video.videoId, sortType: video.sortType },
        video,
        { upsert: true, new: true }
      );
      console.log(`Updated/Added video: ${video.title} (Sort: ${video.sortType})`);
    } catch (error) {
      console.error("Error saving video:", error);
    }
  }
};

// Run script with parameter for subcategory lookup
const run = async () => {
  const subcategoryInput = process.argv[2]; // Get parameter from CLI
  if (!subcategoryInput) {
    console.error("Error: No subcategory provided.");
    mongoose.disconnect();
    return;
  }

  // Look up subcategory in VideoFetching collection
  const subcategory = await VideoFetching.findOne({ subcategory: subcategoryInput });
  if (!subcategory) {
    console.error(`Error: Subcategory "${subcategoryInput}" not found.`);
    mongoose.disconnect();
    return;
  }

  // Get API key name and retrieve actual key from .env
  const apiKey = process.env[subcategory.apiKeyName]; 
  if (!apiKey) {
    console.error(`Error: API key not found for subcategory "${subcategoryInput}".`);
    mongoose.disconnect();
    return;
  }

  const query = `${subcategoryInput} Christian Sermons`;
  const sortTypes = ["relevance", "rating", "viewCount", "date"]; // Sorting methods

  console.log(`Fetching YouTube videos for: ${query} (Using API Key: ${subcategory.apiKeyName})`);

  for (const sortType of sortTypes) {
    console.log(`Fetching videos sorted by: ${sortType}`);
    const videos = await fetchYouTubeVideos(query, sortType, apiKey);
    if (videos.length) {
      await saveVideosToDatabase(videos);
      console.log(`Database update complete for: ${sortType}`);
    } else {
      console.log(`No new videos found for sorting: ${sortType}`);
    }
  }

  mongoose.disconnect();
};

// Run script
run();