#!/usr/bin/env node
/**
 * Provision the DynamoDB tables FoodLink needs.
 *   node scripts/aws-create-tables.js
 *
 * Idempotent: skips creation if a table already exists.
 * Uses the same credential chain as the running app.
 */
require('dotenv').config();
const {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceNotFoundException,
} = require('@aws-sdk/client-dynamodb');

const region = process.env.AWS_REGION || 'us-east-1';
const credentials =
  process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    : undefined;

const client = new DynamoDBClient({ region, credentials });

const usersTable = process.env.DYNAMODB_TABLE_USERS || 'foodlink_users';
const donationsTable = process.env.DYNAMODB_TABLE_DONATIONS || 'foodlink_donations';

const tables = [
  {
    TableName: usersTable,
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' },
    ],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: donationsTable,
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

async function exists(name) {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch (err) {
    if (err instanceof ResourceNotFoundException) return false;
    throw err;
  }
}

async function main() {
  for (const spec of tables) {
    if (await exists(spec.TableName)) {
      console.log(`✓ ${spec.TableName} already exists`);
      continue;
    }
    console.log(`→ creating ${spec.TableName} ...`);
    await client.send(new CreateTableCommand(spec));
    console.log(`✓ ${spec.TableName} create requested`);
  }
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
