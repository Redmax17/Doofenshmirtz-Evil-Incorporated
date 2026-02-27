//Temporary Authentication JS file. 
//Not the real file we will be using but one to test the Auth for Pages in DEV.

import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {

  // DEV MODE BYPASS
  if (process.env.NODE_ENV === "development") {
    req.user = {
      userId: 1,   // <-- your test user ID
      email: "testuser1@example.com"
    };
    return next();
  }

  // Normal JWT Logic
  try {
    const authHeaderValue = String(req.headers.authorization || "");
    const tokenValue = authHeaderValue.startsWith("Bearer ")
      ? authHeaderValue.slice(7)
      : "";

    if (!tokenValue) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const payloadValue = jwt.verify(tokenValue, process.env.JWT_SECRET);

    req.user = {
      userId: Number(payloadValue.userId),
      email: String(payloadValue.email || ""),
    };

    return next();
  } catch (errValue) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
