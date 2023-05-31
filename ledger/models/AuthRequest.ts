import { IUser } from '@db/models/User';


export type AuthenticateUserRequest = Pick<IUser, 'email' | 'password'>;
export type RegisterUserRequest = IUser;

export type AuthRequests = AuthenticateUserRequest 
  | RegisterUserRequest;