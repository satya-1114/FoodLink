/**
 * Amazon SNS notification adapter.
 *
 * Subscribes to the in-process event bus (same events as the console
 * notification service) and publishes a JSON message to the configured
 * SNS topic ARN. Failures are logged and swallowed — notifications must
 * never break a business operation.
 *
 * Activated by events/index.js when config.notifications.driver === 'sns'.
 */
const { PublishCommand } = require('@aws-sdk/client-sns');
const { getSNS } = require('./client');
const { withRetry } = require('./retry');
const { eventBus, EVENTS } = require('../events/eventBus');
const logger = require('../utils/logger');

function topicArn() {
  return process.env.SNS_TOPIC_ARN || '';
}

async function publish(subject, payload) {
  const TopicArn = topicArn();
  if (!TopicArn) {
    logger.warn('sns: SNS_TOPIC_ARN not set — skipping publish');
    return false;
  }
  try {
    await withRetry(
      () =>
        getSNS().send(
          new PublishCommand({
            TopicArn,
            Subject: String(subject).slice(0, 99),
            Message: JSON.stringify({ subject, payload, ts: new Date().toISOString() }),
            MessageAttributes: {
              eventType: { DataType: 'String', StringValue: String(subject) },
            },
          })
        ),
      { label: 'sns.publish', attempts: 3 }
    );
    return true;
  } catch (err) {
    logger.warn(`sns: publish failed for ${subject}: ${err.message}`);
    return false;
  }
}

function registerEventHandlers() {
  if (registerEventHandlers._wired) return;
  registerEventHandlers._wired = true;

  const map = [
    [EVENTS.DONATION_CREATED, 'DonationCreated'],
    [EVENTS.DONATION_ACCEPTED, 'DonationAccepted'],
    [EVENTS.DONATION_COLLECTED, 'DonationCollected'],
    [EVENTS.DONATION_CANCELLED, 'DonationCancelled'],
    [EVENTS.DONATION_EXPIRED, 'DonationExpired'],
    [EVENTS.USER_REGISTERED, 'UserRegistered'],
  ];

  for (const [evt, subject] of map) {
    eventBus.on(evt, (payload) => { publish(subject, payload); });
  }
  logger.info('sns: notification adapter subscribed to event bus');
}

module.exports = { driver: 'sns', publish, registerEventHandlers };
