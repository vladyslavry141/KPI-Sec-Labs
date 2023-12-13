// Import the framework and instantiate it
import { randomUUID } from "crypto";
import Fastify from "fastify";
import fs, { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import jwt from "@fastify/jwt";

const PORT = 3000;

const fastify = Fastify({
  logger: true,
});

fastify.register(jwt, { secret: "secret" });

fastify.decorateRequest("ctx", null);

fastify.addHook("onRequest", (request, reply, done) => {
  const token = request.headers.authorization;

  if (!token) {
    request.ctx = {};
    return done();
  }

  let verifyPayload;
  try {
    verifyPayload = fastify.jwt.verify(token);
  } catch (error) {
    done(error);
  }

  request.ctx = verifyPayload;

  done();
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  if (request.ctx.username) {
    return reply.code(200).send({
      username: request.ctx.username,
      logout: "http://localhost:3000/logout",
    });
  }

  const stream = createReadStream(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "index.html")
  );

  return reply.type("text/html").send(stream);
});

fastify.get("/logout", async function handler(request, reply) {
  reply.redirect("/");
});

const users = [
  {
    login: "Login",
    password: "Password",
    username: "Username",
  },
  {
    login: "Login1",
    password: "Password1",
    username: "Username1",
  },
];

fastify.post("/api/login", (request, reply) => {
  const { login, password } = request.body;

  const user = users.find(
    (user) => user.login == login && user.password == password
  );

  if (!user) {
    return reply.code(401).send({ msg: "Unauthorized" });
  }

  const token = fastify.jwt.sign({
    username: user.username,
    login: user.login,
  });

  return reply.send({ token: token });
});

// Run the server!
try {
  await fastify.listen({ port: PORT });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
