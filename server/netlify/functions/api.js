const serverless = require("serverless-http");
const app = require("../../server");

const handler = serverless(app, {
  basePath: "/api",
});

exports.handler = async (event, context) => {
  try {
    await app.ensureDatabaseConnection();
    return handler(event, context);
  } catch (error) {
    console.error("Netlify function database connection failed:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Database connection failed" }),
    };
  }
};
