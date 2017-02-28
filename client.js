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

require('colors');

// Each message should be formatted as follow:
//
// {
//   timestamp: Date.now() / 10000,
//   message: String(''),
//   nickname: String('')
// }
//
// Pretty basic ey?
const messages = [];
const cs = new require('net').Socket();
const port = process.env.PORT || 31337;

/**
 * Parses a given server string
 * i.e: localhost:31337 becomes { host: 'locahost', port: 31337 }
 *
 * @param uri {String}
 *
 * @returns {Object} defaults to localhost and 31337
 */
const parseURI = (uri = '') => {
  const arr = uri.trim().split(':');
  return {
    host: arr[0] || 'localhost',
    port: arr[1] || 31337
  };
};

/**
 * Initialize default config for the client
 */
let config = parseURI();

/**
 * Returns a timestamped object with the given nickname and message
 *
 * @param nickname {String}
 * @param message {String}
 *
 * @returns {Object}
 */
const formatMessage = (nickname, message) => {
  return {
    timestamp: Date.now(),
    nickname,
    message
  };
};

/**
 * Renders the entire tty screen
 *
 * @returns undefined
 */
const draw = () => {
  // Get dimension
  const columns = process.stdout.columns;
  const rows = process.stdout.rows;

  // Get tty columns
  const filler = Array(columns)
              .fill(' ')
              .join('');

  // Get tty rows
  Array(rows - 1)

    // Fill
    .fill(0)

    // Loop
    .forEach((x, i, a) => {
      // Get the current index in reverse
      const index = a.length - 1 - i;

      // Get the message in reverse without mutating
      // the messages array
      const item = Array
        .from(messages)
        .reverse()[index];

      // Timestamped message
      if (item && item  !== -1) {
        const timestamp = (new Date(item.timestamp)).toLocaleTimeString();
        const nickname = item.nickname;

        let nickPrompt = `<${item.nickname}>`;
        if (cs.nickname === item.nickname) {
          item.message = item.message.dim;
          nickPrompt = '>';
        }
        let msg = `${timestamp.dim} ${nickPrompt} ${item.message}`;

        if (nickname.match(/(server|chatli)/i)) {
          msg = `[ ${nickname.toUpperCase()} ] - ${item.message}`.red;
        }

        return console.log(msg);
      } else {
        // Write to standard out
        console.log(filler);
      }
    });

  let pre = '';
  if (cs.nickname) pre = `${cs.nickname} > `;
  process.stdout.write(`\r[~] ${pre}`);
}

// Init draw
draw();

// On data
cs.on('data', d => {
  let nickname = '';
  let message = '';

  try {
    const payload = JSON.parse(d.toString().trim());
    nickname = payload.nickname;
    message = payload.message;
  } catch(e) {
    nickname = 'server';
    message = d.toString().trim();

    if (message.match(/(registered|known)/i)) {
      cs.nickname = message.split(' ').pop();
    }
  }

  message.split('\n').forEach(m => {
    messages.push(formatMessage(nickname, m));
  });

  draw();
});

// On end
cs.on('end', () => {
  messages.push(formatMessage('chatli', 'Disconnected!'));
  draw();
});

// On connect
cs.on('connect', () => {
  messages.push(formatMessage('chatli', 'Connection Established!'));
  draw();
});

// On error
cs.on('error', e => {
  messages.push(formatMessage(
    'Chatli',
    e.message
  ));

  draw();
});

cs.on('connect', () => {
});

// read user inputs
process.stdin.on('data', (d) => {
  // Trim message
  const tm = d.toString().trim();

  // Ignore empty
  if (tm === '') return draw();

  // quit cmd
  if (tm.match(/^\/(quit|close|exit)/i)) process.exit(1);
  // connect cmd
  if (tm.match(/^\/connect/i) && !cs.writable) {
    // update config
    config = parseURI(tm.split('/connect')[1].trim());
    // then connect
    cs.connect(config);
  }

  // If socket is not yet writable/connected
  if (!cs.writable) {
    messages.push(formatMessage(
      'Chatli',
      'You are disconnected. Connect with /connect <server:port>'
    ));
    return draw();
  }

  // If not yet registered
  if (!cs.nickname && !tm.match(/^\/nick/i)) {
    draw();
    return;
  }

  cs.write(tm);
  draw();
});

cs.connect(config);
