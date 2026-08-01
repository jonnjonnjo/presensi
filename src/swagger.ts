import swaggerJSDoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Kemnaker - Attendance API",
      version: "1.0.0",
      description: "REST API for employee attendance"
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 6767}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/routes/*.ts"]
})
