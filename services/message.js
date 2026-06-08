export default class Message {
  constructor(rawMessage) {
    this.id = rawMessage.id;
    this.senderPhoneNumber = rawMessage.from;

    const type = rawMessage.type;

    if (type === 'text') {
      this.type = 'text';
      this.text = rawMessage.text?.body ?? '';
    } else if (type === 'image') {
      this.type = 'image';
      this.imageId = rawMessage.image?.id ?? null;
      this.caption = rawMessage.image?.caption ?? null;
    } else if (type === 'interactive') {
      this.type = rawMessage.interactive.button_reply.id;
    } else {
      this.type = 'unknown';
    }
  }
};