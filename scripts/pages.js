// seed.js
import "dotenv/config"; // Loads environment variables from .env
import mongoose from "mongoose";

// Define a Mongoose schema for your page configuration
const pageSchema = new mongoose.Schema({
  pageId: { type: String, required: true, unique: true }, // e.g., "faithchristianliving"
  title: String,
  description: String,
  searchQuery: String,           // Default YouTube search term for the page
  defaultSort: { type: String, default: "relevance" },
  subcategories: [String],        // Array of subcategory names for filtering
});

// Create a model from the schema
const Page = mongoose.model("Page", pageSchema);

// Connect to MongoDB using the connection URI stored in the environment variable
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("Connected to MongoDB"))
.catch(err => console.error("Connection error:", err));

// Array of page configuration documents to seed
const pages = [
  {
    pageId: "faithchristianliving",
    title: "Faith & Christian Living",
    description: "Sermons that focus on daily living in Christ's love, discipleship, and spiritual growth.",
    searchQuery: "Faith Christian Living sermons",
    defaultSort: "likeCount",
    subcategories: ["Grace", "Salvation", "Prayer", "Worship", "Spiritual Growth"],
  },
  {
    pageId: "churchleadership",
    title: "Church & Leadership",
    description: "Sermons that promote church leadership principles, community, and commitment.",
    searchQuery: "Church Leadership sermons",
    defaultSort: "likeCount",
    subcategories: ["Leadership", "Membership", "Stewardship", "Church History"],
  },
  {
    pageId: "biblicalbooks",
    title: "Biblical Books & Teachings",
    description: "Sermons derived from books of the Bible, discussing foundational texts and teachings.",
    searchQuery: "Biblical Books sermons",
    defaultSort: "likeCount",
    subcategories: ["Old Testament", "New Testament", "Gospels", "Doctrine", "Prophecy"],
  },
  {
    pageId: "featuredpastors",
    title: "Featured Pastors",
    description: " Explore our curated selection of featured pastors, whose transformative leadership and impactful teachings inspire and guide believers on their journey of faith.",
    searchQuery: "Featured Pastors sermons",
    defaultSort: "likeCount",
    subcategories: [
      "Tim Keller", 
      "Greg Laurie", 
      "John Piper", 
      "Alistair Begg",
    ],
  },
];

// Use insertMany to seed the collection with the pages array
Page.insertMany(pages)
  .then((docs) => {
    console.log("Documents inserted:", docs);
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("Error inserting documents:", err);
    mongoose.connection.close();
  });