# GraphQL Lab

This is a simple GraphQL API built with Node.js, Express, and MongoDB.

## Environment Variables

The following environment variables are required:

- `PORT`: The port to run the server on (defaults to 4000)
- `JWT_SECRET`: The secret to use for JSON Web Tokens
- `MONGODB_URI`: The URI to use for MongoDB

For example, you can create a `.env` file with the following contents:

```
PORT=4000
JWT_SECRET=secret
MONGODB_URI=mongodb://localhost/graphql-lab
```

## Running the Server

To run the server, run the following command:

```
npm run dev
```

This will start the server on port 4000.

## Testing the Server

To test the server, you can use the [Apollo Sandbox](https://studio.apollographql.com/sandbox/explorer/?).
