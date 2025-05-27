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
    defaultSort: "relevance",
    subcategories: ["Grace", "Salvation", "Prayer", "Worship", "Spiritual Growth"],
  },
  {
    pageId: "churchleadership",
    title: "Church & Leadership",
    description: "Sermons that promote church leadership principles, community, and commitment.",
    searchQuery: "Church Leadership sermons",
    defaultSort: "relevance",
    subcategories: ["Leadership", "Membership", "Stewardship", "Church History"],
  },
  {
    pageId: "biblicalbooks",
    title: "Biblical Books & Teachings",
    description: "Sermons derived from books of the Bible, discussing foundational texts and teachings.",
    searchQuery: "Biblical Books sermons",
    defaultSort: "relevance",
    subcategories: ["Genesis", "Psalms", "Gospels", "Romans", "Revelation"],
  },
  {
    pageId: "apologeticsendtimes",
    title: "Apologetics & End Times",
    description: "Sermons on defending the faith, prophecy, and understanding the end times.",
    searchQuery: "Christian apologetics sermons",
    defaultSort: "relevance",
    subcategories: [
      "Defending the Christian Faith", 
      "Understanding Doctrine & Biblical Interpretation", 
      "Signs of the Last Days & Biblical Prophecy", 
      "The Book of Revelation & End Times Theology"
    ],
  },
  {
    pageId: "testimonies",
    title: "Testimonies & Personal Stories",
    description: "Powerful personal accounts and testimonies that inspire and uplift.",
    searchQuery: "Christian testimonies sermons",
    defaultSort: "relevance",
    subcategories: ["Conversion Stories", "Miracle Testimonies", "Overcoming Struggles", "Living Out Faith"],
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