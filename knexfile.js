// Knex configuration file
// This file defines database connection settings for development, testing, and production.
// Update these settings once your AWS RDS database is provisioned.
// See: https://knexjs.org/

module.exports = {
  development: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "ella_rises_dev",
    },
    migrations: {
      directory: "./db/migrations",
    },
    seeds: {
      directory: "./db/seeds",
    },
  },

  testing: {
    client: "pg",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "ella_rises_test",
    },
    migrations: {
      directory: "./db/migrations",
    },
  },

  production: {
    client: "pg",
    connection: process.env.DATABASE_URL, // AWS RDS connection string
    migrations: {
      directory: "./db/migrations",
    },
    seeds: {
      directory: "./db/seeds",
    },
  },
};
