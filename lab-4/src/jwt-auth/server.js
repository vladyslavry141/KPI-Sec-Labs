// Import the framework and instantiate it
import Fastify from "fastify";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import fp from "fastify-plugin";
import { AuthClient } from "../integration/AuthClient.js";
import cookies from "@fastify/cookie";
import jwt from "@fastify/jwt";

const PORT = 3000;

const fastify = Fastify({
  logger: true,
});

fastify.register(cookies, {});

fastify.register(jwt, { secret: "secret" });

await fastify.register(import("@fastify/env"), {
  schema: {
    type: "object",
    required: [
      "AUTH_CLIENT_ID",
      "AUTH_BASE_URL",
      "AUTH_CLIENT_SECRET",
      "AUTH_AUDIENCE",
    ],
    properties: {
      AUTH_CLIENT_ID: { type: "string" },
      AUTH_BASE_URL: { type: "string" },
      AUTH_CLIENT_SECRET: { type: "string" },
      AUTH_AUDIENCE: { type: "string" },
    },
  },
});

fastify.register(
  fp((fastify, opts, done) => {
    const authClient = new AuthClient(fastify.config.AUTH_BASE_URL);
    fastify.decorate("authClient", authClient);
    done();
  }),
  {}
);

fastify.addHook("onRequest", async function (request, reply) {
  if (!request.cookies.access_token || !request.cookies.access_token) return;

  const accessToken = this.jwt.decode(request.cookies.access_token);

  if (accessToken.exp > Date.now() - 1000 * 60 * 60 * 24) return;

  const refreshedTokenData = await this.authClient.oauthToken({
    client_id: this.config.AUTH_CLIENT_ID,
    audience: this.config.AUTH_AUDIENCE,
    client_secret: this.config.AUTH_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: request.cookies.refresh_token,
  });

  if (refreshedTokenData.statusCode >= 400) {
    return;
  }

  reply.setCookie("access_token", refreshedTokenData.access_token, {
    path: "/",
  });
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  if (request.cookies.access_token) {
    return reply.code(200).send({
      access_token: request.cookies.access_token,
      logout: "http://localhost:3000/logout",
    });
  }

  const stream = createReadStream(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "index.html")
  );

  return reply.type("text/html").send(stream);
});

fastify.get("/logout", async function handler(request, reply) {
  reply.clearCookie("access_token").clearCookie("refresh_token").redirect("/");
});

fastify.post("/api/login", async function (request, reply) {
  const { login, password } = request.body;

  const response = await this.authClient.oauthToken({
    audience: this.config.AUTH_AUDIENCE,
    grant_type: "http://auth0.com/oauth/grant-type/password-realm",
    // grant_type: "password",
    client_id: this.config.AUTH_CLIENT_ID,
    client_secret: this.config.AUTH_CLIENT_SECRET,
    username: login,
    password: password,
    scope: "offline_access",
    realm: "Username-Password-Authentication",
  });

  if (response.statusCode >= 400) {
    return reply.code(response.statusCode).send({ msg: "Unauthorize" });
  }

  return reply
    .setCookie("access_token", response.body.access_token, { path: "/" })
    .setCookie("refresh_token", response.body.refresh_token, {
      path: "/",
      httpOnly: true,
    })
    .code(200)
    .send({ token: response.body.access_token });
});

// Run the server!
try {
  await fastify.listen({ port: PORT });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
