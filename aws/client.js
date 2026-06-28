/**
 * Lazy AWS SDK v3 client factory.
 *
 * Credential resolution:
 *   - If AWS_ACCESS_KEY_ID & AWS_SECRET_ACCESS_KEY are set, use them.
 *   - Otherwise, fall back to the default provider chain so the app picks
 *     up an attached IAM role automatically (EC2 instance role, ECS task
 *     role, Lambda execution role, etc.).
 *
 * Clients are memoized so each process keeps a single connection pool.
 */
const { S3Client } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { SNSClient } = require('@aws-sdk/client-sns');

let s3, ddb, ddbDoc, sns;

function region() {
  return process.env.AWS_REGION || 'us-east-1';
}

function credentials() {
  const id = process.env.AWS_ACCESS_KEY_ID;
  const secret = process.env.AWS_SECRET_ACCESS_KEY;
  if (id && secret) {
    return {
      accessKeyId: id,
      secretAccessKey: secret,
      ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
    };
  }
  return undefined; // → default provider chain (IAM role)
}

function getS3() {
  if (!s3) s3 = new S3Client({ region: region(), credentials: credentials() });
  return s3;
}

function getDynamoDB() {
  if (!ddb) ddb = new DynamoDBClient({ region: region(), credentials: credentials() });
  return ddb;
}

function getDynamoDoc() {
  if (!ddbDoc) {
    ddbDoc = DynamoDBDocumentClient.from(getDynamoDB(), {
      marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
    });
  }
  return ddbDoc;
}

function getSNS() {
  if (!sns) sns = new SNSClient({ region: region(), credentials: credentials() });
  return sns;
}

module.exports = { getS3, getDynamoDB, getDynamoDoc, getSNS, region };
