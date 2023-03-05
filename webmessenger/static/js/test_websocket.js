const wsUri = "wss://ws.postman-echo.com/raw";

let websocket;

websocket = new WebSocket(wsUri);

websocket.onopen = function (event) {
    console.log('Connected');
}
websocket.onclose = function (event) {
    console.log('Disconnect');
}
websocket.onmessage = function (event) {
    console.log(event)
}


