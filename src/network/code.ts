/** Room codes are 20 uppercase hex characters (see protocol.ts). Kept dependency-free for the home page. */
export const codeValid = (code: string) => /^[A-F0-9]{20}$/.test(code);
