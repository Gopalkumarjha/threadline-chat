import { Router } from "express";
import * as messageController from "../controllers/message.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { editMessageSchema, sendMessageSchema } from "../validators/message.validators";

const router = Router();

router.use(requireAuth);
router.post("/", validateBody(sendMessageSchema), messageController.sendMessage);
router.put("/:id", validateBody(editMessageSchema), messageController.editMessage);
router.delete("/:id", messageController.deleteMessage);
router.get("/:chatId", messageController.listMessages);

export default router;
