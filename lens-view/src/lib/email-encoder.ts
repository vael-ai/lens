/**
 * Simple email encoding for URL slugs using character substitution
 * Maps characters to maintain similar length while obfuscating the email
 */

// Character substitution map (keyboard layout shift pattern)
const ENCODE_MAP: Record<string, string> = {
    a: "q",
    b: "w",
    c: "e",
    d: "r",
    e: "t",
    f: "y",
    g: "u",
    h: "i",
    i: "o",
    j: "p",
    k: "a",
    l: "s",
    m: "d",
    n: "f",
    o: "g",
    p: "h",
    q: "j",
    r: "k",
    s: "l",
    t: "z",
    u: "x",
    v: "c",
    w: "v",
    x: "b",
    y: "n",
    z: "m",
    "0": "9",
    "1": "8",
    "2": "7",
    "3": "6",
    "4": "5",
    "5": "4",
    "6": "3",
    "7": "2",
    "8": "1",
    "9": "0",
    "@": "&",
    ".": "-",
    "-": "_",
    _: "+",
};

// Reverse map for decoding
const DECODE_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(ENCODE_MAP).map(([key, value]) => [value, key])
);

/**
 * Encodes an email address for use in URL slugs
 * @param email - The email address to encode
 * @returns Encoded string suitable for URLs
 */
export function encodeEmail(email: string): string {
    return email
        .toLowerCase()
        .split("")
        .map((char) => ENCODE_MAP[char] || char)
        .join("");
}

/**
 * Decodes an email address from a URL slug
 * @param encoded - The encoded email string
 * @returns Decoded email address
 */
export function decodeEmail(encoded: string): string {
    return encoded
        .split("")
        .map((char) => DECODE_MAP[char] || char)
        .join("");
}

/**
 * Validates if a string looks like an encoded email
 * @param encoded - The string to validate
 * @returns True if it appears to be a valid encoded email
 */
export function isValidEncodedEmail(encoded: string): boolean {
    const decoded = decodeEmail(encoded);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(decoded);
}
