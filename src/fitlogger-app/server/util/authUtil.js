export function requireAuthentication(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).send("You must be logged in");
  }
  next();
}
