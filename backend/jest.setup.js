const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, './.env') });

// Override any variables that need a specific test value
process.env.NODE_ENV = 'test';

const { sequelize } = require('./models');

beforeAll(async () => {
  // Use a separate in-memory SQLite database for tests
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});