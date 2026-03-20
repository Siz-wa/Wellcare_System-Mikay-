import { User } from './auth';

export type * from './auth';
export type * from './navigation';
export type * from './ui';


export type PageProps<T extends Record<string, unknown> = Record<string, unknown>> = T & {
    auth: {
        user: User;
    };

};