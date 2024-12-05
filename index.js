// Importing necessary modules
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

// Setting up Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: "*" }, // Allow all origins for testing purposes
});

// Server Port
const port = 3000;
// In-memory storage for connected users and their socket IDs
let users = []; // List of active usernames
const userSocketMap = new Map(); // Map of username to their socket IDs

// Event listener for a new client connection
io.on("connection", (socket) => {
	try {
		// Logs when a new client connects
		console.log(`A user connected: ${socket.id}`);

		// Event listener for a user joining the chat
		socket.on("join", (name) => {
			console.log(`${name} has joined the chat.`);
			// Assigning the username to the socket instance
			socket.username = name;

			// Adding the new user to the list and mapping their username to their socket ID
			users.push(name);
      userSocketMap.set(name, socket.id);

			// Joining the general chat room ("All")
			socket.join("All");

			// Updating the list of active users for all clients
			io.emit("updateUsers", users);

			// Sending a welcome message to the newly connected user
			socket.emit("message", {
				content: `Hello ${name}! You have joined the chat!`,
				sender: "System", // Messages from the server/system
				room: "All", // Room for group chat
			});

			// Broadcasting to all other users that a new user has joined
			socket.broadcast.emit("message", {
				content: `${name} has joined the chat.`,
				sender: "System", 
				room: "All", 
			});
		});

		// Event listener for when a user disconnects
		socket.on("disconnect", () => {
			console.log(`${socket.username} disconnected:`, socket.id);
			// Removing the user from the list and updating all clients
			const userIndex = users.indexOf(socket.username);
			if (userIndex !== -1) {
				const disconnectedUser = users.splice(userIndex, 1)[0];
				io.emit("updateUsers", users);
				// Broadcasting a system message about the user leaving
				socket.broadcast.emit("message", {content: `${socket.username} has left the chat.`, sender: "System", room: "All"});
			}
		});

		// Event listener for handling messages from clients
		socket.on("message", (msgObj) => {
      const { content, sender, room } = msgObj; // Extracting message details
      if (room === "All") {
				// If the message is for the group chat, broadcast to all users in the "All" room
        io.to("All").emit("message", msgObj);
      } else {
        // Handle private messages
        const participants = room.split('-');
        const receiver = participants.find(user => user !== sender);
        const receiverSocketId = userSocketMap.get(receiver); // Get the receiver's socket ID
        
        if (receiverSocketId) {
          // Send to both sender and receiver
          io.to(socket.id).emit("message", msgObj); // Echo message back to the sender
          io.to(receiverSocketId).emit("message", msgObj); // Deliver message to the receiver
        }
      }
    });
	} catch (error) {
		console.error("Error in socket connection handling:", error);
	}
});

server.listen(port, () => {
	console.log(`Server running on port: ${port}`);
});
