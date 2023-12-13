export const parseJwtPayload = (token) =>
  JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
