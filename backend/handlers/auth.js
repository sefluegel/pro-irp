// backend/handlers/auth.js
const jwt    = require('jsonwebtoken');
const AWS    = require('aws-sdk');
const bcrypt = require('bcryptjs');
const db     = new AWS.DynamoDB.DocumentClient();
const UT     = process.env.USERS_TABLE;
const JS     = process.env.JWT_SECRET;

exports.handler = async evt => {
  const { path, httpMethod, body="" } = evt;
  const data = JSON.parse(body);

  if (path==='/signup' && httpMethod==='POST') {
    const { email,password } = data;
    if (!email||!password) {
      return { statusCode:400, body: JSON.stringify({ error:'Email+password required' }) };
    }
    const hash = await bcrypt.hash(password,8);
    await db.put({ TableName:UT, Item:{ email, passwordHash:hash } }).promise();
    return { statusCode:201, body: JSON.stringify({ message:'User created' }) };
  }

  if (path==='/login' && httpMethod==='POST') {
    const { email,password } = data;
    const res = await db.get({ TableName:UT, Key:{ email } }).promise();
    const u   = res.Item;
    if (!u || !(await bcrypt.compare(password,u.passwordHash))) {
      return { statusCode:401, body: JSON.stringify({ error:'Invalid creds' }) };
    }
    const token = jwt.sign({ email }, JS, { expiresIn:'2h' });
    return { statusCode:200, body: JSON.stringify({ token }) };
  }

  return { statusCode:404, body: JSON.stringify({ error:'Not found' }) };
};
