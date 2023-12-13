"use strict";

import { request } from "undici";
import { URLSearchParams } from "url";
import { buildBearerToken } from "./utils.js";

export class AuthClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async oauthToken(dto) {
    const ENDPOINT = "oauth/token";
    const url = new URL(ENDPOINT, this.baseUrl);

    return await request(url, {
      method: "POST",
      body: new URLSearchParams(dto).toString(),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }).then((r) => r.body.json());
  }

  async createUser(dto, accessToken) {
    const ENDPOINT = "api/v2/users";
    const url = new URL(ENDPOINT, this.baseUrl);

    return await request(url, {
      method: "POST",
      body: JSON.stringify(dto),
      headers: {
        Authorization: buildBearerToken(accessToken),
        "Content-Type": "application/json",
      },
    }).then((r) => r.body.json());
  }
}
