import GraphApi from './graph-api.js';
import Message, { RawMessage } from './message.js';
import Status, { RawStatus } from './status.js';
import Cache from './redis.js';

export default class Conversation {
  static async handleMessage(
    senderPhoneNumberId: string,
    rawMessage: RawMessage,
  ): Promise<void> {
    const message = new Message(rawMessage);

    switch (message.type) {
      case 'text': {
        const replyText = `Message received: ${message.text}`;

        await GraphApi.sendTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          replyText,
        );
        break;
      }

      case 'image':
        await GraphApi.sendTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          'Image message received',
        );
        break;

      default:
        await GraphApi.sendTextMessage(
          message.id,
          senderPhoneNumberId,
          message.senderPhoneNumber,
          'Sorry, I can only process text and image messages for now.',
        );
        break;
    }
  }

  static async handleStatus(
    senderPhoneNumberId: string,
    rawStatus: RawStatus,
  ): Promise<void> {
    const status = new Status(rawStatus);

    // Only handle delivered and read statuses
    if (status.status !== 'delivered' && status.status !== 'read') {
      return;
    }

    // Only send a follow-up message if the current message is flagged
    // as needing one in the cache.
    if (await Cache.remove(status.messageId)) {
      await GraphApi.sendTextMessage(
        undefined,
        senderPhoneNumberId,
        status.recipientPhoneNumber,
        'Sorry, I can only process text and image messages for now.',
      );
    }
  }
}