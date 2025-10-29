export type role = 'admin' | 'authenticated' | 'anon' | 'namdan_user';

export interface User {
  email: string;
  role: role;
  avatar?: string;
  name?: string;
}
