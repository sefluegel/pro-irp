// backend/handlers/clients.js
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const dynamo = new AWS.DynamoDB.DocumentClient();
const CLIENTS_TABLE = process.env.CLIENTS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;

function authorize(event) {
  const token = event.headers.Authorization?.split(' ')[1];
  if (!token) throw 'No token';
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    throw 'Invalid token';
  }
}

exports.handler = async (event) => {
  let body = {};
  if (event.body) body = JSON.parse(event.body);
  try {
    const user = authorize(event);
    const email = user.email;

    switch (event.httpMethod) {
      case 'GET':
        const list = await dynamo.query({
          TableName: CLIENTS_TABLE,
          KeyConditionExpression: 'owner = :o',
          ExpressionAttributeValues: { ':o': email }
        }).promise();
        return { statusCode: 200, body: JSON.stringify(list.Items) };

      case 'POST':
        const id = Date.now().toString();
        await dynamo.put({
          TableName: CLIENTS_TABLE,
          Item: { owner: email, clientId: id, ...body }
        }).promise();
        return { statusCode: 201, body: JSON.stringify({ clientId: id }) };

      case 'PUT':
        await dynamo.update({
          TableName: CLIENTS_TABLE,
          Key: { owner: email, clientId: body.clientId },
          UpdateExpression: 'set #n = :n, meds = :m',
          ExpressionAttributeNames: { '#n': 'name' },
          ExpressionAttributeValues: { ':n': body.name, ':m': body.medications }
        }).promise();
        return { statusCode: 200, body: JSON.stringify({}) };

      case 'DELETE':
        await dynamo.delete({
          TableName: CLIENTS_TABLE,
          Key: { owner: email, clientId: body.clientId }
        }).promise();
        return { statusCode: 204, body: '' };

      default:
        return { statusCode: 405, body: '' };
    }
  } catch (err) {
    return { statusCode: 401, body: JSON.stringify({ error: err.toString() }) };
  }
};
