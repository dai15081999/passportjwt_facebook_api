import cors from "cors";
import { join } from "path";
import consola from "consola";
import express from "express";
import mongoose from "mongoose";
import passport from "passport";
import { json } from "body-parser";

import { DB, PORT } from "./constants";

import userApis from "./apis/users";
import postApis from "./apis/posts";
import profileApis from "./apis/profiles";


require("./middlewares/passport-middleware");

const app = express();


app.use(cors());
app.use(json());
app.use(passport.initialize());
app.use(express.static(join(__dirname, "./uploads")));


app.use("/users", userApis);
app.use("/posts", postApis);
app.use("/profiles", profileApis);

const main = async () => {
  try {

    await mongoose.connect(DB, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true,
    });
    consola.success("DATABASE CONNECTED...");

    app.listen(PORT, () => consola.success(`Sever started on port ${PORT}`));
  } catch (err) {
    consola.error(`Unable to start the server \n${err.message}`);
  }
};

main();
