const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');

const isAuth = (context) => {
  const authHeader = context.req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split('Bearer ')[1];
    if (token) {
      try {
        const user = jwt.verify(token, process.env.JWT_SECRET);
        context.user = user.user;
        return;
      } catch (err) {
        throw new AuthenticationError('Invalid/Expired token');
      }
    }
    throw new Error("Authentication token must be 'Bearer [token]");
  }
  throw new Error('Authorization header must be provided');
};

const isSeller = (context) => {
  isAuth(context);
  if (context.user.role !== 'seller' && context.user.role !== 'admin') {
    throw new AuthenticationError('You must be a seller or admin to perform this action');
  }
};

const isAdmin = (context) => {
  isAuth(context);
  if (context.user.role !== 'admin') {
    throw new AuthenticationError('You must be an admin to perform this action');
  }
};

module.exports = { isAuth, isSeller, isAdmin };
