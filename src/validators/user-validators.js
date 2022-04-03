import { check } from "express-validator"

const name = check("name", "Tên là bắt buộc.").not().isEmpty()
const username = check("username", "Tên người dùng là bắt buộc.").not().isEmpty()
const email = check("email", "Vui lòng cung cấp một địa chỉ email hợp lệ").isEmail()
const password = check(
  "password",
  "Mật khẩu được yêu cầu có độ dài tối thiểu là 6"
).isLength({
  min: 6,
})

export const RegisterValidations = [password, name, username, email]
export const AuthenticateValidations = [username, password]
export const ResetPassword = [email]
