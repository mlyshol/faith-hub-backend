import mongoose from "mongoose";
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

// Define updated video schema with new fields
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
  // New fields:
  lastDateFetch: { type: Date, default: Date.now },
  toBeDeleted: { type: Boolean, default: false },
  featured: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["Published", "Needs Review", "Unpublished"],
    default: "Needs Review",
  },
});

const Video = mongoose.model("Video", videoSchema);

// Function to delete all videos
const deleteAllVideos = async () => {
  try {
    await Video.deleteMany({});
    console.log("All videos have been deleted.");
  } catch (error) {
    console.error("Error deleting videos:", error);
  }
};

// Run deletion and disconnect from MongoDB after completion
deleteAllVideos().then(() => mongoose.disconnect());