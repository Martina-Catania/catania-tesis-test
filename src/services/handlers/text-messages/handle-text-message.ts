import { parseDeliveryMessage } from "./parse-delivery";
import { Cliente } from "./types";
import { formatDeliveryReply } from "./format-reply";
import { isMeasurement, isClientName, containsWeekday } from "./utils";

// Parse a text message recieved via WhatsApp
// If the message contains delivery data, call parse-delivery and return a structured object
// Otherwise parrot the message back as a fallback response

const containsMeasurements = (text: string): boolean => {
    const tokens = text.split(/\s+/);
    return tokens.some(token => isMeasurement(token));
}

const containsClientNames = (text: string): boolean => {
    const tokens = text.split(/\s+/);
    return tokens.some(token => isClientName(token));
}

const isDeliveryData = (text: string): boolean => {
    // Basic check: determine if text contains client name and package measurements
    return containsClientNames(text) && containsMeasurements(text);
}

const handleTextMessage = (message: string): string => {
    if (isDeliveryData(message)) {
        const deliveryData = parseDeliveryMessage(message);
        const reply = formatDeliveryReply(deliveryData);
        return reply ;
    } else {
        return "Message recieved:\n" + message;
    }
}

export { handleTextMessage };