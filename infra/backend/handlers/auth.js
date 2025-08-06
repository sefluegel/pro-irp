const AWS = require('aws-sdk');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE = process.env.USERS_TABLE;
const SECRET = process.env.JWT_SECRET;
const SALT_ROUNDS = 10;

exports.signup = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    await dynamo.put({
      TableName: TABLE,
      Item: { email, passwordHash: hash }
    }).promise();

    return { statusCode: 201, body: JSON.stringify({ message: 'User created' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

exports.login = async (event) => {
  try {
    const { email, password } = JSON.parse(event.body);
    const { Item } = await dynamo.get({
      TableName: TABLE,
      Key: { email }
    }).promise();

    if (!Item || !(await bcrypt.compare(password, Item.passwordHash))) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid credentials' }) };
    }

    const token = jwt.sign({ email }, SECRET, { expiresIn: '2h' });
    return { statusCode: 200, body: JSON.stringify({ token }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
