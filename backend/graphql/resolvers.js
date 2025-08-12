const {
  User,
  Store,
  Product,
  Category,
  Cart,
  CartItem,
  Order,
  OrderItem,
  Address,
  PaymentMethod,
  ProductReview,
  Notification, // Added Notification model
  sequelize,
} = require('../models/index.js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Import crypto
// const nodemailer = require('nodemailer'); // Uncomment and configure for email sending
const { AuthenticationError, ApolloError } = require('apollo-server-express');
const { UniqueConstraintError, Op } = require('sequelize');
const Joi = require('joi');
const { isAuth, isSeller, isAdmin } = require('../middleware/auth');

const logger = require('../config/logger');

// Define JWT Secret Key (HARDCODED FOR DIAGNOSIS - TO BE REMOVED LATER)
// Middleware de autenticación para obtener el usuario desde el token
const context = ({ req }) => {
  const token = req.headers.authorization || '';
  if (token) {
    const secret = process.env.JWT_SECRET;
    try {
      const decoded = jwt.verify(token.replace('Bearer ', ''), secret);
      return { user: decoded.user, req };
    } catch (e) {
      logger.warn('JWT Verification failed, continuing as unauthenticated user:', e.message);
    }
  }
  return { req };
};

const resolvers = {
  Product: {
    reviews: async (product) => await product.getReviews({
      include: [{ model: User, as: 'user' }] // Include the associated user
    }),
    averageRating: async (product) => {
      const reviews = await product.getReviews(); // This might also need the include if it's used directly
      if (reviews.length === 0) return 0;
      const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
      return sum / reviews.length;
    },
  },
  Query: {
    hello: () => 'Hello from GraphQL!',
    me: async (_, __, context) => {
      isAuth(context);
      const user = await User.findByPk(context.user.id, {
        include: [
          {
            model: Store,
            as: 'store',
            include: [
              {
                model: Product,
                as: 'products',
                include: [{ model: Category, as: 'category' }],
              },
            ],
          },
          {
            model: Cart,
            as: 'cart',
            include: [
              {
                model: CartItem,
                as: 'items',
                include: [
                  { model: Product, as: 'product', include: [{ model: Store, as: 'store' }] },
                ],
              },
            ],
          },
          {
            model: Address,
            as: 'addresses',
          },
          {
            model: PaymentMethod,
            as: 'paymentMethods',
          },
        ],
      });
      return user;
    },
    getAllProducts: async (
      _,
      { categoryId, minPrice, maxPrice, search, sortBy, sortOrder, storeId }
    ) => {
      const options = { include: ['store', { model: Category, as: 'category' }] };
      const where = {};

      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (storeId) {
        // Nuevo filtro por storeId
        where.storeId = storeId;
      }
      if (minPrice) {
        where.price = { ...where.price, [Op.gte]: minPrice };
      }
      if (maxPrice) {
        where.price = { ...where.price, [Op.lte]: maxPrice };
      }
      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (Object.keys(where).length > 0) {
        options.where = where;
      }

      if (sortBy) {
        options.order = [[sortBy, sortOrder || 'ASC']];
      }

      return await Product.findAll(options);
    },
    getAllStores: async (_, { search, sortBy, sortOrder }) => {
      const options = { include: ['products', 'owner'] };
      const where = {};

      if (search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (Object.keys(where).length > 0) {
        options.where = where;
      }

      // Handle sorting
      if (sortBy) {
        if (sortBy === 'averageRating') {
          // For averageRating, we need to calculate it and then sort in memory
          // Or, if possible, use a subquery/join for aggregation in DB
          // For simplicity, we'll fetch all and sort in memory for now.
          // A more performant solution would involve direct DB aggregation.
          const stores = await Store.findAll(options);
          const storesWithRating = await Promise.all(stores.map(async store => {
            const avgRating = await resolvers.Store.averageRating(store);
            return { ...store.toJSON(), averageRating: avgRating };
          }));

          storesWithRating.sort((a, b) => {
            if (sortOrder === 'DESC') {
              return b.averageRating - a.averageRating;
            }
            return a.averageRating - b.averageRating;
          });
          return storesWithRating;
        } else {
          options.order = [[sortBy, sortOrder || 'ASC']];
        }
      }

      const stores = await Store.findAll(options);
      // If not sorting by averageRating, ensure it's added to each store object
      const storesWithRating = await Promise.all(stores.map(async store => {
        let avgRating = 0; // Default to 0
        try {
          avgRating = await resolvers.Store.averageRating(store);
        } catch (e) {
          logger.error(`Error calculating averageRating for store ${store.id}:`, e);
        }
        return { ...store.toJSON(), averageRating: avgRating };
      }));
      return storesWithRating;
    },
    getStoreById: async (_, { id }) => await Store.findByPk(id, { include: ['products', 'owner'] }),
    getAllCategories: async () => await Category.findAll(),
    getProductsByCategory: async (_, { categoryId }) =>
      await Product.findAll({
        where: { categoryId },
        include: ['store', { model: Category, as: 'category' }],
      }),
    customerOrders: async (_, __, context) => {
      isAuth(context);
      return await Order.findAll({
        where: { userId: context.user.id },
        include: [
          { model: User, as: 'customer' },
          { model: Store, as: 'store', include: ['owner'] },
          { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        ],
        order: [['createdAt', 'DESC']], // Ordenar por los más recientes
      });
    },
    myCart: async (_, __, context) => {
      isAuth(context);
      let cart = await Cart.findOne({
        where: { userId: context.user.id },
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                include: [{ model: Store, as: 'store' }],
              },
            ],
          },
        ],
      });
      if (!cart) {
        cart = await Cart.create({ userId: context.user.id });
      }
      return cart;
    },
    myAddresses: async (_, __, context) => {
      isAuth(context);
      return await Address.findAll({ where: { userId: context.user.id } });
    },
    myPaymentMethods: async (_, __, context) => {
      isAuth(context);
      return await PaymentMethod.findAll({ where: { userId: context.user.id } });
    },
    getProductById: async (_, { id }) => {
      const product = await Product.findByPk(id, {
        include: [
          { model: Store, as: 'store' },
          { model: Category, as: 'category' },
        ],
      });
      if (!product) {
        throw new ApolloError('Product not found', 'PRODUCT_NOT_FOUND');
      }
      return product;
    },
    sellerOrders: async (_, __, context) => {
      isSeller(context);

      const store = await Store.findOne({ where: { ownerId: context.user.id } });
      if (!store) {
        throw new ApolloError('You do not own a store.', 'STORE_NOT_FOUND');
      }

      return await Order.findAll({
        where: { storeId: store.id },
        include: [
          { model: User, as: 'customer' },
          { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        ],
        order: [['createdAt', 'DESC']],
      });
    },

    adminGetAllUsers: async (_, __, context) => {
      isAdmin(context);
      return await User.findAll({
        attributes: ['id', 'name', 'email', 'role', 'isVerified', 'status', 'createdAt', 'updatedAt'],
      });
    },
    adminGetAllStores: async (_, __, context) => {
      isAdmin(context);
      return await Store.findAll({ include: ['owner', 'products'] });
    },
    adminGetAllProducts: async (_, __, context) => {
      isAdmin(context);
      return await Product.findAll({ include: ['store', 'category'] });
    },
    adminGetAllOrders: async (_, __, context) => {
      isAdmin(context);
      return await Order.findAll({
        include: [
          { model: User, as: 'customer' },
          { model: Store, as: 'store', include: ['owner'] },
          { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
        ],
        order: [['createdAt', 'DESC']],
      });
    },

    adminGetDashboardStats: async (_, __, context) => {
      isAdmin(context);
      return {
        totalUsers: 100,
        totalStores: 10,
        totalProducts: 500,
        totalOrders: 250,
        totalSalesVolume: 12345.67,
      };
    },

    adminGetSalesData: async (_, { period, startDate, endDate }, context) => {
      isAdmin(context);

      const salesData = [];
      let groupByFormat;
      let dateWhere = {};

      // Validate period and set date formatting for grouping
      switch (period) {
        case 'daily':
          groupByFormat = '%Y-%m-%d'; // YYYY-MM-DD
          break;
        case 'monthly':
          groupByFormat = '%Y-%m'; // YYYY-MM
          break;
        case 'yearly':
          groupByFormat = '%Y'; // YYYY
          break;
        default:
          throw new ApolloError('Invalid period. Must be daily, monthly, or yearly.', 'BAD_USER_INPUT');
      }

      // Construct date range filter
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      // Aggregate sales data
      const aggregatedSales = await Order.findAll({
        attributes: [
          [sequelize.fn('strftime', groupByFormat, sequelize.col('Order.createdAt')), 'date'],
          [sequelize.fn('SUM', sequelize.col('Order.totalAmount')), 'totalSales'],
        ],
        where: dateWhere,
        group: [sequelize.fn('strftime', groupByFormat, sequelize.col('Order.createdAt'))],
        order: [[sequelize.fn('strftime', groupByFormat, sequelize.col('Order.createdAt')), 'ASC']],
        raw: true, // Return raw data, not Sequelize instances
      });

      // Format the results
      for (const dataPoint of aggregatedSales) {
        salesData.push({
          date: dataPoint.date,
          totalSales: parseFloat(dataPoint.totalSales),
        });
      }

      return salesData;
    },

    adminGetUserRegistrations: async (_, { period, startDate, endDate }, context) => {
      isAdmin(context);

      let groupByFormat;
      let dateWhere = {};

      switch (period) {
        case 'daily':
          groupByFormat = '%Y-%m-%d';
          break;
        case 'monthly':
          groupByFormat = '%Y-%m';
          break;
        case 'yearly':
          groupByFormat = '%Y';
          break;
        default:
          throw new ApolloError('Invalid period. Must be daily, monthly, or yearly.', 'BAD_USER_INPUT');
      }

      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const aggregatedRegistrations = await User.findAll({
        attributes: [
          [sequelize.fn('strftime', groupByFormat, sequelize.col('User.createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('User.id')), 'count'],
        ],
        where: dateWhere,
        group: [sequelize.fn('strftime', groupByFormat, sequelize.col('User.createdAt'))],
        order: [[sequelize.fn('strftime', groupByFormat, sequelize.col('User.createdAt')), 'ASC']],
        raw: true,
      });

      const registrationData = [];
      for (const dataPoint of aggregatedRegistrations) {
        registrationData.push({
          date: dataPoint.date,
          count: parseInt(dataPoint.count, 10),
        });
      }

      return registrationData;
    },

    adminGetTopSellingProducts: async (_, { limit = 10, startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const topProducts = await OrderItem.findAll({
        attributes: [
          'productId',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantitySold'],
          [sequelize.fn('SUM', sequelize.literal('`OrderItem`.`quantity` * `OrderItem`.`priceAtOrder`')), 'totalRevenue'],
        ],
        include: [
          {
            model: Order,
            as: 'Order',
            attributes: [],
            where: dateWhere,
          },
          {
            model: Product,
            as: 'product',
            attributes: ['name'],
          },
        ],
        group: ['productId', 'product.name'],
        order: [[sequelize.literal('`totalRevenue`'), 'DESC']],
        limit: limit,
        raw: true,
      });

      return topProducts.map(p => ({
        productId: p.productId,
        productName: p['product.name'],
        totalQuantitySold: parseInt(p.totalQuantitySold, 10),
        totalRevenue: parseFloat(p.totalRevenue),
      }));
    },

    adminGetOrderStatusDistribution: async (_, { startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const statusCounts = await Order.findAll({
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: dateWhere,
        group: ['status'],
        raw: true,
      });

      const totalOrders = statusCounts.reduce((sum, item) => sum + parseInt(item.count, 10), 0);

      return statusCounts.map(item => ({
        status: item.status,
        count: parseInt(item.count, 10),
        percentage: totalOrders > 0 ? (parseInt(item.count, 10) / totalOrders) * 100 : 0,
      }));
    },

    adminGetTopPerformingStores: async (_, { limit = 10, startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const topStores = await Order.findAll({
        attributes: [
          'storeId',
          [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalRevenue'],
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'totalOrders'],
        ],
        where: dateWhere,
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['name'],
          },
        ],
        group: ['storeId', 'store.name'],
        order: [[sequelize.literal('`totalRevenue`'), 'DESC']],
        limit: limit,
        raw: true,
      });

      return topStores.map(s => ({
        storeId: s.storeId,
        storeName: s['store.name'],
        totalRevenue: parseFloat(s.totalRevenue),
        totalOrders: parseInt(s.totalOrders, 10),
      }));
    },

    adminGetCategorySales: async (_, { startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const categorySales = await OrderItem.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.literal('`OrderItem`.`quantity` * `OrderItem`.`priceAtOrder`')), 'totalRevenue'],
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantitySold'],
        ],
        include: [
          {
            model: Order,
            as: 'Order',
            attributes: [],
            where: dateWhere,
          },
          {
            model: Product,
            as: 'product',
            attributes: [],
            include: [
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        group: ['product.category.id', 'product.category.name'],
        order: [[sequelize.literal('`totalRevenue`'), 'DESC']],
        raw: true,
      });

      return categorySales.map(c => ({
        categoryId: c['product.category.id'],
        categoryName: c['product.category.name'],
        totalRevenue: parseFloat(c.totalRevenue),
        totalQuantitySold: parseInt(c.totalQuantitySold, 10),
      }));
    },

    adminGetProductsPublishedByStore: async (_, __, context) => {
      isAdmin(context);
      const productsByStore = await Product.findAll({
        attributes: [
          'storeId',
          [sequelize.fn('COUNT', sequelize.col('Product.id')), 'productCount'],
        ],
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['name'],
          },
        ],
        group: ['storeId', 'store.name'],
        raw: true,
      });

      return productsByStore.map(p => ({
        storeId: p.storeId,
        storeName: p['store.name'],
        productCount: parseInt(p.productCount, 10),
      }));
    },

    adminGetProductsSold: async (_, { startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const productsSold = await OrderItem.findAll({
        attributes: [
          'productId',
          [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantitySold'],
        ],
        include: [
          {
            model: Order,
            as: 'Order',
            attributes: [],
            where: dateWhere,
          },
          {
            model: Product,
            as: 'product',
            attributes: ['name'],
          },
        ],
        group: ['productId', 'product.name'],
        order: [[sequelize.literal('`totalQuantitySold`'), 'DESC']],
        raw: true,
      });

      return productsSold.map(p => ({
        productId: p.productId,
        productName: p['product.name'],
        totalQuantitySold: parseInt(p.totalQuantitySold, 10),
      }));
    },

    adminGetOrdersCreatedByStores: async (_, { startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const ordersByStore = await Order.findAll({
        attributes: [
          'storeId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        ],
        where: dateWhere,
        include: [
          {
            model: Store,
            as: 'store',
            attributes: ['name'],
          },
        ],
        group: ['storeId', 'store.name'],
        order: [[sequelize.literal('`orderCount`'), 'DESC']],
        raw: true,
      });

      return ordersByStore.map(o => ({
        storeId: o.storeId,
        storeName: o['store.name'],
        orderCount: parseInt(o.orderCount, 10),
      }));
    },

    adminGetOrdersCreatedByBuyers: async (_, { startDate, endDate }, context) => {
      isAdmin(context);

      let dateWhere = {};
      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const ordersByBuyer = await Order.findAll({
        attributes: [
          'userId',
          [sequelize.fn('COUNT', sequelize.col('id')), 'orderCount'],
        ],
        where: dateWhere,
        include: [
          {
            model: User,
            as: 'customer',
            attributes: ['name'],
          },
        ],
        group: ['userId', 'customer.name'],
        order: [[sequelize.literal('`orderCount`'), 'DESC']],
        raw: true,
      });

      return ordersByBuyer.map(o => ({
        userId: o.userId,
        userName: o['customer.name'],
        orderCount: parseInt(o.orderCount, 10),
      }));
    },

    adminGetNewUsersCount: async (_, { period, startDate, endDate }, context) => {
      isAdmin(context);

      let groupByFormat;
      let dateWhere = {};

      switch (period) {
        case 'daily':
          groupByFormat = '%Y-%m-%d';
          break;
        case 'monthly':
          groupByFormat = '%Y-%m';
          break;
        case 'yearly':
          groupByFormat = '%Y';
          break;
        default:
          throw new ApolloError('Invalid period. Must be daily, monthly, or yearly.', 'BAD_USER_INPUT');
      }

      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const newUsers = await User.findAll({
        attributes: [
          [sequelize.fn('strftime', groupByFormat, sequelize.col('User.createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('User.id')), 'count'],
        ],
        where: dateWhere,
        group: [sequelize.fn('strftime', groupByFormat, sequelize.col('User.createdAt'))],
        order: [[sequelize.fn('strftime', groupByFormat, sequelize.col('User.createdAt')), 'ASC']],
        raw: true,
      });

      return newUsers.map(u => ({
        date: u.date,
        count: parseInt(u.count, 10),
      }));
    },

    adminGetNewStoresCount: async (_, { period, startDate, endDate }, context) => {
      isAdmin(context);

      let groupByFormat;
      let dateWhere = {};

      switch (period) {
        case 'daily':
          groupByFormat = '%Y-%m-%d';
          break;
        case 'monthly':
          groupByFormat = '%Y-%m';
          break;
        case 'yearly':
          groupByFormat = '%Y';
          break;
        default:
          throw new ApolloError('Invalid period. Must be daily, monthly, or yearly.', 'BAD_USER_INPUT');
      }

      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const newStores = await Store.findAll({
        attributes: [
          [sequelize.fn('strftime', groupByFormat, sequelize.col('Store.createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('Store.id')), 'count'],
        ],
        where: dateWhere,
        group: [sequelize.fn('strftime', groupByFormat, sequelize.col('Store.createdAt'))],
        order: [[sequelize.fn('strftime', groupByFormat, sequelize.col('Store.createdAt')), 'ASC']],
        raw: true,
      });

      return newStores.map(s => ({
        date: s.date,
        count: parseInt(s.count, 10),
      }));
    },

    adminGetCancelledOrders: async (_, { period, startDate, endDate }, context) => {
      isAdmin(context);

      let groupByFormat;
      let dateWhere = { status: 'cancelled' };

      switch (period) {
        case 'hourly':
          groupByFormat = '%Y-%m-%d %H';
          break;
        case 'daily':
          groupByFormat = '%Y-%m-%d';
          break;
        case 'monthly':
          groupByFormat = '%Y-%m';
          break;
        case 'yearly':
          groupByFormat = '%Y';
          break;
        default:
          throw new ApolloError('Invalid period. Must be hourly, daily, monthly, or yearly.', 'BAD_USER_INPUT');
      }

      if (startDate) {
        dateWhere.createdAt = { [Op.gte]: new Date(startDate) };
      }
      if (endDate) {
        dateWhere.createdAt = { ...(dateWhere.createdAt || {}), [Op.lte]: new Date(endDate) };
      }

      const cancelledOrders = await Order.findAll({
        attributes: [
          [sequelize.fn('strftime', groupByFormat, sequelize.col('Order.createdAt')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('Order.id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('Order.totalAmount')), 'totalAmount'],
        ],
        where: dateWhere,
        group: [sequelize.fn('strftime', groupByFormat, sequelize.col('Order.createdAt'))],
        order: [[sequelize.fn('strftime', groupByFormat, sequelize.col('Order.createdAt')), 'ASC']],
        raw: true,
      });

      return cancelledOrders.map(o => ({
        date: o.date,
        count: parseInt(o.count, 10),
        totalAmount: parseFloat(o.totalAmount),
      }));
    },
  },

  Mutation: {
    registerUser: async (_, { name, email, password }) => {
      const schema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
      });

      const { error } = schema.validate({ name, email, password });
      if (error) {
        logger.error('Validation error during user registration:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      try {
        const verificationToken = crypto.randomBytes(20).toString('hex'); // Generate verification token
        const verificationTokenExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
        const user = await User.create({
          name,
          email,
          password: password, // Pass plain-text password, model hook will hash it
          role: 'customer',
          isVerified: false, // Explicitly set to false
          verificationToken, // Save the token
          verificationTokenExpires, // Save the expiration date
        });

        // TODO: Implement actual email sending for email verification
        /*
        // Example using Nodemailer (requires setup and configuration)
        // const nodemailer = require('nodemailer'); // Uncomment at top of file if not already
        // const transporter = nodemailer.createTransport({
        //   service: 'Gmail', // e.g., 'Gmail', 'Outlook365', or custom SMTP
        //   auth: {
        //     user: process.env.EMAIL_USER, // Your email address
        //     pass: process.env.EMAIL_PASS, // Your email password or app-specific password
        //   },
        // });

        // const verificationLink = `http://localhost:3000/verify-email/${verificationToken}`; // Adjust frontend URL as needed

        // const mailOptions = {
        //   from: process.env.EMAIL_USER,
        //   to: user.email,
        //   subject: 'Verify Your Email Address',
        //   html: `
        //     <p>Dear ${user.name},</p>
        //     <p>Thank you for registering! Please verify your email address by clicking on the link below:</p>
        //     <p><a href="${verificationLink}">${verificationLink}</a></p>
        //     <p>This link will expire in 24 hours.</p>
        //     <p>If you did not register for this service, please ignore this email.</p>
        //     <p>Thank you!</p>
        //   `,
        // };

        // try {
        //   await transporter.sendMail(mailOptions);
        //   logger.info(`Verification email sent to ${user.email}`);
        // } catch (emailError) {
        //   logger.error(`Failed to send verification email to ${user.email}:`, emailError);
        // }
        */

        const payload = {
          user: {
            id: user.id,
            role: user.role,
            isVerified: user.isVerified, // Include isVerified in payload
          },
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
        logger.info('JWT_SECRET used for signing (registerUser): ', process.env.JWT_SECRET); // DEBUG
        return token;
      } catch (error) {
        if (error instanceof UniqueConstraintError) {
          logger.error('Error during user registration (user already exists):', error.message);
          throw new ApolloError('User already exists', 'USER_ALREADY_EXISTS');
        } else {
          logger.error('Error during user registration:', error);
          throw new ApolloError('Could not register user', 'INTERNAL_SERVER_ERROR');
        }
      }
    },

    loginUser: async (_, { email, password }) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(6).required(),
      });

      const { error } = schema.validate({ email, password });
      if (error) {
        logger.error('Validation error during user login:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        throw new AuthenticationError('Invalid credentials');
      }
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        throw new AuthenticationError('Invalid credentials');
      }
      const payload = {
        user: {
          id: user.id,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
      logger.info('JWT_SECRET used for signing (loginUser): ', process.env.JWT_SECRET); // DEBUG
      return token;
    },

    createStore: async (_, { name, description, imageUrl }, context) => {
      const schema = Joi.object({
        name: Joi.string().min(3).max(100).required(),
        description: Joi.string().min(10).max(500).required(),
        imageUrl: Joi.string().allow(null, ''), // Allow any string, including relative paths
      });

      const { error } = schema.validate({ name, description, imageUrl });
      if (error) {
        logger.error('Validation error during store creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      logger.info('createStore resolver called with:', { name, description, imageUrl });
      isSeller(context);

      const store = await Store.create({ name, description, ownerId: context.user.id, imageUrl });
      logger.info('Store created in DB:', store.toJSON());
      return store;
    },

    updateStore: async (_, { id, name, description, imageUrl }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(3).max(100).optional(),
        description: Joi.string().min(10).max(500).optional(),
        imageUrl: Joi.string().allow(null, '').optional(),
      }).min(2); // At least 'id' and one other field must be present for update

      const { error } = schema.validate({ id, name, description, imageUrl });
      if (error) {
        logger.error('Validation error during store update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      logger.info('updateStore resolver called with:', { id, name, description, imageUrl });
      isAuth(context);
      const store = await Store.findByPk(id);
      if (!store || store.ownerId !== context.user.id) {
        throw new AuthenticationError('You can only update your own store');
      }
      await store.update({ name, description, imageUrl });
      logger.info('Store updated in DB:', store.toJSON());
      return store;
    },

    createProduct: async (
      _,
      { name, description, price, storeId, categoryId, imageUrl, stock },
      context
    ) => {
      const schema = Joi.object({
        name: Joi.string().min(3).max(100).required(),
        description: Joi.string().min(10).max(500).required(),
        price: Joi.number().positive().required(),
        storeId: Joi.string().required(), // Assuming ID is string
        categoryId: Joi.string().required(), // Assuming ID is string
        imageUrl: Joi.string().allow(null, '').optional(),
        stock: Joi.number().integer().min(0).required(),
      });

      const { error } = schema.validate({
        name,
        description,
        price,
        storeId,
        categoryId,
        imageUrl,
        stock,
      });
      if (error) {
        logger.error('Validation error during product creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isSeller(context);

      const store = await Store.findByPk(storeId);
      if (!store || store.ownerId !== context.user.id) {
        throw new AuthenticationError('You can only add products to your own store');
      }

      const product = await Product.create({
        name,
        description,
        price,
        storeId,
        categoryId,
        imageUrl,
        stock,
      });
      return product;
    },

    updateProduct: async (
      _,
      { id, name, description, price, imageUrl, stock, categoryId },
      context
    ) => {
      const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(3).max(100).optional(),
        description: Joi.string().min(10).max(500).optional(),
        price: Joi.number().positive().optional(),
        imageUrl: Joi.string().allow(null, '').optional(),
        stock: Joi.number().integer().min(0).optional(),
        categoryId: Joi.string().optional(),
      }).min(2); // At least 'id' and one other field must be present for update

      const { error } = schema.validate({
        id,
        name,
        description,
        price,
        imageUrl,
        stock,
        categoryId,
      });
      if (error) {
        logger.error('Validation error during product update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isSeller(context);
      const product = await Product.findByPk(id, { include: 'store' });
      if (!product || product.store.ownerId !== context.user.id) {
        throw new AuthenticationError('You can only update products in your own store');
      }
      await product.update({ name, description, price, imageUrl, stock, categoryId });
      return product;
    },

    deleteProduct: async (_, { id }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        logger.error('Validation error during product deletion:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isSeller(context);
      const product = await Product.findByPk(id, { include: 'store' });
      if (!product || product.store.ownerId !== context.user.id) {
        throw new AuthenticationError('You can only delete products in your own store');
      }
      await product.destroy();
      return true;
    },

    createCategory: async (_, { name }, context) => {
      isAdmin(context); // Added isAdmin check
      const schema = Joi.object({
        name: Joi.string().min(3).max(50).required(),
      });

      const { error } = schema.validate({ name });
      if (error) {
        logger.error('Validation error during category creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      const category = await Category.create({ name });
      return category;
    },

    updateCategory: async (_, { id, name }, context) => {
      isAdmin(context);
      const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(3).max(50).required(),
      });

      const { error } = schema.validate({ id, name });
      if (error) {
        logger.error('Validation error during category update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      const category = await Category.findByPk(id);
      if (!category) {
        throw new ApolloError('Category not found', 'CATEGORY_NOT_FOUND');
      }

      category.name = name;
      await category.save();
      return category;
    },

    deleteCategory: async (_, { id }, context) => {
      isAdmin(context);
      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        logger.error('Validation error during category deletion:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      const category = await Category.findByPk(id);
      if (!category) {
        throw new ApolloError('Category not found', 'CATEGORY_NOT_FOUND');
      }

      await category.destroy();
      return true;
    },

    updateUser: async (_, { id, name, email, password }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
        name: Joi.string().min(3).max(50).optional(),
        email: Joi.string().email().optional(),
        password: Joi.string().min(6).optional(),
      }).min(2); // At least 'id' and one other field must be present for update

      const { error } = schema.validate({ id, name, email, password });
      if (error) {
        logger.error('Validation error during user update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);

      const user = await User.findByPk(id);
      if (!user) {
        throw new ApolloError('User not found', 'USER_NOT_FOUND');
      }

      if (name) user.name = name;
      if (email) user.email = email;
      if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
      }

      await user.save();
      return user;
    },

    createOrder: async (_, { input }, context) => {
      logger.info('createOrder input:', input);
      const orderItemSchema = Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
        priceAtOrder: Joi.number().positive().required(),
      });

      const createOrderSchema = Joi.object({
        storeId: Joi.string().required(),
        addressId: Joi.string().required(),
        items: Joi.array().items(orderItemSchema).min(1).required(),
      });

      const { error } = createOrderSchema.validate(input);
      if (error) {
        logger.error('Validation error during order creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);

      const { storeId: inputStoreId, addressId, items } = input;

      const parsedStoreId = parseInt(inputStoreId, 10);

      const t = await sequelize.transaction(); // Iniciar transacción

      try {
        const store = await Store.findByPk(parsedStoreId, { include: ['owner'], transaction: t });
        if (!store) {
          throw new ApolloError('Store not found', 'STORE_NOT_FOUND');
        }

        const deliveryAddress = await Address.findByPk(addressId, { transaction: t });
        if (!deliveryAddress || deliveryAddress.userId !== context.user.id) {
          throw new ApolloError(
            'Delivery address not found or not authorized',
            'ADDRESS_NOT_FOUND'
          );
        }

        let totalAmount = 0;
        const orderItemsData = [];

        for (const itemInput of items) {
          const product = await Product.findByPk(itemInput.productId, {
            attributes: ['id', 'name', 'description', 'price', 'imageUrl', 'stock', 'storeId'],
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (!product) {
            throw new ApolloError(
              `Product with ID ${itemInput.productId} not found`,
              'PRODUCT_NOT_FOUND'
            );
          }
          console.log(`DEBUG: Product ID: ${product.id}, Product Name: ${product.name}`);
          console.log(`DEBUG: Product Store ID (from DB): ${product.storeId}`);
          console.log(`DEBUG: Order Input Store ID: ${parsedStoreId}`);
          if (product.storeId !== parsedStoreId) {
            throw new ApolloError(
              `Product ${product.name} does not belong to store ${store.name}`,
              'PRODUCT_STORE_MISMATCH'
            );
          }
          if (product.stock < itemInput.quantity) {
            throw new ApolloError(
              `Not enough stock for ${product.name}. Available: ${product.stock}, Requested: ${itemInput.quantity}`,
              'INSUFFICIENT_STOCK'
            );
          }

          const itemPrice = product.price;
          totalAmount += itemPrice * itemInput.quantity;
          orderItemsData.push({
            productId: product.id,
            quantity: itemInput.quantity,
            priceAtOrder: itemPrice,
          });

          // Descontar el stock
          product.stock -= itemInput.quantity;
          await product.save({ transaction: t });
        }

        const order = await Order.create(
          {
            userId: context.user.id,
            storeId: parsedStoreId,
            totalAmount,
            deliveryAddress: `${deliveryAddress.street}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.zipCode}, ${deliveryAddress.country}`,
            status: 'payment_pending',
          },
          { transaction: t }
        );

        for (const itemData of orderItemsData) {
          await OrderItem.create({ ...itemData, orderId: order.id }, { transaction: t });
        }

        await t.commit(); // Confirmar la transacción

        const createdOrder = await Order.findByPk(order.id, {
          include: [
            { model: User, as: 'customer' },
            { model: Store, as: 'store', include: ['owner'] },
            { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
          ],
        });

        // Create notifications
        const seller = createdOrder.store?.owner;
        const customer = createdOrder.customer;

        // Notification for the customer
        await Notification.create({
          userId: customer.id,
          type: 'order_confirmation',
          message: `Your order #${createdOrder.id} for ${createdOrder.totalAmount.toFixed(2)} has been placed successfully!`,
          relatedEntityId: createdOrder.id,
          relatedEntityType: 'Order',
        });

        // Notification for the seller
        if (seller) {
          await Notification.create({
            userId: seller.id,
            type: 'new_order',
            message: `You have a new order #${createdOrder.id} from ${customer.name} for ${createdOrder.totalAmount.toFixed(2)}.`, 
            relatedEntityId: createdOrder.id,
            relatedEntityType: 'Order',
          });
        }

        // Remove console.logs and TODO comments related to old notification simulation
        /*
        console.log('--- NEW ORDER NOTIFICATION ---');
        console.log(`A new order has been placed for the store: ${createdOrder.store?.name || 'N/A'}`);
        console.log(`Order ID: ${createdOrder.id}`);
        console.log(`Customer: ${customer?.name || 'N/A'} (${customer?.email || 'N/A'})`);
        console.log('Items:');
        createdOrder.items?.forEach(item => {
          console.log(`- ${item.quantity} x ${item.product?.name || 'N/A'}`);
        });
        console.log(`Total Amount: ${createdOrder.totalAmount}`);
        console.log(`Delivery Address: ${createdOrder.deliveryAddress}`);
        console.log('--- END NOTIFICATION ---');

        // TODO: Implement actual email notification to seller
        // Example using Nodemailer (requires setup and configuration)
        // const nodemailer = require('nodemailer'); // Uncomment at top of file if not already
        // const transporter = nodemailer.createTransport({
        //   service: 'Gmail', // or your SMTP service
        //   auth: {
        //     user: process.env.EMAIL_USER,
        //     pass: process.env.EMAIL_PASS,
        //   },
        // });

        // const mailOptions = {
        //   from: process.env.EMAIL_USER,
        //   to: seller.email, // Seller's email
        //   subject: `New Order #${createdOrder.id} for your store: ${createdOrder.store?.name}`,
        //   html: `
        //     <p>Dear ${seller.name},</p>
        //     <p>A new order has been placed for your store: <strong>${createdOrder.store?.name}</strong>.</p>
        //     <p><strong>Order ID:</strong> ${createdOrder.id}</p>
        //     <p><strong>Customer:</strong> ${customer?.name} (${customer?.email})</p>
        //     <p><strong>Items:</strong></p>
        //     <ul>
        //       ${createdOrder.items?.map(item => `<li>${item.quantity} x ${item.product?.name} (${item.priceAtOrder.toFixed(2)} each)</li>`).join('')}
        //     </ul>
        //     <p><strong>Total Amount:</strong> ${createdOrder.totalAmount.toFixed(2)}</p>
        //     <p><strong>Delivery Address:</strong> ${createdOrder.deliveryAddress}</p>
        //     <p>Please contact the customer within 24 hours to arrange payment and delivery.</p>
        //     <p>Thank you!</p>
        //   `,
        // };

        // try {
        //   await transporter.sendMail(mailOptions);
        //   logger.info(`Order notification email sent to ${seller.email}`);
        // } catch (emailError) {
        //   logger.error(`Failed to send order notification email to ${seller.email}:`, emailError);
        // }
        */

        return createdOrder;
      } catch (error) {
        await t.rollback(); // Revertir la transacción en caso de error
        throw error; // Relanzar el error para que Apollo lo maneje
      }
    },

    addToCart: async (_, { productId, quantity }, context) => {
      const schema = Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(1).required(),
      });

      const { error } = schema.validate({ productId, quantity });
      if (error) {
        logger.error('Validation error during add to cart:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);

      let cart = await Cart.findOne({ where: { userId: context.user.id } });
      if (!cart) {
        cart = await Cart.create({ userId: context.user.id });
      }

      const product = await Product.findByPk(productId);
      if (!product) {
        throw new ApolloError('Product not found', 'PRODUCT_NOT_FOUND');
      }

      let cartItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });

      if (cartItem) {
        cartItem.quantity += quantity;
        await cartItem.save();
      } else {
        cartItem = await CartItem.create({ cartId: cart.id, productId, quantity });
      }

      // Recargar el carrito con sus ítems y productos asociados
      return await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [{ model: Product, as: 'product', include: [{ model: Store, as: 'store' }] }],
          },
        ],
      });
    },

    removeFromCart: async (_, { productId }, context) => {
      const schema = Joi.object({
        productId: Joi.string().required(),
      });

      const { error } = schema.validate({ productId });
      if (error) {
        logger.error('Validation error during remove from cart:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);

      const cart = await Cart.findOne({ where: { userId: context.user.id } });
      if (!cart) {
        throw new ApolloError('Cart not found', 'CART_NOT_FOUND');
      }

      const cartItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });
      if (!cartItem) {
        throw new ApolloError('Product not in cart', 'PRODUCT_NOT_IN_CART');
      }

      await cartItem.destroy();

      return await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [{ model: Product, as: 'product', include: [{ model: Store, as: 'store' }] }],
          },
        ],
      });
    },

    updateCartItemQuantity: async (_, { productId, quantity }, context) => {
      const schema = Joi.object({
        productId: Joi.string().required(),
        quantity: Joi.number().integer().min(0).required(), // Quantity can be 0 to remove item
      });

      const { error } = schema.validate({ productId, quantity });
      if (error) {
        logger.error(
          'Validation error during cart item quantity update:',
          error.details[0].message
        );
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);

      const cart = await Cart.findOne({ where: { userId: context.user.id } });
      if (!cart) {
        throw new ApolloError('Cart not found', 'CART_NOT_FOUND');
      }

      const cartItem = await CartItem.findOne({ where: { cartId: cart.id, productId } });
      if (!cartItem) {
        throw new ApolloError('Product not in cart', 'PRODUCT_NOT_IN_CART');
      }

      if (quantity <= 0) {
        await cartItem.destroy();
      } else {
        cartItem.quantity = quantity;
        await cartItem.save();
      }

      return await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [{ model: Product, as: 'product', include: [{ model: Store, as: 'store' }] }],
          },
        ],
      });
    },

    clearCart: async (_, __, context) => {
      isAuth(context);

      const cart = await Cart.findOne({ where: { userId: context.user.id } });
      if (!cart) {
        // If cart not found, it's not an error, just nothing to clear
        return null; // Or throw ApolloError('Cart not found', 'CART_NOT_FOUND'); depending on desired behavior
      }

      await CartItem.destroy({ where: { cartId: cart.id } });

      return await Cart.findByPk(cart.id, {
        include: [
          {
            model: CartItem,
            as: 'items',
            include: [{ model: Product, as: 'product', include: [{ model: Store, as: 'store' }] }],
          },
        ],
      });
    },

    createAddress: async (_, { input }, context) => {
      const schema = Joi.object({
        street: Joi.string().min(3).max(100).required(),
        city: Joi.string().min(3).max(50).required(),
        state: Joi.string().min(2).max(50).required(),
        zipCode: Joi.string().min(3).max(10).required(),
        country: Joi.string().min(2).max(50).required(),
        isDefault: Joi.boolean().optional(),
      });

      const { error } = schema.validate(input);
      if (error) {
        logger.error('Validation error during address creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);
      const { street, city, state, zipCode, country, isDefault } = input;
      if (isDefault) {
        await Address.update(
          { isDefault: false },
          { where: { userId: context.user.id, isDefault: true } }
        );
      }
      const address = await Address.create({
        userId: context.user.id,
        street,
        city,
        state,
        zipCode,
        country,
        isDefault,
      });
      return address;
    },

    updateAddress: async (_, { input }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
        street: Joi.string().min(3).max(100).optional(),
        city: Joi.string().min(3).max(50).optional(),
        state: Joi.string().min(2).max(50).optional(),
        zipCode: Joi.string().min(3).max(10).optional(),
        country: Joi.string().min(2).max(50).optional(),
        isDefault: Joi.boolean().optional(),
      }).min(2); // At least 'id' and one other field must be present for update

      const { error } = schema.validate(input);
      if (error) {
        logger.error('Validation error during address update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);
      const { id, street, city, state, zipCode, country, isDefault } = input;
      const address = await Address.findByPk(id);
      if (!address || address.userId !== context.user.id) {
        throw new AuthenticationError('Not authorized to update this address');
      }
      if (isDefault) {
        await Address.update(
          { isDefault: false },
          { where: { userId: context.user.id, isDefault: true } }
        );
      }
      await address.update({ street, city, state, zipCode, country, isDefault });
      return address;
    },

    deleteAddress: async (_, { id }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        logger.error('Validation error during address deletion:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      isAuth(context);
      const address = await Address.findByPk(id);
      if (!address || address.userId !== context.user.id) {
        throw new AuthenticationError('Not authorized to delete this address');
      }
      await address.destroy();
      return true;
    },

    createPaymentMethod: async (_, { input }, context) => {
      const schema = Joi.object({
        cardType: Joi.string().required(),
        lastFour: Joi.string()
          .length(4)
          .pattern(/^[0-9]+$/)
          .required(),
        expirationMonth: Joi.number().integer().min(1).max(12).required(),
        expirationYear: Joi.number().integer().min(new Date().getFullYear()).required(),
        isDefault: Joi.boolean().optional(),
      });

      const { error } = schema.validate(input);
      if (error) {
        logger.error('Validation error during payment method creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      if (!context.user)
        throw new AuthenticationError('You must be logged in to add a payment method');
      const { cardType, lastFour, expirationMonth, expirationYear, isDefault } = input;

      if (isDefault) {
        await PaymentMethod.update(
          { isDefault: false },
          { where: { userId: context.user.id, isDefault: true } }
        );
      }

      const paymentMethod = await PaymentMethod.create({
        userId: context.user.id,
        cardType,
        lastFour,
        expirationMonth,
        expirationYear,
        isDefault,
        // El paymentMethodId se puede generar aleatoriamente o basarse en los datos de la tarjeta
        paymentMethodId: `pm_${Date.now()}`,
      });

      return paymentMethod;
    },

    updatePaymentMethod: async (_, { input }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
        isDefault: Joi.boolean().optional(),
      }).min(2); // At least 'id' and one other field must be present for update

      const { error } = schema.validate(input);
      if (error) {
        logger.error('Validation error during payment method update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      if (!context.user)
        throw new AuthenticationError('You must be logged in to update a payment method');
      const { id, isDefault } = input;

      const paymentMethod = await PaymentMethod.findByPk(id);
      if (!paymentMethod || paymentMethod.userId !== context.user.id) {
        throw new AuthenticationError('Not authorized to update this payment method');
      }

      if (isDefault) {
        await PaymentMethod.update(
          { isDefault: false },
          { where: { userId: context.user.id, isDefault: true } }
        );
      }

      await paymentMethod.update({ isDefault });
      return paymentMethod;
    },

    deletePaymentMethod: async (_, { id }, context) => {
      const schema = Joi.object({
        id: Joi.string().required(),
      });

      const { error } = schema.validate({ id });
      if (error) {
        logger.error('Validation error during payment method deletion:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      if (!context.user)
        throw new AuthenticationError('You must be logged in to delete a payment method');
      const paymentMethod = await PaymentMethod.findByPk(id);
      if (!paymentMethod || paymentMethod.userId !== context.user.id) {
        throw new AuthenticationError('Not authorized to delete this payment method');
      }
      await paymentMethod.destroy();
      return true;
    },

    createProductReview: async (_, { input }, context) => {
      const schema = Joi.object({
        productId: Joi.string().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        comment: Joi.string().max(500).allow('', null).optional(),
      });

      const { error } = schema.validate(input);
      if (error) {
        logger.error('Validation error during product review creation:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      if (!context.user)
        throw new AuthenticationError('You must be logged in to review a product.');

      const { productId, rating, comment } = input;
      const userId = context.user.id;

      // 1. Verificar que el usuario ha comprado este producto
      const purchasedItem = await OrderItem.findOne({
        where: { productId },
        include: [{
          model: Order,
          as: 'order', // Use the alias defined in OrderItem.belongsTo(Order)
          where: { userId },
          required: true,
        }],
      });

      if (!purchasedItem) {
        throw new ApolloError('You can only review products you have purchased.', 'NOT_PURCHASED');
      }

      // 2. Verificar que el usuario no haya reseñado ya este producto
      const existingReview = await ProductReview.findOne({ where: { userId, productId } });
      if (existingReview) {
        throw new ApolloError('You have already reviewed this product.', 'ALREADY_REVIEWED');
      }

      // 3. Crear la reseña
      const review = await ProductReview.create({
        userId,
        productId,
        rating,
        comment,
      });

      console.log('DEBUG: Created review object:', review.toJSON()); // Debug log

      // Fetch the created review with its associated user data
      const createdReviewWithUser = await ProductReview.findByPk(review.id, {
        include: [{ model: User, as: 'user' }],
      });

      console.log('DEBUG: Created review with user object:', createdReviewWithUser ? createdReviewWithUser.toJSON() : 'null'); // Debug log

      return createdReviewWithUser;
    },

    updateOrderStatus: async (_, { orderId, status }, context) => {
      const schema = Joi.object({
        orderId: Joi.string().required(),
        status: Joi.string()
          .valid(
            'payment_pending',
            'payment_confirmed',
            'delivery_agreed',
            'delivered_payment_received',
            'cancelled'
          )
          .required(),
      });

      const { error } = schema.validate({ orderId, status });
      if (error) {
        logger.error('Validation error during order status update:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      if (!context.user || context.user.role !== 'seller') {
        throw new AuthenticationError('You must be a logged-in seller to update order status.');
      }

      const order = await Order.findByPk(orderId, { include: 'store' });
      if (!order) {
        throw new ApolloError('Order not found.', 'ORDER_NOT_FOUND');
      }

      // Verificar que el vendedor que hace la petición es el dueño de la tienda del pedido
      if (order.store.ownerId !== context.user.id) {
        throw new AuthenticationError('You are not authorized to update this order.');
      }

      order.status = status;
      await order.save();

      // Fetch customer and store owner for notifications
      const customer = await User.findByPk(order.userId);
      const storeOwner = await User.findByPk(order.store.ownerId);

      // Notification for the customer
      let customerMessage = '';
      switch (status) {
        case 'payment_confirmed':
          customerMessage = `Your order #${order.id} payment has been confirmed!`;
          break;
        case 'delivery_agreed':
          customerMessage = `Delivery for your order #${order.id} has been agreed upon.`;
          break;
        case 'delivered_payment_received':
          customerMessage = `Your order #${order.id} has been delivered and payment received.`;
          break;
        case 'cancelled':
          customerMessage = `Your order #${order.id} has been cancelled.`;
          break;
        default:
          customerMessage = `Your order #${order.id} status has been updated to ${status.replace('_', ' ')}.`;
      }
      await Notification.create({
        userId: customer.id,
        type: 'order_status_update',
        message: customerMessage,
        relatedEntityId: order.id,
        relatedEntityType: 'Order',
      });

      // Notification for the store owner (if status is cancelled by admin/customer)
      if (status === 'cancelled' && storeOwner) {
        await Notification.create({
          userId: storeOwner.id,
          type: 'order_cancelled',
          message: `Order #${order.id} for your store has been cancelled.`,
          relatedEntityId: order.id,
          relatedEntityType: 'Order',
        });
      }

      // Notification for admin (if status is cancelled)
      if (status === 'cancelled') {
        const admins = await User.findAll({ where: { role: 'admin' } });
        for (const admin of admins) {
          await Notification.create({
            userId: admin.id,
            type: 'admin_alert',
            message: `Order #${order.id} has been cancelled.`,
            relatedEntityId: order.id,
            relatedEntityType: 'Order',
          });
        }
      }

      return order;
    },
    becomeSeller: async (_, __, context) => {
      if (!context.user) {
        throw new AuthenticationError('You must be logged in to become a seller.');
      }
      const user = await User.findByPk(context.user.id);
      if (!user) {
        throw new ApolloError('User not found.', 'USER_NOT_FOUND');
      }
      if (user.role === 'seller') {
        throw new ApolloError('User is already a seller.', 'ALREADY_SELLER');
      }
      user.role = 'seller';
      await user.save();

      const payload = {
        user: {
          id: user.id,
          role: user.role,
          isVerified: user.isVerified,
        },
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
      return token;
    },
    requestPasswordReset: async (_, { email }) => {
      const schema = Joi.object({
        email: Joi.string().email().required(),
      });

      const { error } = schema.validate({ email });
      if (error) {
        logger.error('Validation error during password reset request:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      const user = await User.findOne({ where: { email } });
      if (!user) {
        // Return success message even if user not found to prevent email enumeration
        return 'If a user with that email exists, a password reset link has been sent.';
      }

      const resetToken = crypto.randomBytes(20).toString('hex');
      const resetPasswordExpires = Date.now() + 3600000; // 1 hour from now

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = resetPasswordExpires;
      await user.save();

      // TODO: Implement actual email sending for password reset
      /*
      // Example using Nodemailer (requires setup and configuration)
      // const nodemailer = require('nodemailer'); // Uncomment at top of file if not already
      // const transporter = nodemailer.createTransport({
      //   service: 'Gmail', // e.g., 'Gmail', 'Outlook365', or custom SMTP
      //   auth: {
      //     user: process.env.EMAIL_USER, // Your email address
      //     pass: process.env.EMAIL_PASS, // Your email password or app-specific password
      //   },
      // });

      // const resetLink = `http://localhost:3000/reset-password/${resetToken}`; // Adjust frontend URL as needed

      // const mailOptions = {
      //   from: process.env.EMAIL_USER,
      //   to: user.email,
      //   subject: 'Password Reset Request',
      //   html: `
      //     <p>Dear ${user.name},</p>
      //     <p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
      //     <p>Please click on the following link to complete the process:</p>
      //     <p><a href="${resetLink}">${resetLink}</a></p>
      //     <p>This link will expire in 1 hour.</p>
      //     <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      //     <p>Thank you!</p>
      //   `,
      // };

      // try {
      //   await transporter.sendMail(mailOptions);
      //   logger.info(`Password reset email sent to ${user.email}`);
      // } catch (emailError) {
      //   logger.error(`Failed to send password reset email to ${user.email}:`, emailError);
      // }
      */

      logger.info(`Password reset token for ${user.email}: ${resetToken}`); // For development/debugging

      return 'If a user with that email exists, a password reset link has been sent.';
    },
    resetPassword: async (_, { token, newPassword }) => {
      const schema = Joi.object({
        token: Joi.string().required(),
        newPassword: Joi.string().min(6).required(),
      });

      const { error } = schema.validate({ token, newPassword });
      if (error) {
        logger.error('Validation error during password reset:', error.details[0].message);
        throw new ApolloError(error.details[0].message, 'BAD_USER_INPUT');
      }

      const user = await User.findOne({
        where: {
          resetPasswordToken: token,
          resetPasswordExpires: { [Op.gt]: Date.now() },
        },
      });

      if (!user) {
        throw new ApolloError(
          'Password reset token is invalid or has expired.',
          'INVALID_OR_EXPIRED_TOKEN'
        );
      }
