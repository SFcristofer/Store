const jwt = require('jsonwebtoken');
const { AuthenticationError } = require('apollo-server-express');
const logger = require('../config/logger');

const isAuth = (context) => {
  if (!context.user) {
    logger.error('User not authenticated');
    throw new AuthenticationError('You must be logged in to do that');
  }
  return true;
};

const isSeller = (context) => {
  isAuth(context); // First, ensure user is authenticated
  if (context.user.role !== 'seller') {
    logger.error('User is not a seller:', context.user.id);
    throw new AuthenticationError('You are not authorized to perform this action');
  }
  return true;
};

const isAdmin = (context) => {
  isAuth(context); // First, ensure user is authenticated
  if (context.user.role !== 'admin') {
    logger.error('User is not an admin:', context.user.id);
    throw new AuthenticationError('You are not authorized to perform this action (Admin required)');
  }
  return true;
};

module.exports = {
  isAuth,
  isSeller,
  isAdmin,
};
