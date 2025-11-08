const { Schema, model, Types } = require("mongoose");

const courseSchema = new Schema({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  credits: { type: Number, required: true, min: 1, max: 6 },
  instructor: { type: String, required: true },
  students: [{ type: Types.ObjectId, ref: "Student" }],
});

module.exports = model("Course", courseSchema);
