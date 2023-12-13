import assert from "node:assert";
import { describe, it } from "node:test";
import { AuthClient } from "../../src/integration/AuthClient.js";

describe("AuthClient", (t) => {
  const { AUTH_CLIENT_ID, AUTH_BASE_URL, AUTH_CLIENT_SECRET, AUTH_AUDIENCE } =
    process.env;

  const authClient = new AuthClient(AUTH_BASE_URL);

  it("oauthToken", async () => {
    const tokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });

    console.dir(tokenData);

    assert.strictEqual(tokenData.token_type, "Bearer");
  });

  it("createUser", async () => {
    const tokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });

    const email = `test+${Math.floor(Math.random() * 10000)}@gmail.com`;
    const password = "P@ssWOrd123";
    const connection = "Username-Password-Authentication";

    const response = await authClient.createUser(
      { email, password, connection },
      tokenData.access_token
    );

    console.dir(response);

    assert.ok(response.created_at);
  });
});
