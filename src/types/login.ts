export type role = 'admin' | 'authenticated' | 'anon' | 'namdan_user' | 'archived';

export interface User {
  email: string;
  role: role;
  avatar?: string;
  name?: string;
}
