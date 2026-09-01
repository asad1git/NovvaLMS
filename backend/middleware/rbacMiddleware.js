/**
 * `authorize` — RBAC gate. Must run AFTER `protect` so `req.user` exists.
 * Usage: router.post("/", protect, authorize("admin"), controllerFn)
 *
 * This is what stops a Student token — even a perfectly valid one — from
 * ever reaching an Admin or Teacher controller.
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403);
      throw new Error(
        `Access denied: '${req.user.role}' role cannot access this resource`
      );
    }

    next();
  };
}

module.exports = { authorize };
