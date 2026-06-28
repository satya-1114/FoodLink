# FoodLink

Smart food donation & distribution platform built with Node.js, Express,
EJS, and Bootstrap 5. Persistence, file storage, and notifications run
through pluggable adapters so the same codebase runs locally with
Firebase/disk/console **and** on AWS with DynamoDB/S3/SNS.

---

## Quick start (local mode)

```bash
cp .env.example .env
# Fill in SESSION_SECRET (≥32 chars), FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID
npm install
npm run validate:env
npm run dev
```

Seed the first admin:

```bash
npm run seed:admin -- admin@foodlink.local StrongPass123 "FoodLink Admin"
```

---

## Switch to AWS mode

Flip three env vars and (re)start:

```bash
DB_DRIVER=dynamodb
STORAGE_DRIVER=s3
NOTIFICATIONS_DRIVER=sns
DEPLOY_TARGET=aws
```

Provide `AWS_REGION`, `S3_BUCKET`, `DYNAMODB_TABLE_USERS`, `DYNAMODB_TABLE_DONATIONS`, and `SNS_TOPIC_ARN`. On EC2/ECS, leave `AWS_ACCESS_KEY_ID/SECRET` empty so the attached IAM role is used.

No controller, service, or repository changes are required.

---

## AWS architecture

```text
                ┌──────────────┐
   Users ──────►│ CloudFront / │──► ALB ──► EC2 / ECS Fargate
                │   Route 53   │             (FoodLink container)
                └──────────────┘                    │
                                                    ├──► Amazon S3        (uploads/*)
                                                    ├──► Amazon DynamoDB  (users, donations)
                                                    ├──► Amazon SNS       (donation events)
                                                    └──► CloudWatch Logs  (Winston JSON to stdout)
```

```
Routes → Controllers → Services → Repositories → AWS Adapters → AWS SDK v3
                                              └─ Local adapters (dev mode)
```

---

## AWS resources — one-time setup

### 1. S3 bucket (uploads)

```bash
aws s3api create-bucket \
  --bucket foodlink-uploads \
  --region us-east-1
aws s3api put-bucket-cors --bucket foodlink-uploads --cors-configuration file://cors.json
```

For public reads (default), attach a bucket policy that allows
`s3:GetObject` on `arn:aws:s3:::foodlink-uploads/uploads/*`. Otherwise set
`S3_PUBLIC_READ=false` — the adapter falls back to short-lived signed
URLs via `@aws-sdk/s3-request-presigner`.

### 2. DynamoDB tables

Use the bundled helper (idempotent):

```bash
npm run aws:create-tables
```

It creates:

| Table | PK | GSI |
|-------|-----|-----|
| `foodlink_users` | `id` (S) | `EmailIndex` on `email` |
| `foodlink_donations` | `id` (S) | — (add `DonorIndex` / `StatusIndex` for scale) |

Both tables use `PAY_PER_REQUEST` billing.

### 3. SNS topic

```bash
aws sns create-topic --name foodlink-events
# Copy the TopicArn into SNS_TOPIC_ARN in your .env
```

Subscribe email/SMS/SQS/Lambda endpoints as needed. The adapter publishes
JSON with a `subject` and an `eventType` message attribute, so SNS
filtering policies can route per event.

### 4. IAM permissions (least privilege)

Attach this policy to the EC2 instance role / ECS task role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Uploads",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:HeadBucket"],
      "Resource": [
        "arn:aws:s3:::foodlink-uploads",
        "arn:aws:s3:::foodlink-uploads/*"
      ]
    },
    {
      "Sid": "Dynamo",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem",
        "dynamodb:DeleteItem", "dynamodb:Query", "dynamodb:Scan",
        "dynamodb:DescribeTable"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/foodlink_users",
        "arn:aws:dynamodb:*:*:table/foodlink_users/index/*",
        "arn:aws:dynamodb:*:*:table/foodlink_donations",
        "arn:aws:dynamodb:*:*:table/foodlink_donations/index/*"
      ]
    },
    {
      "Sid": "Sns",
      "Effect": "Allow",
      "Action": ["sns:Publish"],
      "Resource": "arn:aws:sns:*:*:foodlink-events"
    },
    {
      "Sid": "Logs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "*"
    }
  ]
}
```

---

## Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NODE_ENV` | yes | `development` \| `production` |
| `PORT` | yes | HTTP port |
| `SESSION_SECRET` | yes | ≥ 32 chars in production |
| `DEPLOY_TARGET` | optional | `aws` → load `config/aws.js` |
| `DB_DRIVER` | optional | `firestore` (default) \| `dynamodb` |
| `STORAGE_DRIVER` | optional | `local` (default) \| `s3` |
| `NOTIFICATIONS_DRIVER` | optional | `console` (default) \| `sns` |
| `FIREBASE_SERVICE_ACCOUNT` | when `DB_DRIVER=firestore` | path to JSON key |
| `FIREBASE_PROJECT_ID` | when `DB_DRIVER=firestore` | |
| `AWS_REGION` | when any AWS driver is on | |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | optional | omit on EC2/ECS to use IAM role |
| `AWS_SESSION_TOKEN` | optional | only with temporary credentials |
| `S3_BUCKET`, `S3_PUBLIC_READ` | when `STORAGE_DRIVER=s3` | |
| `DYNAMODB_TABLE_USERS`, `DYNAMODB_TABLE_DONATIONS` | when `DB_DRIVER=dynamodb` | |
| `SNS_TOPIC_ARN` | when `NOTIFICATIONS_DRIVER=sns` | |
| `LOG_LEVEL`, `LOG_DIR` | optional | Winston config |

---

## Folder structure

```
foodlink/
├── aws/
│   ├── client.js                # S3/DynamoDB/SNS clients (lazy)
│   ├── retry.js                 # transient-error backoff + AwsError wrap
│   ├── storage.adapter.js       # S3
│   ├── database.adapter.js      # DynamoDB low-level
│   └── notification.adapter.js  # SNS
├── config/                      # profiles, validation, logger
├── controllers/                 # thin HTTP layer
├── docker/
├── events/                      # in-process bus → console or SNS
├── middlewares/
├── models/
├── public/
├── repositories/
│   ├── user.repository.js       # proxy → firestore | dynamodb
│   ├── donation.repository.js   # proxy → firestore | dynamodb
│   ├── firestore/
│   └── dynamodb/
├── routes/
├── scripts/                     # validate-env, healthcheck, seed-admin, aws-create-tables
├── services/                    # business logic (no DB / HTTP)
├── utils/
├── validators/
├── views/
├── Dockerfile
├── docker-compose.yml
└── server.js
```

---

## Operational endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | liveness — `{status, version, uptime, memory, nodeVersion, env, hostname, timestamp}` |
| `GET /ready` | readiness — pings the active database adapter and storage adapter; 503 if any are down |

---

## Error handling

All AWS calls go through `aws/retry.js`:

* Retries throttling / 5xx / network errors with exponential backoff (3 attempts).
* Translates raw SDK exceptions to a domain `AwsError`. **Raw AWS error
  shapes are never returned to controllers or rendered to users.**
* Storage / notification failures are best-effort and logged — they
  never break a business operation.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start production server |
| `npm run validate:env` | Validate required env vars |
| `npm run healthcheck` | Probe `/health` (used in Docker HEALTHCHECK) |
| `npm run seed:admin` | Seed the initial admin user |
| `npm run aws:create-tables` | Provision DynamoDB tables (idempotent) |
| `npm run docker:dev` / `:prod` | Compose helpers |
