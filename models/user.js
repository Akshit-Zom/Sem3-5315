// load mongoose since we need it to define a model
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: [true, "Please enter a username!"],
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Please provide a valid password!"],
  },
});

module.exports = mongoose.model("user", userSchema);
