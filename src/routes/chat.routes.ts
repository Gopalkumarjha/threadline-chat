import { Router } from "express";
import * as chatController from "../controllers/chat.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { createConversationSchema } from "../validators/message.validators";

const router = Router();

router.use(requireAuth);
router.post("/create", validateBody(createConversationSchema), chatController.createConversation);
router.get("/list", chatController.listConversations);
router.get("/:id", chatController.getConversation);

export default router;
