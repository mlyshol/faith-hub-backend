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

// Define VideoFetching Schema (Stores API Key Name as a String)
const videoFetchingSchema = new mongoose.Schema({
  subcategory: { type: String, required: true, unique: true }, // Example: "Grace"
  apiKeyName: { type: String, required: true }, // Example: "YOUTUBE_API_KEY_GRACE"
});

const VideoFetching = mongoose.model("VideoFetching", videoFetchingSchema);

// Subcategories with Named API Key Strings
const subcategories = [
  { subcategory: "Grace", apiKeyName: "YOUTUBE_API_KEY_GRACE" },
  { subcategory: "Salvation", apiKeyName: "YOUTUBE_API_KEY_SALVATION" },
  { subcategory: "Prayer", apiKeyName: "YOUTUBE_API_KEY_PRAYER" },
  { subcategory: "Worship", apiKeyName: "YOUTUBE_API_KEY_WORSHIP" },
  { subcategory: "Spiritual Growth", apiKeyName: "YOUTUBE_API_KEY_SPIRITUAL_GROWTH" },
  { subcategory: "Leadership", apiKeyName: "YOUTUBE_API_KEY_LEADERSHIP" },
  { subcategory: "Membership", apiKeyName: "YOUTUBE_API_KEY_MEMBERSHIP" },
  { subcategory: "Stewardship", apiKeyName: "YOUTUBE_API_KEY_STEWARDSHIP" },
  { subcategory: "Church History", apiKeyName: "YOUTUBE_API_KEY_CHURCH_HISTORY" },
  { subcategory: "Old Testament", apiKeyName: "YOUTUBE_API_KEY_OLD_TESTAMENT" },
  { subcategory: "New Testament", apiKeyName: "YOUTUBE_API_KEY_NEW_TESTAMENT" },
  { subcategory: "Gospels", apiKeyName: "YOUTUBE_API_KEY_GOSPELS" },
  { subcategory: "Doctrine", apiKeyName: "YOUTUBE_API_KEY_DOCTRINE" },
  { subcategory: "Prophecy", apiKeyName: "YOUTUBE_API_KEY_PROPHECY" },
  { subcategory: "Tim Keller", apiKeyName: "YOUTUBE_API_KEY_TIM_KELLER" },
  { subcategory: "Greg Laurie", apiKeyName: "YOUTUBE_API_KEY_GREG_LAURIE" },
  { subcategory: "John Piper", apiKeyName: "YOUTUBE_API_KEY_JOHN_PIPER" },
  { subcategory: "Alistair Begg", apiKeyName: "YOUTUBE_API_KEY_ALISTAIR_BEGG" }
];

// Function to Populate Database
const populateVideoFetchingTable = async () => {
  try {
    await VideoFetching.insertMany(subcategories);
    console.log("VideoFetching table populated successfully!");
  } catch (error) {
    console.error("Error populating VideoFetching table:", error);
  } finally {
    mongoose.disconnect();
  }
};

// Run the script
populateVideoFetchingTable();