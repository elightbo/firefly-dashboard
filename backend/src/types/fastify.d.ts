import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: number; username: string }
    user:    { sub: number; username: string }
  }
}
