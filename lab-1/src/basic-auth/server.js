// Import the framework and instantiate it
import Fastify from "fastify";

const PORT = 3000;

const fastify = Fastify({
  logger: true,
});

fastify.decorateReply("ctx", null);

fastify.addHook("onRequest", (request, reply, done) => {
  // Some code

  const authorizationHeader = request.headers.authorization;
  request.log.info({ authorizationHeader });

  if (!authorizationHeader) {
    reply.header("WWW-Authenticate", 'Basic realm="Ukraine"');
    reply.code(401);
    reply.send("Unauthorized");
    return;
  }

  const authorizationBase64Part = authorizationHeader.split(" ")[1];

  const decodedAuthorizationHeader = Buffer.from(
    authorizationBase64Part,
    "base64"
  ).toString("utf-8");

  request.log.info({ decodedAuthorizationHeader });

  const [login, password] = decodedAuthorizationHeader.split(":");
  request.log.info({ login, password }, "Login/Password");

  if (login == "DateArt" && password == "2408") {
    reply.ctx = { login };
    return done();
  }

  reply.header("WWW-Authenticate", 'Basic realm="Ukraine"');
  reply.code(401);
  reply.send("Unauthorized");
  done();
});

// Declare a route
fastify.get("/", async function handler(request, reply) {
  return { msg: `Hello ${reply.ctx.login}` };
});

// Run the server!
try {
  await fastify.listen({ port: PORT });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
