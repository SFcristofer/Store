const express = require('express');
require('dotenv').config(); // Cargar variables de entorno
const morgan = require('morgan');
const logger = require('./config/logger');

const { ApolloServer } = require('apollo-server-express');
const cors = require('cors');
const db = require('./models/index.js');
const { typeDefs, resolvers } = require('./graphql/resolvers.js');
const authRoutes = require('./routes/auth.js');
const notificationsRoutes = require('./routes/notifications.js'); // New import
const ordersRoutes = require('./routes/orders.js'); // Import new orders route

const app = express();

// Configurar Morgan para usar Winston
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json({ limit: '50mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationsRoutes); // New route
app.use('/api/orders', ordersRoutes); // Use new orders route

async function startServer() {
  // FIX: Changed 'schema' to 'typeDefs' and removed 'context' from destructuring
  // to resolve 'ReferenceError: schema is not defined' and ensure proper ApolloServer setup.
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req, models, SECRET }),
    formatError: (error) => {
      console.error("GraphQL Error:", error);
      return error;
    },
    persistedQueries: false,
  });

  await server.start();
  server.applyMiddleware({ app });

  const PORT = process.env.PORT || 4000;

  // Sincronizamos la base de datos y luego iniciamos el servidor
  db.sequelize.sync({ force: true }).then(() => {
    app.listen(PORT, () => {
      logger.info(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
    });
  });
}

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ message: 'An unexpected error occurred.' });
});

startServer();
