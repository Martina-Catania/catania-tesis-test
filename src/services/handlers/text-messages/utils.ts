/** Returns true if a token is purely digits-and-x (e.g. "27x8x8") */
const isMeasurement = (token: string): boolean => {
    return /^[\dx]+$/i.test(token) && token.includes('x');
};

const isClientName = (text: string): boolean => {
    // Check if the text is any of the known client names
    // TEMP: Will change to check if text is a known client alias in db
    const clientNames = ["Fundacion universidad", "Feller", "Paesi", "Rosevelt", "Brody", "Milenials", "Suez", "Grimbaun", "Antoci", "Vicens", "Sevan", "Mayol", "Indian", "Awa", "Midligth", "Metier"];
    return clientNames.some(name => text === name);
}

const containsWeekday = (text: string): boolean => {
    // Check if the text contains a day of the week
    const date = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    return date.some(day => text.includes(day));
}

export { isMeasurement, isClientName, containsWeekday as containsWeekday };