const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection URI
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jwqfj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Function to connect and define routes
async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB!");

    // Define database and collections
    const database = client.db("taskManagementDB");
    const usersCollection = database.collection("users");

    // Create User API (Signup)
    app.post("/users", async (req, res) => {
      try {
        const user = req.body;
        console.log("New User Data:", user);

        // Check if user already exists
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          return res.status(400).json({ message: "User already exists" });
        }

        // Insert user into DB
        const result = await usersCollection.insertOne(user);
        res.json(result);
      } catch (error) {
        console.error("Error inserting user:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Test Route
    app.get("/", (req, res) => {
      res.send("Welcome to Task Management API!");
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);
  }
}

// Run the function
run().catch(console.dir);

// Start the Express Server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
