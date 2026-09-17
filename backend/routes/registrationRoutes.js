const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/rbacMiddleware");
const { getRegistrationOfferings, registerForOffering, dropOffering } = require("../controllers/registrationController");

const router = express.Router();

router.use(protect, authorize("student"));

router.get("/offerings", getRegistrationOfferings);
router.post("/offerings/:id", registerForOffering);
router.delete("/offerings/:id", dropOffering);

module.exports = router;
