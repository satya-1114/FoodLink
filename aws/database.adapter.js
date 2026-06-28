/**
 * DynamoDB database adapter — low-level helpers used by repositories.
 *
 * Repositories under repositories/dynamodb/ delegate to this module.
 * Services NEVER call here directly — they go through the repository.
 *
 * Tables are configurable:
 *   DYNAMODB_TABLE_USERS      (default: foodlink_users)
 *   DYNAMODB_TABLE_DONATIONS  (default: foodlink_donations)
 *
 * Key schema (recommended; see README for create-table commands):
 *   users:     PK = id (S)   ; optional GSI EmailIndex on (email)
 *   donations: PK = id (S)
 *
 * For listing / search, this adapter uses Scan + FilterExpression. That is
 * fine for small / medium datasets; for high traffic, add GSIs (DonorIndex,
 * StatusIndex) and switch the matching helpers to Query — the repository
 * contract does not change.
 */
const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} = require('@aws-sdk/lib-dynamodb');

const { getDynamoDoc } = require('./client');
const { withRetry, AwsError } = require('./retry');

function usersTable() {
  return process.env.DYNAMODB_TABLE_USERS || 'foodlink_users';
}
function donationsTable() {
  return process.env.DYNAMODB_TABLE_DONATIONS || 'foodlink_donations';
}

/* --------------------------- Generic helpers --------------------------- */

async function put(TableName, Item) {
  await withRetry(() => getDynamoDoc().send(new PutCommand({ TableName, Item })), {
    label: `ddb.put.${TableName}`,
  });
  return Item;
}

async function get(TableName, id) {
  if (!id) return null;
  const { Item } = await withRetry(
    () => getDynamoDoc().send(new GetCommand({ TableName, Key: { id } })),
    { label: `ddb.get.${TableName}` }
  );
  return Item || null;
}

async function remove(TableName, id) {
  await withRetry(
    () => getDynamoDoc().send(new DeleteCommand({ TableName, Key: { id } })),
    { label: `ddb.delete.${TableName}` }
  );
  return true;
}

/**
 * Apply a partial update by building an `UpdateExpression` from `patch`.
 * Reserved DynamoDB words are aliased via ExpressionAttributeNames.
 */
async function patch(TableName, id, partial) {
  const entries = Object.entries(partial).filter(([k]) => k !== 'id');
  if (!entries.length) return get(TableName, id);

  const names = {};
  const values = {};
  const sets = entries.map(([k, v], i) => {
    const nk = `#k${i}`;
    const nv = `:v${i}`;
    names[nk] = k;
    values[nv] = v;
    return `${nk} = ${nv}`;
  });

  const { Attributes } = await withRetry(
    () =>
      getDynamoDoc().send(
        new UpdateCommand({
          TableName,
          Key: { id },
          UpdateExpression: `SET ${sets.join(', ')}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        })
      ),
    { label: `ddb.update.${TableName}` }
  );
  return Attributes || null;
}

/** Full-table scan with optional FilterExpression. Paginates internally. */
async function scanAll(TableName, { FilterExpression, ExpressionAttributeNames, ExpressionAttributeValues } = {}) {
  const items = [];
  let ExclusiveStartKey;
  do {
    // eslint-disable-next-line no-await-in-loop
    const out = await withRetry(
      () =>
        getDynamoDoc().send(
          new ScanCommand({
            TableName,
            FilterExpression,
            ExpressionAttributeNames,
            ExpressionAttributeValues,
            ExclusiveStartKey,
          })
        ),
      { label: `ddb.scan.${TableName}` }
    );
    if (out.Items) items.push(...out.Items);
    ExclusiveStartKey = out.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

/** Query a GSI when available; falls back to scan. */
async function queryByIndex(TableName, IndexName, attr, value) {
  try {
    const { Items = [] } = await withRetry(
      () =>
        getDynamoDoc().send(
          new QueryCommand({
            TableName,
            IndexName,
            KeyConditionExpression: '#a = :v',
            ExpressionAttributeNames: { '#a': attr },
            ExpressionAttributeValues: { ':v': value },
          })
        ),
      { label: `ddb.query.${TableName}.${IndexName}`, attempts: 2 }
    );
    return Items;
  } catch (err) {
    if (err instanceof AwsError && err.cause && err.cause.name === 'ResourceNotFoundException') {
      // GSI not provisioned — fall back to scan.
      return scanAll(TableName, {
        FilterExpression: '#a = :v',
        ExpressionAttributeNames: { '#a': attr },
        ExpressionAttributeValues: { ':v': value },
      });
    }
    throw err;
  }
}

/** Cheap connectivity check for /ready. */
async function ping() {
  await withRetry(
    () => getDynamoDoc().send(new ScanCommand({ TableName: usersTable(), Limit: 1 })),
    { label: 'ddb.ping', attempts: 2 }
  );
  return true;
}

module.exports = {
  driver: 'dynamodb',
  usersTable,
  donationsTable,
  put,
  get,
  remove,
  patch,
  scanAll,
  queryByIndex,
  ping,
};
