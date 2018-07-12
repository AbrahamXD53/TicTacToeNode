var express =require('express')
var app = express()
var server =require('http').Server(app)
var io = require('socket.io')(server)

app.use(express.static('client'))

var messages= [
    {id:1,text:"Bienvenido al chat",nickname:"SysBot"}
]

var welcomeMessage = {id:1,text:"Bienvenido al chat",nickname:"SysBot"}
io.on('connection',(socket)=>{
    console.log("Client connected "+ socket.handshake.address)
    socket.emit("messages",welcomeMessage)
    socket.broadcast.emit('messages',{nickname:"Sysbot",text:"New user joinned"})

    socket.on('add-message',(data)=>{
        socket.broadcast.emit('messages',data)
    })

    socket.on('auth',(data)=>{
        console.log(socket.rooms)
    })

    socket.on('hi',(data)=>{
        console.log("Hello from" + socket.id)
    })
})

server.listen(7777,()=>{
    console.log("Server Ready!")
})