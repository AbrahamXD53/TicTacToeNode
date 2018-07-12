var board = new Vue({
    el: '#app',
    data: {
        socket: [],
        logged: false,
        playing: false,
        username: 'anon453534',
        room: null,
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
        playerTurn: 0,
        player: 0,
        winner: 0
    },
    created() {
        socket = io.connect('http://10.153.9.203:3000', { 'forceNew': true })
        socket.on('server', this.server)
        socket.on('disconnect', (reason) => {
            this.logged = false
            this.playing = false
        })

    },
    methods: {
        login() {
            socket.emit('login', { id: this.username })
            logged = true
        },
        search() {
            socket.emit('match-making')
        },
        surrender() {
            socket.emit('finish')
        },
        sendButton(x, y) {
            if (this.winner == 0) {
                if (this.playerTurn == this.player)
                    if (this.board[y][x] == 0)
                        socket.emit('button', { room: this.room, x: x, y: y })
                    else
                        console.log('board')

            }
            else
                console.log('winner')
        },
        server(data) {
            console.log(data)
            if (data.action)
                switch (data.action) {
                    case "login":
                        {
                            if (data.id) {
                                this.logged = true
                            }
                        }
                        break;
                    case "match":
                        {
                            if (data.name) {
                                this.board = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
                                this.playing = true
                                this.room = data.name,
                                    this.player = data.player
                                this.playerTurn = data.turn
                                this.winner = 0
                            }
                        }
                        break;
                    case "timeup":
                        {
                            this.playing = false
                        }
                        break;
                    case "disconnection":
                        {
                            this.playing = false
                        }
                        break;
                    case 'button':
                        {
                            this.winner = data.winner
                            this.board = data.data
                            this.playerTurn = data.turn
                        }
                        break;
                    case 'reconnection':
                        {
                            this.room = data.room
                            this.playing = true
                            this.logged = true
                            this.player = data.player
                            this.winner = data.winner
                            this.board = data.board
                            this.playerTurn = data.turn
                        }
                        break;
                }


        }

    }
})