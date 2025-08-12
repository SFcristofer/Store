const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const Store = sequelize.define('Store', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'deleted'),
      defaultValue: 'active',
      allowNull: false,
    },
  });

  Store.associate = (models) => {
    Store.belongsTo(models.User, { as: 'owner', foreignKey: 'ownerId' });
    Store.hasMany(models.Product, { foreignKey: 'storeId', as: 'products' });
    Store.hasMany(models.Order, { foreignKey: 'storeId', as: 'orders' });
  };

  return Store;
};
