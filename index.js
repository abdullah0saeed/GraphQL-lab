const express = require("express");
const {
  ApolloServer,
  gql,
  AuthenticationError,
} = require("apollo-server-express");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Student = require("./models/student");
const Course = require("./models/course");
const User = require("./models/user");
require("dotenv").config();

const port = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

const typeDefs = gql`
  type User {
    id: ID!
    email: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # Input Types
  input StudentUpdateInput {
    name: String
    email: String
    age: Int
    major: String
  }

  input CourseUpdateInput {
    title: String
    code: String
    credits: Int
    instructor: String
  }

  input ListOptions {
    limit: Int
    offset: Int
    sortBy: String
    sortOrder: String
  }

  input StudentFilter {
    major: String
    nameContains: String
    minAge: Int
    maxAge: Int
  }

  input CourseFilter {
    codePrefix: String
    titleContains: String
    instructor: String
    minCredits: Int
    maxCredits: Int
  }

  # Main Entity Types
  type Student {
    id: ID!
    name: String!
    email: String!
    age: Int!
    major: String
    courses: [Course!]!
    coursesCount: Int!
  }

  type Course {
    id: ID!
    title: String!
    code: String!
    credits: Int!
    instructor: String!
    students: [Student!]!
    studentsCount: Int!
  }

  # Queries
  type Query {
    getAllStudents(filter: StudentFilter, options: ListOptions): [Student!]!
    getStudent(id: ID!): Student
    getAllCourses(filter: CourseFilter, options: ListOptions): [Course!]!
    getCourse(id: ID!): Course
  }

  # Mutations
  type Mutation {
    # Auth
    signup(email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!

    # Student
    addStudent(
      name: String!
      email: String!
      age: Int!
      major: String
    ): Student!
    updateStudent(id: ID!, input: StudentUpdateInput!): Student!
    deleteStudent(id: ID!): Boolean!

    # Course
    addCourse(
      title: String!
      code: String!
      credits: Int!
      instructor: String!
    ): Course!
    updateCourse(id: ID!, input: CourseUpdateInput!): Course!
    deleteCourse(id: ID!): Boolean!

    # Enrollment
    enrollStudent(studentId: ID!, courseId: ID!): Student!
    unenrollStudent(studentId: ID!, courseId: ID!): Student!
  }
`;

const resolvers = {
  Student: {
    courses: async (parent) => {
      // parent is the student object
      await parent.populate("courses");
      return parent.courses;
    },
    coursesCount: (parent) => parent.courses.length,
  },
  Course: {
    students: async (parent) => {
      // parent is the course object
      await parent.populate("students");
      return parent.students;
    },
    studentsCount: (parent) => parent.students.length,
  },
  Query: {
    getAllStudents: async (_, { filter = {}, options = {} }) => {
      // Filter -> Sort -> Paginate
      const query = {};
      if (filter.major) query.major = filter.major;
      if (filter.nameContains)
        query.name = { $regex: filter.nameContains, $options: "i" };
      if (filter.minAge || filter.maxAge) {
        query.age = {};
        if (filter.minAge) query.age.$gte = filter.minAge;
        if (filter.maxAge) query.age.$lte = filter.maxAge;
      }

      const sort = {};
      if (options.sortBy) {
        sort[options.sortBy] = options.sortOrder === "DESC" ? -1 : 1;
      }

      const limit = Math.min(options.limit || 10, 50);
      const offset = options.offset || 0;

      return Student.find(query).sort(sort).skip(offset).limit(limit);
    },
    getStudent: async (_, { id }) => Student.findById(id),
    getAllCourses: async (_, { filter = {}, options = {} }) => {
      // Filter -> Sort -> Paginate
      const query = {};
      if (filter.instructor) query.instructor = filter.instructor;
      if (filter.titleContains)
        query.title = { $regex: filter.titleContains, $options: "i" };
      if (filter.codePrefix)
        query.code = { $regex: `^${filter.codePrefix}`, $options: "i" };
      if (filter.minCredits || filter.maxCredits) {
        query.credits = {};
        if (filter.minCredits) query.credits.$gte = filter.minCredits;
        if (filter.maxCredits) query.credits.$lte = filter.maxCredits;
      }

      const sort = {};
      if (options.sortBy) {
        sort[options.sortBy] = options.sortOrder === "DESC" ? -1 : 1;
      }

      const limit = Math.min(options.limit || 10, 50);
      const offset = options.offset || 0;

      return Course.find(query).sort(sort).skip(offset).limit(limit);
    },
    getCourse: async (_, { id }) => Course.findById(id),
  },
  Mutation: {
    // Auth
    signup: async (_, { email, password }) => {
      const user = new User({ email, password });
      await user.save();
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: "2h",
      });
      return { token, user };
    },
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError("Invalid credentials");
      }
      const valid = await user.isCorrectPassword(password);
      if (!valid) {
        throw new AuthenticationError("Invalid credentials");
      }
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, {
        expiresIn: "2h",
      });
      return { token, user };
    },

    // Guarded Mutations
    addStudent: async (_, { name, email, age, major }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      const student = new Student({ name, email, age, major });
      await student.save();
      return student;
    },
    updateStudent: async (_, { id, input }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      return Student.findByIdAndUpdate(id, input, { new: true });
    },
    deleteStudent: async (_, { id }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      // Clean delete
      await Course.updateMany({ students: id }, { $pull: { students: id } });
      await Student.findByIdAndDelete(id);
      return true;
    },
    addCourse: async (_, { title, code, credits, instructor }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      const course = new Course({ title, code, credits, instructor });
      await course.save();
      return course;
    },
    updateCourse: async (_, { id, input }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      return Course.findByIdAndUpdate(id, input, { new: true });
    },
    deleteCourse: async (_, { id }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      // Clean delete
      await Student.updateMany({ courses: id }, { $pull: { courses: id } });
      await Course.findByIdAndDelete(id);
      return true;
    },

    // Enrollment Mutations
    enrollStudent: async (_, { studentId, courseId }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      // Ensure no duplicates
      await Student.findByIdAndUpdate(studentId, {
        $addToSet: { courses: courseId },
      });
      await Course.findByIdAndUpdate(courseId, {
        $addToSet: { students: studentId },
      });
      return Student.findById(studentId);
    },
    unenrollStudent: async (_, { studentId, courseId }, context) => {
      if (!context.user) throw new AuthenticationError("UNAUTHENTICATED");
      await Student.findByIdAndUpdate(studentId, {
        $pull: { courses: courseId },
      });
      await Course.findByIdAndUpdate(courseId, {
        $pull: { students: studentId },
      });
      return Student.findById(studentId);
    },
  },
};

const startServer = async () => {
  const app = express();
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // Context for Auth
    context: ({ req }) => {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (token) {
        try {
          const user = jwt.verify(token, JWT_SECRET);
          return { user };
        } catch (err) {
          return {};
        }
      }
      return {};
    },
  });

  await server.start();
  server.applyMiddleware({ app, path: "/graphql" });

  await mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log("Connected to MongoDB");
  });

  app.listen(port, () => {
    console.log(
      `Server ready at http://localhost:${port}${server.graphqlPath}`
    );
  });
};

startServer();
