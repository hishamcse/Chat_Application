const path = require('path');
const http = require('http')
const express = require('express');
const socketio = require('socket.io')
const Filter = require('bad-words')
const {generateMessage, generateLocationMessage} = require('./utils/messages.js')
const {addUser, removeUser, getUser, getUsersInRoom} = require('./utils/users.js')
const e = require("express");

const app = express();
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

// socket.emit -> only to particular user whose socket it is
// socket.broadcast -> everybody except the user himself
// io.emit -> everybody
// socket.broadcast.to.emit -> everybody in a specific chat room except the user himself
// io.to.emit -> everybody in a chat room

// when connection established
io.on('connection', (socket) => {

    // user joins the room
    socket.on('join', ({username, room}, callBack) => {
        const {error, user} = addUser({id: socket.id, username, room});

        if (error) {
            return callBack(error);
        }

        socket.join(user.room);

        // welcome message when a user enters
        socket.emit('message', generateMessage("ADMIN", "WELCOME!!"));
        socket.broadcast.to(user.room).emit('message', generateMessage("ADMIN", `${user.username} has just joined!!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callBack()
    })

    // message transfer
    socket.on('sendMessage', (message, callBack) => {
        const user = getUser(socket.id);

        const filter = new Filter();
        if (filter.isProfane(message)) {
            return callBack('Profanity is not allowed!');
        }

        io.to(user.room).emit('message', generateMessage(user.username, message));
        callBack()
    })

    // share location with others
    socket.on('sendLocation', (position, callBack) => {
        if (!position) {
            return callBack(`Error! Can't find location!!`)
        }

        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${position.latitude},${position.longitude}`));
        callBack()
    })

    // when user disconnected
    socket.on('disconnect', () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage("ADMIN", `${user.username} has left just now`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});