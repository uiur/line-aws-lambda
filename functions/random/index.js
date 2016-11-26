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

function findUser (userId) {
  console.log(userId)
  return new Promise((resolve, reject) => {
    db.get({
      TableName: 'line_users',
      Key: {
        user_id: userId
      }
    }, (err, data) => {
      if (err) return reject(err)
      resolve(data.Item)
    })
  })
}

exports.handle = (req, context, callback) => {
  let body = req["body-json"]
  console.log(body)

  if (body.events) {
    const handledEvents =
      body.events
        .filter(event => event.type === 'message')
        .map(handleEvent)

    Promise.all(handledEvents).then(callback).catch(callback)
  } else {
    // debug
    findAllUsers().then(users => {
      callback(null, users)
    }).catch(callback)
  }
}

function setUserTarget (userId, to) {
  return new Promise((resolve, reject) => {
      db.update({
        TableName: 'line_users',
        Key: {
          user_id: userId
        },
        UpdateExpression: 'set #key = :to',
        ExpressionAttributeNames: {
          "#key": 'to'
        },
        ExpressionAttributeValues: {
          ":to": to
        },
        ReturnValues: 'UPDATED_NEW'
      }, err => {
        if (err) {
          console.error(err)
          return reject(err)
        }

        resolve()
      })
    })
}

function handleEvent (event) {
  console.log(event)

  const userId = event.source.userId
  const text = event.message.text

  if (text === 'てすと') {
    return findUser(userId)
  }

  switch (text) {
    case 'チェンジ':
      return findUser(userId).then(user => {
        if (user) {
          return Promise.all([
            setUserTarget(user.user_id, null),
            setUserTarget(user.to, null)
          ])
        }
      })

      break

    case 'ジョイン':
      return new Promise((resolve, reject) => {
        db.scan({
          TableName: 'line_users',
          FilterExpression: "user_id <> :user_id and attribute_not_exists (#to)",
          ExpressionAttributeNames: {
            '#to': 'to'
          },
          ExpressionAttributeValues: {
            ':user_id': userId
          }
        }, (err, data) => {
          if (err) return reject(err)
          resolve(data.Items)
        })
      }).then(users => {
        console.log(users)
        return users[Math.floor(Math.random() * users.length)]
      }).then(target => {
        return Promise.all([
          setUserTarget(userId, target.user_id),
          setUserTarget(target.user_id, userId)
        ]).then(() => { return [userId, target.user_id] })
      }).then((values) => {
        const userId = values[0]
        const targetId = values[1]

        return Promise.all([
          push({
            to: userId,
            messages: [ { type: 'text', text: targetId + ' との会話が始まりました' } ]
          }),
          push({
            to: targetId,
            messages: [ { type: 'text', text: userId + ' との会話が始まりました' } ]
          })
        ])
      })

      break
  }

  return findUser(userId).then(user => {
    if (!user.to) return

    return push({
      to: user.to,
      messages: [ event.message ]
    })
  })
}
