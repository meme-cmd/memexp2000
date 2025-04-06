import { helloRouter } from "./routers/post";
import { togetherRouter } from "./routers/together";
import { r2Router } from "./routers/r2";
import { backroomRouter } from "./routers/backroom";
import { paymentRouter } from "./routers/payment";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  hello: helloRouter,
  ai: togetherRouter,
  r2: r2Router,
  backroom: backroomRouter,
  payment: paymentRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
