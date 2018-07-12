var express = require('express')
var app = express()
var server = require('http').Server(app)
var io = require('socket.io')(server)

var sessions = []
var connections = []
var userData = []
var connectedUsers = []
var matches = []
var userInMatches = []

app.use(express.static('client'))

class Board {
    constructor() {
        this.cells = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
    }
    get stream() {
        return this.cells
    }
    get winner() {
        let checks = [
            [[0, 0], [0, 1], [0, 2]],
            [[1, 0], [1, 1], [1, 2]],
            [[2, 0], [2, 1], [2, 2]],
            [[0, 0], [1, 0], [2, 0]],
            [[0, 1], [1, 1], [2, 1]],
            [[0, 2], [1, 2], [2, 2]],
            [[0, 0], [1, 1], [2, 2]],
            [[0, 2], [1, 1], [2, 0]]
        ]
        for (var i = 0; i < 8; i++) {
            var sum = 0
            for (var j = 0; j < 3; j++) {
                sum += this.cells[checks[i][j][0]][checks[i][j][1]]
            }
            if (Math.abs(sum) === 3)
                return sum / Math.abs(sum)
        }
        return 0
    }
    setCell(x, y, value) {
        if (this.cells[y][x] != 0)
            return false
        this.cells[y][x] = value
        return true
    }
}

function getConnectedUsers() {
    connectedUsers = []
    io.in('general').clients((error, clients) => {
        if (error) throw error
        clients.forEach(client => {
            connectedUsers.push(connections[client])
        })
    })
}
function finishRoom(key) {
    for (var user in matches[key].users) {
        if (sessions[matches[key].users[user]]) {
            sessions[matches[key].users[user]].emit('server', { action: "timeup", server: 'Time over' })
            sessions[matches[key].users[user]].leave(key)
        }
        if (userInMatches[user]) {
            var index = userInMatches[user].indexOf(key)
            if (index >= 0) {
                if (userInMatches[user].length > 1) {
                    userInMatches[user].splice(index, 1)
                }
                else {
                    delete userInMatches[user]
                }
                sessions[matches[key].users[user]].emit('server', { server: 'leave', rooms: socket.rooms })
            }
        }

        delete userInMatches[matches[key].users[user]]
    }
    delete matches[key]
}

io.on('connection', (socket) => {

    console.log('new connection')
    socket.emit('server', { message: 'welcome' })

    /*Create session */
    socket.on('login', (data) => {
        if (connections[socket.id] === undefined || sessions[data.id].id != socket.id) {
            if (sessions[data.id] != undefined) {
                socket.emit('server', { message: 'Session was active' })
                sessions[data.id].emit('server', { action: 'disconnection', message: 'Session override' })
                sessions[data.id].disconnect(true)
            }
            sessions[data.id] = socket
            connections[socket.id] = data.id

            if (userInMatches[connections[socket.id]]) {
                var userMatches = userInMatches[connections[socket.id]]
                for (const key in userMatches) {
                    socket.emit('server', { action: "join", server: 'Reconetion to:' + userMatches[key] })
                    socket.emit('server',{action:'reconnection',
                        room: userMatches[key],
                        board:matches[userMatches[key]].board.stream,
                        turn:matches[userMatches[key]].playerTurn,
                        winner:matches[userMatches[key]].board.winner,
                        player:matches[userMatches[key]].users[0] == connections[socket.id] ? 1 : -1})
                    socket.join(userMatches[key])
            
                }
            }

            socket.join('general')
        } else {
            socket.emit('server', { server: 'Already authenticated' })
        }
        socket.emit('server', { action: 'login', 'id': socket.id })
        getConnectedUsers()
    })

    socket.on('disconnect', (reason) => {
        console.log('disconnect with reason')
        console.log(reason)
        getConnectedUsers()
    })

    socket.on('logout', (data) => {
        getConnectedUsers();
    })

    socket.on('users', (data) => {
        if (connections[socket.id]) {
            socket.emit('server', { users: connectedUsers })
        }
    })

    socket.on('broadcast', (data) => {
        if (connections[socket.id]) {
            socket.in(data.room).broadcast.emit('server', { bc: data })
        }
    })

    socket.on('match-making', (data) => {
        if (connections[socket.id]) {
            var me = connections[socket.id]
            var enemy = me

            for (var user in connectedUsers)  /* Match making policy */ {
                if (me != connectedUsers[user]) {
                    if (!userInMatches[connectedUsers[user]]) {
                        enemy = connectedUsers[user]
                        break;
                    }
                }
            }
            console.log(me, enemy)
            if (me != enemy) {
                var matchName = me + "vs" + enemy

                socket.join(matchName)
                sessions[enemy].join(matchName)

                if (!userInMatches[me])
                    userInMatches[me] = []
                userInMatches[me].push(matchName)

                if (!userInMatches[enemy])
                    userInMatches[enemy] = []
                userInMatches[enemy].push(matchName)

                matches[matchName] = { users: [me, enemy], timeRemaing: 90, board: new Board(), playerTurn: 1 }

                socket.emit('server', { action: "match", name: matchName, rooms: socket.rooms, player: 1, turn: 1 })
                sessions[enemy].emit('server', { action: "match", name: matchName, rooms: socket.rooms, player: -1, turn: 1 })
            }
            else {
                socket.emit('server', { server: 'No available users' })
            }
        }
    })

    socket.on('join', (data) => {
        if (connections[socket.id]) {
            if (socket.rooms[data.name])
                socket.emit('server', { server: socket.rooms[data.name] })
            else {
                socket.join(data.name)
                if (!userInMatches[connections[socket.id]])
                    userInMatches[connections[socket.id]] = []
                userInMatches[connections[socket.id]].push(data.name)
            }
            socket.emit('server', { server: 'join', rooms: socket.rooms })
        }
        console.log(io.sockets.adapter.rooms)
    })

    socket.on('leave', (data) => {
        if (connections[socket.id]) {
            socket.leave(data.name)
            if (userInMatches[connections[socket.id]]) {
                var index = userInMatches[connections[socket.id]].indexOf(data.name)
                if (index >= 0) {
                    if (userInMatches[connections[socket.id]].length > 1) {
                        userInMatches[connections[socket.id]].splice(index, 1)
                    }
                    else {
                        delete userInMatches[connections[socket.id]]
                    }
                    socket.emit('server', { server: 'leave', rooms: socket.rooms })
                }
            }
        }
    })

    socket.on('button', (data) => {
        if (connections[socket.id]) {
            if (matches[data.room]) {
                if (matches[data.room].users[matches[data.room].playerTurn < 0 ? 1 : 0] == connections[socket.id]) {
                    if (matches[data.room].board.setCell(data.x, data.y, matches[data.room].users[0] == connections[socket.id] ? 1 : -1)) {
                        matches[data.room].playerTurn = matches[data.room].playerTurn * -1
                        let winner = matches[data.room].board.winner
                        io.in(data.room).emit('server', { action: 'button', data: matches[data.room].board.stream, turn: matches[data.room].playerTurn, winner: winner })
                        if (winner != 0)
                            finishRoom(data.room)
                    }
                }
                else
                console.log("wrong turn")
            }
            else
                console.log("wrong room ",data.room)
        }
        else
                console.log("wrong socket")
    })


    socket.on('rooms', (data) => {
        if (connections[socket.id]) {
            socket.emit('server', { rooms: io.sockets.adapter.rooms })
        }
    })

    socket.on('finish', (data) => {
        if (connections[socket.id]) {
            if (userInMatches[connections[socket.id]]) {
                var match = userInMatches[connections[socket.id]]
                finishRoom(match)
            }
        }
    })

    socket.on('session', (data) => {
        if (connections[socket.id])
            socket.emit('server', { 'session': connections[socket.id], 'rooms': { ids: socket.rooms, names: userInMatches[connections[socket.id]] } })
        else
            socket.emit('server', { 'session': null })
    })

})

const serverInterval = setInterval(() => {
    for (const key in matches) {
        matches[key].timeRemaing--;
        if (matches[key].timeRemaing <= 0) {
            finishRoom(key)
        }
    }
}, 1000)

const PORT = 3000
server.listen(PORT, () => {
    console.log("Server Ready! on:" + PORT)
})