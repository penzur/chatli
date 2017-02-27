/**
Copyright (c) 2017 Elizar Pepino <jupenz@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/
'use strict';

const sockets = [];
const port = process.env.PORT || 31337;

/**
 * Format's the message to be sent to the clients
 * from the server.
 *
 * @param nickname {String} The sender's nickname
 * @param message {String} The message string
 *
 * @returns undefined
 */
const jsonStr = (nickname, message) => {
  return JSON.stringify({
    nickname,
    message
  });
};

/**
 * Broadcasts message to a given list of sockets
 *
 * @param sockets {Array} A list of active/connected socket clients
 * @param message {String} The message to be sent to the clients
 *
 * @returns undefined
 */
const broadcast = (sockets, message, excluded = undefined) => {
  sockets
    .forEach(s => {
      if (excluded && s === excluded) return;
      s.write(message);
    });
};

/**
 * Handles disconnected client
 *
 * @param sock {Object} A socket client
 *
 * @returns undefined
 */
function socketOnEndHandler() {
  const sock = this;
  const index = sockets.indexOf(sock);

  sockets.splice(index, 1);
  if (sock.nickname) {
    console.log(`[ Socket Server ] - user ${sock.nickname} disconnected!`);
    broadcast(sockets, `${sock.nickname} disconnected from the server`);
  }
};

/**
 * Handles message being sent from the clients. Also context of this function
 * is bound to a socket client.
 *
 * @param data {Buffer} Data from the clients
 *
 * @returns undefined
 */
function socketOnDataHandler(data) {
  const sock = this;
  const message = data.toString().trim();

  if(message.match(/^\/(quit|disconnect|exit|dc)/i)) {
    sock.write('Goodbye!\n');
    sock.end();
    return;
  }

  if(message.match(/^\/nick /i)){
    const nickname = message.split(' ')[1].trim();

    if (nickname === '') {
      sock.write('Please enter a valid nickname!\n');
      return;
    }

    if (sockets.find(s => s.nickname === nickname)) {
      sock.write('That nickname is already taken!\n');
      return;
    }

    const oldNick = sock.nickname;
    sock.nickname = nickname;

    if (oldNick) {
      sock.write('You are now known as ' + nickname);
      return;
    }

    sockets.push(sock);

    console.log(`[ Socket Server ] - user ${nickname} joined the server`);
    sock.write('Congrats! You are now registered as ' + nickname + '\n');
    broadcast(sockets, `${sock.nickname} joined`, sock);

    clearTimeout(sock.timeout);
    return;
  }

  if (sockets.indexOf(sock) !== -1) {
    broadcast(sockets, jsonStr(sock.nickname, message));
  }
}

require('net')

  // Create the socket server
  .createServer(sock => {
    sock.write('Greetings! Please register with /nick <username>\n');
    sock.write('You have 20 seconds to register\n');

    // attach timeout to socket object so we can access it from event handlers
    sock.timeout = setTimeout(() => {
      // Make sure socket is still active. Otherwise, we remove it
      if (!sock.writable) {
        clearTimeout(sock.timeout);
        sockets.splice(sockets.indexOf(sock, 1));
        return;
      }

      sock.write('You did not register\n');
      sock.write('Bye!\n');
      sock.end();
    }, 1000 * 20);

    sock.on('end', socketOnEndHandler.bind(sock));
    sock.on('data', socketOnDataHandler.bind(sock));
  })

  // Run it
  .listen(port, () => {
    console.log('[ Socket Server ] - Now accepting connection on port ' + port);
  });
