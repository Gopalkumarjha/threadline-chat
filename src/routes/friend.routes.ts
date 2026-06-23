import { Router } from "express";
import * as friendController from "../controllers/friend.controller";
import { requireAuth } from "../middleware/auth.middleware";

const router = Router();

router.use(requireAuth);
router.post("/request", friendController.sendRequest);
router.post("/accept", friendController.acceptRequest);
router.post("/reject", friendController.rejectRequest);
router.post("/remove", friendController.removeFriend);
router.get("/list", friendController.listFriends);
router.get("/requests", friendController.listIncoming);

export default router;
