// use dynamodb for persistence

'use strict'

const request = require('axios')
const AWS = require('aws-sdk')

const db = new AWS.DynamoDB.DocumentClient()

function findAllUsers () {
  return new Promise((resolve, reject) => {
    db.scan({
      TableName: 'line_users'
    }, (err, data) => {
      if (err) {
        return reject(err)
      }

      resolve(data.Items)
    })
  })
}

function push (data) {
  return request.post('https://api.line.me/v2/bot/message/push', data, {
    headers: {
      Authorization: 'Bearer ' + process.env.LINE_TOKEN
    }
  })
}

function putUser (data) {
  return new Promise((resolve, reject) => {
     db.put({
      TableName: 'line_users',
      Item: data
    }, err => {
      if (err) return reject(err)
      resolve()
    })
  })
}

exports.handle = (req, context, callback) => {
  let body = req["body-json"]
  console.log(body)

  if (body.events) {
    let message = body.events.find(event => event.type === 'message')
    if (message) {
      console.log(message)

      let userId = message.source.userId

      findAllUsers().then(users => {
        const broadcasted = users
          .filter(user => user.user_id != userId)
          .map(user => {
            return push({ to: user.user_id, messages: [message.message] })
          })

        Promise.all(broadcasted, putUser({ user_id: userId }))
          .then(callback)
          .catch(callback)

      }).catch(callback)
    }
  } else {
    findAllUsers().then(users => {
      callback(null, users)
    }).catch(callback)
  }
}
