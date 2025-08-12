const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    price: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true, // Permitimos que sea nulo por ahora
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deleted'),
      defaultValue: 'active',
      allowNull: false,
    },
  });

  Product.associate = (models) => {
    Product.belongsTo(models.Store, { as: 'store', foreignKey: 'storeId' });
    Product.belongsTo(models.Category, { as: 'category', foreignKey: 'categoryId' });
    Product.hasMany(models.OrderItem, { foreignKey: 'productId', as: 'orderItems' });
    Product.hasMany(models.CartItem, { foreignKey: 'productId', as: 'cartItems' });
    Product.hasMany(models.ProductReview, { foreignKey: 'productId', as: 'reviews' });
  };

  return Product;
};
