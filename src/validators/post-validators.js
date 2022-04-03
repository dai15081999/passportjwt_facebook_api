import { check } from "express-validator";

const title = check("title", "Tiêu đề bắt buộc").not().isEmpty();
const content = check("content", "Nội dung cho bài viết là bắt buộc.")
  .not()
  .isEmpty();

export const postValidations = [title, content];
