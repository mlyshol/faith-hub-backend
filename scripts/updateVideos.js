import mongoose from "mongoose";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cron from "node-cron";
import Video from "../models/videoModel.js"; // Import your video schema

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

// Function to fetch updated stats for existing videos
const updateYouTubeVideos = async () => {
  try {
    const videos = await Video.find(); // Get all stored videos
    const videoIds = videos.map(video => video.videoId).join(",");

    if (!videoIds) {
      console.log("No videos found in the database.");
      return;
    }

    const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`;
    const statsResponse = await fetch(statsUrl);
    const statsData = await statsResponse.json();

    if (!statsData.items) {
      console.error("Error fetching video stats from YouTube.");
      return;
    }

    for (const video of statsData.items) {
      await Video.findOneAndUpdate(
        { videoId: video.id },
        {
          viewCount: parseInt(video.statistics.viewCount, 10) || 0,
          likeCount: parseInt(video.statistics.likeCount, 10) || 0,
          commentCount: parseInt(video.statistics.commentCount, 10) || 0,
        },
        { new: true }
      );
      console.log(`Updated stats for video: ${video.id}`);
    }

    console.log("Video statistics updated successfully.");
  } catch (error) {
    console.error("Error updating YouTube video stats:", error);
  }
};

// Schedule updates every 6 hours
cron.schedule("0 */6 * * *", async () => {
  console.log("Running scheduled YouTube video update...");
  await updateYouTubeVideos();
});

// Run update manually if needed
updateYouTubeVideos().then(() => mongoose.disconnect());