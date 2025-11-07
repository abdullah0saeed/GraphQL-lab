const { Schema, model } = require("mongoose");

const studentSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, required: true },
  major: { type: String },
});

module.exports = model("Student", studentSchema);
