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

// Define video schema
const videoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: String,
  description: String,
  thumbnail: String,
  publishedAt: Date,
  viewCount: Number,
  likeCount: Number,
  commentCount: Number,
  searchQuery: String, // The term used to find this video
});

const Video = mongoose.model("Video", videoSchema);

// Fetch YouTube videos based on query
const fetchYouTubeVideos = async (query) => {
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=100&key=${process.env.YOUTUBE_API_KEY}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchData.items) {
      console.error("No videos found for query:", query);
      return [];
    }

    // Extract video IDs for additional details
    const videoIds = searchData.items.map(item => item.id.videoId).join(",");
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    return statsData.items.map(video => ({
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
  } catch (error) {
    console.error("Error fetching YouTube videos:", error);
    return [];
  }
};

// Save or update videos in the database
const saveVideosToDatabase = async (videos) => {
  for (const video of videos) {
    try {
      await Video.findOneAndUpdate(
        { videoId: video.videoId },
        video,
        { upsert: true, new: true }
      );
      console.log(`Updated/Added video: ${video.title}`);
    } catch (error) {
      console.error("Error saving video:", error);
    }
  }
};

const run = async (additionalQuery = "") => {
  const baseQuery = "Christian Sermons"; // Default search term
  const query = additionalQuery ? `${additionalQuery} ${baseQuery}` : baseQuery; // Append parameter
  
  console.log(`Fetching YouTube videos for: ${query}`);

  const videos = await fetchYouTubeVideos(query);
  if (videos.length) {
    await saveVideosToDatabase(videos);
    console.log("Database update complete!");
  } else {
    console.log("No new videos found.");
  }

  mongoose.disconnect();
};

// Call run() with a parameter (e.g., "Faith")
const additionalQuery = process.argv[2] || ""; // Allows passing arguments via CLI
run(additionalQuery);