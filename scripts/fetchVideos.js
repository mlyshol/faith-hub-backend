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

// Define Video Schema with additional fields
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
  lastDateFetch: { type: Date, default: Date.now },
  toBeDeleted: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  status: { type: String, enum: ["Published", "Needs Review", "Unpublished"], default: "Needs Review" },
});
const Video = mongoose.model("Video", videoSchema);

// Define VideoFetching Schema (For Subcategory Lookup)
const videoFetchingSchema = new mongoose.Schema({
  subcategory: { type: String, required: true, unique: true }, // Example: "Grace"
  apiKeyName: { type: String, required: true }, // Example: "YOUTUBE_API_KEY_GRACE"
});
const VideoFetching = mongoose.model("VideoFetching", videoFetchingSchema);

// Helper function to parse ISO8601 duration (e.g., "PT1M20S") to seconds
const parseDuration = (duration) => {
  let hours = 0, minutes = 0, seconds = 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = duration.match(regex);
  if (matches) {
    if (matches[1]) hours = parseInt(matches[1], 10);
    if (matches[2]) minutes = parseInt(matches[2], 10);
    if (matches[3]) seconds = parseInt(matches[3], 10);
  }
  return hours * 3600 + minutes * 60 + seconds;
};

// Fetch YouTube videos for a given query, sort type, and API key
const fetchYouTubeVideos = async (query, sortType, apiKey) => {
  try {
    // First, perform a search request for videos
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(
      query
    )}&type=video&maxResults=50&order=${sortType}&key=${apiKey}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.items) {
      console.error(`No videos found for query: "${query}" (Sort: ${sortType})`);
      return [];
    }

    // Extract video IDs from the search response
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    
    // Request details for each video (Including contentDetails for duration filtering)
    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    // Filter out videos shorter than 60 seconds (i.e., Shorts) and build the video objects
    const videos = statsData.items
      .filter((video) => {
        const duration = video.contentDetails.duration;
        return parseDuration(duration) >= 60;
      })
      .map((video) => ({
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
        lastDateFetch: new Date(), // Update with current fetch time
        status: "Needs Review" // Explicitly default each video to "Needs Review"
        // "toBeDeleted" and "featured" will use the schema defaults
      }));

    return videos;
  } catch (error) {
    console.error(`Error fetching YouTube videos for sort "${sortType}":`, error);
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
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`Updated/Added video: ${video.title} (Sort: ${video.sortType})`);
    } catch (error) {
      console.error("Error saving video:", error);
    }
  }
};

// Run script: Automatically fetch data from all records in VideoFetching collection
const run = async () => {
  try {
    // Retrieve all subcategory records from the VideoFetching collection
    const videoFetchRecords = await VideoFetching.find({});
    if (videoFetchRecords.length === 0) {
      console.error("No records found in VideoFetching collection.");
      mongoose.disconnect();
      return;
    }

    // Define the sorting methods to iterate over
    const sortTypes = ["relevance", "rating", "viewCount", "date"];

    // Process each subcategory record
    for (const record of videoFetchRecords) {
      const subcategoryInput = record.subcategory;
      const apiKey = process.env[record.apiKeyName];
      if (!apiKey) {
        console.error(`Error: API key not found for subcategory "${subcategoryInput}". Skipping.`);
        continue;
      }

      const query = `${subcategoryInput} Christian Sermons`;
      console.log(`\nFetching YouTube videos for subcategory: "${subcategoryInput}" using API key: ${record.apiKeyName}`);

      // For each sorting method, fetch and save videos
      for (const sortType of sortTypes) {
        console.log(`Fetching videos sorted by: ${sortType}`);
        const videos = await fetchYouTubeVideos(query, sortType, apiKey);
        if (videos.length) {
          await saveVideosToDatabase(videos);
          console.log(`Database update complete for subcategory: "${subcategoryInput}" with sort: "${sortType}"`);
        } else {
          console.log(`No new videos found for sorting: "${sortType}" for subcategory: "${subcategoryInput}"`);
        }
      }
    }
  } catch (error) {
    console.error("Error during processing:", error);
  } finally {
    mongoose.disconnect();
  }
};

// Run the script
run();