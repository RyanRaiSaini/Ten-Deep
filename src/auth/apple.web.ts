/** Sign in with Apple isn't offered on the web (it needs a Services ID and domain setup). */
export const appleAvailable = async () => false;
export const appleToken = async (): Promise<string | null> => null;
