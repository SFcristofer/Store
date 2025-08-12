const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    totalAmount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'payment_pending',
        'payment_confirmed',
        'delivery_agreed',
        'delivered_payment_received',
        'cancelled'
      ),
      defaultValue: 'payment_pending',
      allowNull: false,
    },
    deliveryAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Stores',
        key: 'id',
      },
    },
  });

  Order.associate = (models) => {
    Order.belongsTo(models.User, { as: 'customer', foreignKey: 'userId' });
    Order.belongsTo(models.Store, { as: 'store', foreignKey: 'storeId' });
    Order.hasMany(models.OrderItem, { foreignKey: 'orderId', as: 'items' });
  };

  return Order;
};
