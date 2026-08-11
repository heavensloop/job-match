import type { DefaultSession } from "next-auth";

// next-auth's own callback signatures (session/jwt) are typed against
// @auth/core's Session/JWT directly, not the re-exports at "next-auth" /
// "next-auth/jwt" — augmenting only the re-exports doesn't merge into what
// the callbacks actually see, so augment the source modules here.
declare module "@auth/core/types" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
  }
}
