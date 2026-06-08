import constants from './constants.js';
import GraphApi from './graph-api.js';
import Message from './message.js';
import Status from './status.js';
import Cache from './redis.js';

export default class Conversation {
  constructor(phoneNumberId) {
    this.phoneNumberId = phoneNumberId;
  }

  static async handleMessage(senderPhoneNumberId, rawMessage) {
    const message = new Message(rawMessage);

    switch (message.type) {
      case 'text':
        await GraphApi.sendTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          `Message received: ${message.text}`
        );
        break;

      case 'image':
        await GraphApi.sendTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          "Image message received"
        );
        break;

      default:
        await GraphApi.sendTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          constants.APP_DEFAULT_MESSAGE
        );
        break;
    }
  }

  static async handleStatus(senderPhoneNumberId, rawStatus) {
    const status = new Status(rawStatus);

    // Only handle delivered and read statuses
    if (!(status.status === 'delivered' || status.status === 'read')) {
      return;
    }

    // Only send a follow up message if the current message is flagged
    // as needing one in the cache.
    if (await Cache.remove(status.messageId)) {
      await GraphApi.sendTextMessage(
        undefined,
        senderPhoneNumberId,
        status.recipientPhoneNumber,
        constants.APP_TRY_ANOTHER_MESSAGE
      );
    }
  }
};
