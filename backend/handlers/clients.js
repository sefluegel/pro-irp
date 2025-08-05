// backend/handlers/clients.js
const jwt    = require('jsonwebtoken');
const AWS    = require('aws-sdk');
const db     = new AWS.DynamoDB.DocumentClient();
const CT     = process.env.CLIENTS_TABLE;
const JS     = process.env.JWT_SECRET;

function auth(evt) {
  const token = evt.headers.Authorization?.split(' ')[1];
  if (!token) throw 'No token';
  try { return jwt.verify(token, JS) }
  catch { throw 'Invalid token' }
}

exports.handler = async evt => {
  const d = JSON.parse(evt.body||'{}');
  try {
    const user = auth(evt);
    const owner = user.email;

    switch(evt.httpMethod) {
      case 'GET':
        const { Items } = await db.query({
          TableName:CT,
          KeyConditionExpression: 'owner = :o',
          ExpressionAttributeValues:{':o':owner}
        }).promise();
        return { statusCode:200, body: JSON.stringify(Items) };

      case 'POST':
        const id = Date.now().toString();
        await db.put({
          TableName:CT,
          Item:{ owner, clientId:id, ...d }
        }).promise();
        return { statusCode:201, body: JSON.stringify({ clientId:id }) };

      case 'DELETE':
        await db.delete({
          TableName:CT,
          Key:{ owner, clientId:d.clientId }
        }).promise();
        return { statusCode:204, body: '' };

      default:
        return { statusCode:405, body: '' };
    }
  } catch(err) {
    return { statusCode:401, body: JSON.stringify({ error:err.toString() }) };
  }
};
