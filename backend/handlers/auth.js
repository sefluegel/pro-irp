// backend/handlers/auth.js
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const dynamo = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE;
const JWT_SECRET = process.env.JWT_SECRET;

exports.handler = async (event) => {
  const { path, httpMethod, body } = event;
  const data = JSON.parse(body || '{}');

  if (path === '/signup' && httpMethod === 'POST') {
    const { email, password } = data;
    if (!email || !password) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Email & password required' }) };
    }
    const hash = await bcrypt.hash(password, 8);
    await dynamo.put({
      TableName: USERS_TABLE,
      Item: { email, passwordHash: hash }
    }).promise();
    return { statusCode: 201, body: JSON.stringify({ message: 'User created' }) };
  }

  if (path === '/login' && httpMethod === 'POST') {
    const { email, password } = data;
    const res = await dynamo.get({
      TableName: USERS_TABLE,
      Key: { email }
    }).promise();
    const user = res.Item;
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '2h' });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  }

  return { statusCode: 404, body: JSON.stringify({ error: 'Route not found' }) };
};
