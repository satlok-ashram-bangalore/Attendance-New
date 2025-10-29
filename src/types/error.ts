export interface ExtendedError extends Error {
  code: string;
  details: string | null;
  hint: string | null;
}

export class SupabaseError extends Error implements ExtendedError {
  code: string;
  details: string | null;
  hint: string | null;

  constructor(
    message: string,
    code: string,
    details: string | null = null,
    hint: string | null = null
  ) {
    super(message);
    this.name = 'SupabaseError'; // Setting the error name to differentiate it from other Errors
    this.code = code;
    this.details = details;
    this.hint = hint;
  }
}
