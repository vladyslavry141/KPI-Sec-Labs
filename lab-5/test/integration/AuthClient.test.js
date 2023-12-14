import assert from "node:assert";
import { describe, it } from "node:test";
import { AuthClient } from "../../src/integration/AuthClient.js";
import { parseJwtPayload } from "../utils.js";

describe("AuthClient", (t) => {
  const { AUTH_CLIENT_ID, AUTH_BASE_URL, AUTH_CLIENT_SECRET, AUTH_AUDIENCE } =
    process.env;

  const authClient = new AuthClient(AUTH_BASE_URL);

  it.skip("oauthToken/client_credentials", async () => {
    const tokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });

    console.dir(tokenData);

    assert.strictEqual(tokenData.body.token_type, "Bearer");
  });

  it.skip("createUser", async () => {
    const tokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });

    const email = `vladyslavry@gmail.com`;
    const password = "P@ssWOrd123";
    const connection = "Username-Password-Authentication";

    const response = await authClient.createUser(
      { email, password, connection },
      tokenData.body.access_token
    );

    console.dir(response);

    assert.ok(response.created_at);
  });

  it.skip("oauthToken/refresh_token", async () => {
    const tokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: "vladyslavry@gmail.com",
      password: "P@ssWOrd123",
      scope: "offline_access",
      realm: "Username-Password-Authentication",
    });

    const refreshedTokenData = await authClient.oauthToken(
      {
        client_id: AUTH_CLIENT_ID,
        audience: AUTH_AUDIENCE,
        client_secret: AUTH_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: tokenData.body.refresh_token,
      },
      tokenData.body.access_token
    );

    console.dir({ tokenData, refreshedTokenData });

    assert.ok(refreshedTokenData.body.access_token);
  });

  it.skip("oauthToken/refresh_token", async () => {
    const systemTokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "client_credentials",
    });

    const tokenData = await authClient.oauthToken({
      client_id: AUTH_CLIENT_ID,
      audience: AUTH_AUDIENCE,
      client_secret: AUTH_CLIENT_SECRET,
      grant_type: "http://auth0.com/oauth/grant-type/password-realm",
      username: "vladyslavry@gmail.com",
      password: "P@ssWOrd123",
      scope: "offline_access",
      realm: "Username-Password-Authentication",
    });

    console.dir({ systemTokenData, tokenData });

    const payload = parseJwtPayload(tokenData.body.access_token);

    const response = await authClient.changePassword(
      payload.sub,
      {
        password: "P@ssWOrd123",
      },
      systemTokenData.body.access_token
    );

    console.dir({ systemTokenData, tokenData, response });
    assert.ok(response.updated_at);
  });
});
