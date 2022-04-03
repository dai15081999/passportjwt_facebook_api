import {
  ResetPassword,
  RegisterValidations,
  AuthenticateValidations,
} from "../validators";
import { join } from "path";
import { User } from "../models";
import { Router } from "express";
import { randomBytes } from "crypto";
import { DOMAIN } from "../constants";
import sendMail from "../functions/email-sender";
import { userAuth } from "../middlewares/auth-guard";
import Validator from "../middlewares/validator-middleware";

const router = Router();

/**
 * @description Để tạo một tài khoản người dùng mới
 * @api /users/api/register
 * @access Public
 * @type POST
 */
router.post(
  "/api/register",
  RegisterValidations,
  Validator,
  async (req, res) => {
    try {
      let { username, email } = req.body;
      
      let user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({
          success: false,
          message: "Username is already taken.",
        });
      }
     
      user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({
          success: false,
          message:
            "Email is already registered. Did you forget the password. Try resetting it.",
        });
      }
      user = new User({
        ...req.body,
        verificationCode: randomBytes(20).toString("hex"),
      });
      await user.save();
     
      let html = `
        <div>
            <h1>Hello, ${user.username}</h1>
            <p>Vui lòng nhấp vào liên kết sau để xác minh tài khoản của bạn</p>
            <a href="${DOMAIN}users/verify-now/${user.verificationCode}">Xác minh ngay</a>
        </div>
    `;
      await sendMail(
        user.email,
        "Xác nhận tài khoản",
        "Vui lòng xác minh tài khoản của bạn.",
        html
      );
      return res.status(201).json({
        success: true,
        message:
        "Tài khoản của bạn đã được tạo, vui lòng xác minh địa chỉ email của bạn.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Đã xảy ra lỗi.",
      });
    }
  }
);

/**
 * @description Để xác minh tài khoản của người dùng mới qua email
 * @api /users/verify-now/:verificationCode
 * @access PUBLIC <Only Via email>
 * @type GET
 */
router.get("/verify-now/:verificationCode", async (req, res) => {
  try {
    let { verificationCode } = req.params;
    let user = await User.findOne({ verificationCode });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized access. Invalid verification code.",
      });
    }
    user.verified = true;
    user.verificationCode = undefined;
    await user.save();
    return res.sendFile(
      join(__dirname, "../templates/verification-success.html")
    );
  } catch (err) {
    console.log("ERR", err.message);
    return res.sendFile(join(__dirname, "../templates/errors.html"));
  }
});

/**
 * @descriptionĐể xác thực người dùng và nhận mã thông báo xác thực
 * @api /users/api/authenticate
 * @access PUBLIC
 * @type POST
 */
router.post(
  "/api/authenticate",
  AuthenticateValidations,
  Validator,
  async (req, res) => {
    try {
      let { username, password } = req.body;
      let user = await User.findOne({ username });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Username not found.",
        });
      }
      if (!(await user.comparePassword(password))) {
        return res.status(401).json({
          success: false,
          message: "Incorrect password.",
        });
      }
      let token = await user.generateJWT();
      return res.status(200).json({
        success: true,
        user: user.getUserInfo(),
        token: `Bearer ${token}`,
        message: "Hurray! You are now logged in.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }
);

/**
 * @description Để có được hồ sơ của người dùng đã được xác thực
 * @api /users/api/authenticate
 * @access Private
 * @type GET
 */
router.get("/api/authenticate", userAuth, async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * @description Để bắt đầu quá trình đặt lại mật khẩu
 * @api /users/api/reset-password
 * @access Public
 * @type POST
 */
router.put(
  "/api/reset-password",
  ResetPassword,
  Validator,
  async (req, res) => {
    try {
      let { email } = req.body;
      let user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User with the email is not found.",
        });
      }
      user.generatePasswordReset();
      await user.save();
      // Sent the password reset Link in the email.
      let html = `
        <div>
            <h1>Hello, ${user.username}</h1>
            <p>Please click the following link to reset your password.</p>
            <p>If this password reset request is not created by your then you can inore this email.</p>
            <a href="${DOMAIN}users/reset-password-now/${user.resetPasswordToken}">Verify Now</a>
        </div>
      `;
      await sendMail(
        user.email,
        "Reset Password",
        "Please reset your password.",
        html
      );
      return res.status(404).json({
        success: true,
        message: "Password reset link is sent your email.",
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "An error occurred.",
      });
    }
  }
);

/**
 * @description Để gửi lại trang mật khẩu đặt lại
 * @api /users/reset-password/:resetPasswordToken
 * @access Hạn chế qua email
 * @type GET
 */
router.get("/reset-password-now/:resetPasswordToken", async (req, res) => {
  try {
    let { resetPasswordToken } = req.params;
    let user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiresIn: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Password reset token is invalid or has expired.",
      });
    }
    return res.sendFile(join(__dirname, "../templates/password-reset.html"));
  } catch (err) {
    return res.sendFile(join(__dirname, "../templates/errors.html"));
  }
});

/**
 * @description Để đặt lại mật khẩu
 * @api /users/api/reset-password-now
 * @access Hạn chế qua email
 * @type POST
 */
router.post("/api/reset-password-now", async (req, res) => {
  try {
    let { resetPasswordToken, password } = req.body;
    let user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpiresIn: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Password reset token is invalid or has expired.",
      });
    }
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresIn = undefined;
    await user.save();
    // Send notification email about the password reset successfull process
    let html = `
        <div>
            <h1>Hello, ${user.username}</h1>
            <p>Your password is resetted successfully.</p>
            <p>If this rest is not done by you then you can contact our team.</p>
        </div>
      `;
    await sendMail(
      user.email,
      "Reset Password Successful",
      "Your password is changed.",
      html
    );
    return res.status(200).json({
      success: true,
      message:
        "Your password reset request is complete and your password is resetted successfully. Login into your account with your new password.",
    });
  } catch (err) {
    return res.status(500).json({
      sucess: false,
      message: "Something went wrong.",
    });
  }
});

export default router;
