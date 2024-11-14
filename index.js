const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: { origin: "*" }, // Allow all origins for testing purposes
});

const port = 3000;
let users = [];
const userSocketMap = new Map();

io.on("connection", (socket) => {
	try {
		console.log(`A user connected: ${socket.id}`);

		socket.on("join", (name) => {
			console.log(`${name} has joined the chat.`);
			socket.username = name;
			users.push(name);
      userSocketMap.set(name, socket.id);
			socket.join("All");
			io.emit("updateUsers", users);
			socket.emit("message", {
				content: `Hello ${name}! You have joined the chat!`,
				sender: "System",
				room: "All",
			});
			socket.broadcast.emit("message", {
				content: `${name} has joined the chat.`,
				sender: "System",
				room: "All",
			});
		});

		socket.on("disconnect", () => {
			console.log(`${socket.username} disconnected:`, socket.id);
			const userIndex = users.indexOf(socket.username);
			if (userIndex !== -1) {
				const disconnectedUser = users.splice(userIndex, 1)[0];
				io.emit("updateUsers", users);
				socket.broadcast.emit("message", {content: `${socket.username} has left the chat.`, sender: "System", room: "All"});
			}
		});

		socket.on("message", (msgObj) => {
      const { content, sender, room } = msgObj;
      if (room === "All") {
        io.to("All").emit("message", msgObj);
      } else {
        // Handle private messages
        const participants = room.split('-');
        const receiver = participants.find(user => user !== sender);
        const receiverSocketId = userSocketMap.get(receiver);
        
        if (receiverSocketId) {
          // Send to both sender and receiver
          io.to(socket.id).emit("message", msgObj);
          io.to(receiverSocketId).emit("message", msgObj);
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
