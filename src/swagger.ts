import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kemnaker - Attendance API",
      version: "1.0.0",
      description: "REST API for employee attendance"
    },
    servers: [{ url: "http://localhost:6767" }]
  },
  apis: ["./src/routes/*.ts"]
})
