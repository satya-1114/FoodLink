/**
 * AWS-specific configuration overlay.
 *
 * Loaded by config/index.js when DEPLOY_TARGET === 'aws' (regardless of
 * NODE_ENV). Use this when running on EC2 / ECS / Elastic Beanstalk so that
 * storage / database / notifications flip to AWS-native adapters.
 *
 * NOTE: AWS SDK is NOT integrated yet — adapters under /aws still delegate
 * to the existing implementations. This file just records the intended
 * routing for the future cut-over.
 */
module.exports = {
  env: process.env.NODE_ENV || 'production',
  isProduction: process.env.NODE_ENV === 'production',
  http: {
    port: parseInt(process.env.PORT, 10) || 3000,
    trustProxy: true,
  },
  session: {
    cookieSecure: true,
    cookieMaxAgeMs: 1000 * 60 * 60 * 12,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    pretty: false,
    file: false,           // CloudWatch agent captures stdout JSON instead
    cloudwatch: true,
  },
  storage: {
    driver: 's3',
    bucket: process.env.S3_BUCKET || 'foodlink-uploads',
    region: process.env.AWS_REGION || 'us-east-1',
  },
  database: {
    driver: process.env.DB_DRIVER || 'dynamodb',
    region: process.env.AWS_REGION || 'us-east-1',
    tableUsers: process.env.DDB_USERS_TABLE || 'foodlink_users',
    tableDonations: process.env.DDB_DONATIONS_TABLE || 'foodlink_donations',
  },
  notifications: {
    driver: 'sns',
    region: process.env.AWS_REGION || 'us-east-1',
    topicArn: process.env.SNS_TOPIC_ARN || '',
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
  },
};
