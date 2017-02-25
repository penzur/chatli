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

// messages container
const messages = [];
// Chat server
const cs = new require('net').Socket();


/****************************************************************************
 *
 *                            - Draw Methods -
 *
 ****************************************************************************/
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
        const tt = (new Date(item.timestamp)).toLocaleTimeString();
        let msg = `${tt.dim} <${item.nickname}> - ${item.message.dim}`;

        if (item.nickname === 'server') {
          msg = `[ ${'Server'.cyan.dim} ] - ${item.message.magenta.dim}`
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

// Draw
draw();

// Data
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

  messages.push({
    timestamp: Date.now(),
    nickname,
    message
  });

  draw();
});

// read user inputs
process.stdin.on('data', (d) => {
  // If socket is not yet writable/connected
  if (!cs.writable) return draw();

  // Trim message
  const tm = d.toString().trim();

  // Ignore empty
  if (tm === '') return draw();

  // On quit
  if (tm.match(/^\/(quit|close|exit)/i)) process.exit(1);

  // If not yet registered
  if (!cs.nickname && !tm.match(/^\/nick/i)) {
    draw();
    return;
  }

  cs.write(tm);
  draw();
});

cs.connect(process.env.CHAT_SERVER || 31337);
