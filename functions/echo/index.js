'use strict'

const request = require('axios')

exports.handle = (req, context, callback) => {
  let body = req["body-json"]
  console.log(body)

  if (body.events) {
    let message = body.events.find(event => event.type === 'message')
    if (message) {
      console.log(message)

      let data = {
        replyToken: message.replyToken,
        messages: [
          message.message
        ]
      }

      request.post('https://api.line.me/v2/bot/message/reply', data, {
        headers: {
          Authorization: 'Bearer ' + process.env.LINE_TOKEN
        }
      }).then(res => {
        console.log(res.status)

        return callback(null, message)
      }).catch(callback)
    }
  } else {
    callback(null, {})
  }
}
