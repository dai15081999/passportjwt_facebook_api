import { Router } from "express";
import { DOMAIN } from "../constants";
import { Post, User } from "../models";
import { userAuth } from "../middlewares/auth-guard";
import SlugGenerator from "../functions/slug-generator";
import validator from "../middlewares/validator-middleware";
import { postValidations } from "../validators/post-validators";
import { uploadPostImage as uploader } from "../middlewares/uploader";

const router = Router();

/**
 * @description Để tải lên hình ảnh bài đăng
 * @api /posts/api/post-image-upload
 * @access private
 * @type POST
 */
router.post(
  "/api/post-image-upload",
  userAuth,
  uploader.single("image"),
  async (req, res) => {
    try {
      let { file } = req;
      let filename = DOMAIN + "post-images/" + file.filename;
      return res.status(200).json({
        filename,
        success: true,
        message: "Image Uploaded Successfully.",
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Unable to create the post.",
      });
    }
  }
);

/**
 * @description Để tạo một bài đăng mới bởi Người dùng đã xác thực
 * @api /posts/api/create-post
 * @access private
 * @type POST
 */
router.post(
  "/api/create-post",
  userAuth,
  postValidations,
  validator,
  async (req, res) => {
    try {
      // Create a new Post
      let { body } = req;
      let post = new Post({
        author: req.user._id,
        ...body,
        slug: SlugGenerator(body.title),
      });
      await post.save();
      //   console.log("NEW_POST", post);
      return res.status(201).json({
        post,
        success: true,
        message: "Your post is published.",
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Unable to create the post.",
      });
    }
  }
);

/**
 * @description Để cập nhật bài đăng của Người dùng đã xác thực
 * @api /posts/api/upadte-post
 * @access private
 * @type PUT
 */
router.put(
  "/api/update-post/:id",
  userAuth,
  postValidations,
  validator,
  async (req, res) => {
    try {
      let { id } = req.params;
      let { user, body } = req;
      
// Kiểm tra xem bài viết có id có trong cơ sở dữ liệu hay không?
      let post = await Post.findById(id);
      if (!post) {
        return res.status(404).json({
          success: false,
          message: "Post not found.",
        });
      }
      if (post.author.toString() !== user._id.toString()) {
        return res.status(401).json({
          success: false,
          message: "Post doesn't belong to you.",
        });
      }
      post = await Post.findOneAndUpdate(
        { author: user._id, _id: id },
        {
          ...body,
          slug: SlugGenerator(body.title),
        },
        { new: true }
      );
      return res.status(200).json({
        post,
        success: true,
        message: "Post updated successfully.",
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Unable to update the post.",
      });
    }
  }
);

/**
 * @description Để thích một bài đăng của người dùng đã xác thực
 * @api /posts/api/like-post
 * @access private
 * @type PUT
 */
router.put("/api/like-post/:id", userAuth, async (req, res) => {
  try {
    let { id } = req.params;
    let post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found.",
      });
    }

    let user = post.likes.user.map((id) => id.toString());
    if (user.includes(req.user._id.toString())) {
      return res.status(404).json({
        success: false,
        message: "You have already liked this post.",
      });
    }

    post = await Post.findOneAndUpdate(
      { _id: id },
      {
        likes: {
          count: post.likes.count + 1,
          user: [...post.likes.user, req.user._id],
        },
      },
      { new: true }
    );
    return res.status(200).json({
      success: true,
      message: "You liked this post.",
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "Unable to like the post. Please try again later.",
    });
  }
});

export default router;
