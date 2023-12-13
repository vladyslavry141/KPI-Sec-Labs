// Import the framework and instantiate it
import { randomUUID } from "crypto";
import Fastify from "fastify";
import fs, { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

const PORT = 3000;

const fastify = Fastify({
  logger: true,
});

class SessionStorage {
  sessions = new Map();

  constructor() {
    try {
      this.sessions = fs.readFileSync("./sessions.json", "utf8");
      this.sessions = new Map(JSON.parse(this.sessions.trim()));
    } catch (e) {}
  }

  #storeSessions() {
    fs.writeFileSync(
      "./sessions.json",
      JSON.stringify([...this.sessions.entries()]),
      "utf-8"
    );
  }

  set(key, value = {}) {
    this.sessions.set(key, value);
    this.#storeSessions();
  }

  get(key) {
    return this.sessions.get(key);
  }

  init() {
    const sessionId = randomUUID();
    this.set(sessionId);

    return sessionId;
  }

  destroy(sessionId) {
    this.sessions.delete(sessionId);
    this.#storeSessions();
  }
}

const sessionStorage = new SessionStorage();

fastify.decorate("sessionStorage", sessionStorage);

fastify.decorateRequest("ctx", null);

fastify.addHook("onRequest", (request, reply, done) => {
  let sessionId = request.headers.authorization;

  if (!sessionId) {
    sessionId = fastify.sessionStorage.init();
  }

  const session = fastify.sessionStorage.get(sessionId);

  request.ctx = { sessionId, session };

  done();
});

fastify.addHook("onResponse", (request, response, done) => {
  if (!request.ctx.sessionId) done();

  fastify.sessionStorage.set(request.ctx.sessionId, request.ctx.session);
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  if (request.ctx.session.username) {
    return reply.code(200).send({
      username: request.ctx.session.username,
      logout: "http://localhost:3000/logout",
    });
  }

  const stream = createReadStream(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "index.html")
  );

  return reply.type("text/html").send(stream);
});

fastify.get("/logout", async function handler(request, reply) {
  fastify.sessionStorage.destroy(request.ctx.sessionId);
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
  request.ctx.session.username = user.username;
  request.ctx.session.login = user.login;

  return reply.send({ token: request.ctx.sessionId });
});

// Run the server!
try {
  await fastify.listen({ port: PORT });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
