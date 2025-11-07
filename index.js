const express = require("express");
const { ApolloServer, gql } = require("apollo-server-express");
const mongoose = require("mongoose");
const Student = require("./models/student");
const Course = require("./models/course");

const port = 4000;

const typeDefs = gql`
  type Student {
    name: String!
    email: String!
    age: Int!
    major: String
  }

  type Course {
    title: String!
    code: String!
    credits: Int!
    instructor: String!
    students: [Student]!
  }

  type Query {
    getAllStudents: [Student]!
    getStudent(id: ID!): Student
    getAllCourses: [Course]!
    getCourse(id: ID!): Course
    searchStudentsByMajor(major: String!): [Student]!
  }

  type Mutation {
    addStudent(
      name: String!
      email: String!
      age: Int!
      major: String
    ): Student!

    updateStudent(
      id: ID!
      name: String
      email: String
      age: Int
      major: String
    ): Student

    deleteStudent(id: ID!): Student

    addCourse(
      title: String!
      code: String!
      credits: Int!
      instructor: String!
    ): Course

    updateCourse(
      id: ID!
      title: String
      code: String
      credits: Int
      instructor: String
    ): Course

    deleteCourse(id: ID!): Course
  }
`;

const resolvers = {
  Query: {
    getAllStudents: async () => {
      const students = await Student.find();
      return students;
    },
    getStudent: async (_, { id }) => {
      const student = await Student.findById(id);
      return student;
    },
    getAllCourses: async () => {
      const courses = await Course.find().populate("students");
      return courses;
    },
    getCourse: async (_, { id }) => {
      const course = await Course.findById(id).populate("students");
      return course;
    },
    searchStudentsByMajor: async (_, { major }) => {
      const students = await Student.find({ major });
      return students;
    },
  },
  Mutation: {
    addStudent: async (_, { name, email, age, major }) => {
      const student = new Student({ name, email, age, major });
      await student.save();
      return student;
    },
    updateStudent: async (_, { id, name, email, age, major }) => {
      const updatedFields = Object.fromEntries(
        Object.entries({ name, email, age, major })
          .filter(([key, value]) => value !== undefined)
          .map(([key, value]) => [key, value])
      );
      const student = await Student.findByIdAndUpdate(id, updatedFields, {
        new: true,
      });
      return student;
    },
    deleteStudent: async (_, { id }) => {
      const student = await Student.findByIdAndDelete(id);
      return student;
    },
    addCourse: async (_, { title, code, credits, instructor }) => {
      const course = new Course({ title, code, credits, instructor });
      await course.save();
      return course;
    },
    updateCourse: async (_, { id, title, code, credits, instructor }) => {
      const updatedFields = Object.fromEntries(
        Object.entries({ title, code, credits, instructor })
          .filter(([key, value]) => value !== undefined)
          .map(([key, value]) => [key, value])
      );
      const course = await Course.findByIdAndUpdate(id, updatedFields, {
        new: true,
      });
      return course;
    },
    deleteCourse: async (_, { id }) => {
      const course = await Course.findByIdAndDelete(id);
      return course;
    },
  },
};

const startServer = async () => {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });
  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  await mongoose.connect("mongodb://localhost:27017/graphql-demo").then(() => {
    console.log("Connected to MongoDB");
  });

  app.listen(port, () => {
    console.log(`Server listening at PORT: ${port}`);
  });
};
startServer();
