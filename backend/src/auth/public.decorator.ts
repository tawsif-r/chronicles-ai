import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/** Decorate a route or controller to skip JWT auth. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
