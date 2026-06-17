import { handleTextMessage } from './handle-text-message';

const exampleMessageWithDeliveryData = 'Fundacion universidad\n2x10x20x30\nPaesi\n5x15x25';

describe('handleTextMessage', () => {
    it('should parrot the text message if no delivery data is present', () => {
        const message = 'Hello, this is a test message!';

        const response = handleTextMessage(message);
        expect(response).toEqual("Message recieved:\n" + message);
    });

    it('should parse delivery data from a text message', () => {
        const message = exampleMessageWithDeliveryData;
        const response = handleTextMessage(message);
        expect(response).toMatch(/^\*([^\n*]+)\*\n(?:\s+(\d+)x\s+)?(\d+)[×x](\d+)[×x](\d+)\n\s+_Total packages: (\d+)_·?$/m);
        expect(response).toMatch(/^\*Total across all clients: (\d+) packages\*$/m);
    });
});