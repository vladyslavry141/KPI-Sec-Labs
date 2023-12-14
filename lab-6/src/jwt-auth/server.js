// Import the framework and instantiate it
import Fastify from "fastify";
import { createReadStream } from "node:fs";
import path from "node:path";
import { request } from "undici";
import { fileURLToPath } from "url";
import fp from "fastify-plugin";
import { AuthClient } from "../integration/AuthClient.js";
import cookies from "@fastify/cookie";
import jwt from "@fastify/jwt";
import auth0Verify from "fastify-auth0-verify";
import { URL, URLSearchParams } from "node:url";

const PORT = 3000;

const fastify = Fastify({
  logger: true,
});

fastify.register(cookies, {});

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

await fastify.register(
  fp((fastify, opts, done) => {
    const authClient = new AuthClient(fastify.config.AUTH_BASE_URL);
    fastify.decorate("authClient", authClient);
    done();
  }),
  {}
);

// Declare a route
fastify.get("/", async function handler(request, reply) {
  if (request.cookies.access_token) {
    return reply.code(200).send({
      access_token: request.cookies.access_token,
      logout: "http://localhost:3000/logout",
    });
  }

  const url = new URL("/authorize", this.config.AUTH_BASE_URL);

  const searchParams = new URLSearchParams({
    client_id: this.config.AUTH_CLIENT_ID,
    redirect_uri: "http://localhost:3000/login/callback",
    response_type: "code",
    response_mode: "query",
    scope: "profile email",
    audience: this.config.AUTH_AUDIENCE,
  });

  url.search = searchParams.toString();

  return reply.redirect(url.toString());
});

fastify.get("/logout", async function handler(request, reply) {
  reply.clearCookie("access_token").clearCookie("refresh_token").redirect("/");
});

fastify.get("/login/callback", async function (request, reply) {
  const response = await this.authClient.oauthToken({
    grant_type: "authorization_code",
    client_id: this.config.AUTH_CLIENT_ID,
    code: request.query.code,
    client_secret: this.config.AUTH_CLIENT_SECRET,
    redirect_uri: "http://localhost:3000/login/callback",
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

fastify.register(async (fastify, opts) => {
  await fastify.register(
    fp(async (fastify, opts) => {
      const publicSecret = await request(new URL("/pem", opts.domain)).then(
        (r) => r.body.text()
      );

      await fastify.register(jwt, {
        secret: { public: publicSecret },
        cookie: opts.cookie,
      });

      fastify.decorate("authenticate", async function (request, reply) {
        try {
          await request.jwtVerify();
        } catch (error) {
          reply.send(error);
        }
      });
    }),
    {
      domain: fastify.config.AUTH_BASE_URL,
      cookie: { cookieName: "access_token" },
    }
  );

  fastify.get(
    "/verify",
    { preValidation: fastify.authenticate },
    async function (request, reply) {
      return reply
        .code(200)
        .send(fastify.jwt.decode(request.cookies.access_token));
    }
  );
}, {});

// Run the server!
try {
  await fastify.listen({ port: PORT });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
