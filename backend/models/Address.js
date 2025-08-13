const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Address extends Model {
    static associate(models) {
      Address.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
    }
  }
  Address.init(
    {
      street: DataTypes.STRING,
      city: DataTypes.STRING,
      state: DataTypes.STRING,
      zipCode: DataTypes.STRING,
      country: DataTypes.STRING,
      isDefault: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: 'Address',
    }
  );
  return Address;
};
