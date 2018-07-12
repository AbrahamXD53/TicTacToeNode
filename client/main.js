Vue.component('message-renderer', {
    props: ['messages'],
    template: `
        <div id="messages">
            <div class="message" v-for="message in messages">
                <strong>{{message.nickname}}</strong> dice:
                <p>{{message.text}}</p>
            </div>
        </div>
    `,
})
var ap = new Vue({
    el: "#chat",
    data: { socket: [], messages: [], nickname: "anon33453", text: "Ok", firstMessage: true },
    mounted() {
        socket = io.connect('http://10.153.9.203:3000', { 'forceNew': true })
        socket.on('messages', this.message)
        socket.on('server', this.server)
        socket.on('disconnect', (reason) => {
            console.log('Disconnected ')
            console.log(reason)
        })
        socket.on('connect', () => {
            console.log('Connection established please authenticate')
        })
    },
    updated() {
        var divMessages = document.getElementById('messages')
        divMessages.scrollTop = divMessages.scrollHeight
    },
    methods: {
        message(e) {
            console.log(e)
            this.messages.push(e)
        },
        server(e) {
            console.log(e)
        },
        addMessage(e) {
            e.preventDefault();
            var msg = { nickname: this.nickname, text: this.text };
            this.messages.push(msg)

            socket.emit('add-message', msg)

            this.text = ""
            this.firstMessage = false
            return false
        }
    }
})