'use strict';

const sockets = [];

// Format message with nickname and JSON stringify for payload
const jsonStr = (nickname, message) => {
  return JSON.stringify({
    nickname,
    message
  });
};

// Broadcasts to a given sockets excluding an optional socket param
const broadcast = (sockets, message, excluded = undefined) => {
  sockets
    .forEach(s => {
      if (excluded && s === excluded) return;
      s.write(message);
    });
};

require('net')

  // Create socket server
  // and register each socket with proper nickname identifier
  .createServer(sock => {
    // Send greetings
    sock.write('Greetings! Please register with /nick <username>\n');
    sock.write('You have 20 seconds to register\n');
    // Disconnect after 20 seconds if not yet registered
    const timeout = setTimeout(() => {
      sock.write('You did not register\n');
      sock.write('Disconnecting...\n');
      sock.end();
    }, 1000 * 20);

    sock.on('end', () => {
      const i = sockets.indexOf(sock);
      sockets.splice(i, 1);
      if (sock.nickname) {
        console.log(`[ Socket Server ] - user ${sock.nickname} disconnected!`);
        // broadcast
        broadcast(
          sockets,
          `${sock.nickname} disconnected from the server`
        );
      }
    });

    // On message
    sock.on('data', d => {
      const message = d.toString().trim();

      if(message.match(/^\/(quit|disconnect|exit|dc)/i)) {
        sock.write('Goodbye!\n');
        sock.end();
        return;
      }

      // Check for registration
      if(message.match(/^\/nick /i)){
        const nickname = message.split(' ')[1].trim();

        // if empty
        if (nickname === '') {
          sock.write('Please enter a valid nickname!\n');
          return;
        }

        // if nickname is taken
        if (sockets.find(s => s.nickname === nickname)) {
          sock.write('That nickname is already taken!\n');
          return;
        }

        // Set or update nickname
        const oldNick = sock.nickname;
        sock.nickname = nickname;

        // If registered already then do nothing. We just
        // change the user's nickname
        if (oldNick) {
          sock.write('You are now known as ' + nickname);
          return;
        }

        // Register
        sockets.push(sock);


        // Notify
        sock.write('Congrats! You are now registered as ' + nickname + '\n');
        console.log(`[ Socket Server ] - user ${nickname} joined the server`);
        broadcast(sockets, `${sock.nickname} joined`, sock);

        clearTimeout(timeout);
        return;
      }

      // For regular messages
      if (sockets.indexOf(sock) !== -1) {
        broadcast(sockets, jsonStr(sock.nickname, message));
      }
    });
  })

  // Bind 31337 port
  .listen(31337, () => {
    console.log('[ Socket Server ] - Now accepting connection on port 31337');
  });
