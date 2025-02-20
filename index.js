const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
// const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);  // Use the HTTP server for Socket.IO
const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173", // Vite's default port
      methods: ["GET", "POST", "PUT", "DELETE"]
    }
  });

const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

 // Socket.IO connection event
 io.on("connection", (socket) => {
    console.log("New client connected");

    // Listen for task updates from the client
    socket.on("taskUpdate", (taskData) => {
      console.log("Task update received:", taskData);
      // Emit an event to all connected clients with the updated task data
      io.emit("taskUpdated", taskData);
    });

    // Handle client disconnect event
    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

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
    console.log("Successfully Connected to MongoDB!");

    // Define database and collections
    const database = client.db("taskManagementDB");
    const usersCollection = database.collection("users");
    const tasksCollection = database.collection("tasks");

   

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

    // GET /tasks - Sort by position
app.get("/tasks", async (req, res) => {
    try {
      const tasks = await tasksCollection.find().sort({ position: 1 }).toArray();
      res.status(200).send(tasks);
    } catch (error) {
      res.status(500).send({ message: "Failed to fetch tasks", error: error.message });
    }
  });
  
  // POST /tasks - Add initial position
  app.post("/tasks", async (req, res) => {
    try {
      const task = {
        ...req.body,
        timestamp: new Date(),
        position: req.body.position || 0, // Default to 0 if not provided
      };
      const result = await tasksCollection.insertOne(task);
      const newTask = await tasksCollection.findOne({ _id: result.insertedId });
      io.emit("taskCreated", newTask);
      res.status(201).send(newTask);
    } catch (error) {
      res.status(500).send({ message: "Failed to create task", error: error.message });
    }
  });
  
  // PUT /tasks/:id - Update position along with category
  app.put("/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body; // Includes category and position
  
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updates }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).send({ message: "Task not found" });
      }
  
      const updatedTask = await tasksCollection.findOne({ _id: new ObjectId(id) });
  
      io.emit("taskUpdated", updatedTask); // Emit event to update clients
      res.status(200).send(updatedTask);
    } catch (error) {
      res.status(500).send({ message: "Failed to update task", error: error.message });
    }
  });
  

  app.delete("/tasks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
  
      if (result.deletedCount === 0) {
        return res.status(404).send({ message: "Task not found" });
      }
  
      io.emit("taskDeleted", id); // Emit event to update clients
      res.status(200).send({ message: "Task deleted successfully" });
    } catch (error) {
      res.status(500).send({ message: "Failed to delete task", error: error.message });
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

// Start the Express Server with Socket.IO
server.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
