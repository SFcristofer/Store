const { DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Este ID es el que proviene de la pasarela de pago (ej. Stripe) y es seguro de almacenar.
    paymentMethodId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    brand: {
      type: DataTypes.STRING, // Ej: 'visa', 'mastercard'
      allowNull: false,
    },
    last4: {
      type: DataTypes.STRING(4), // Los últimos 4 dígitos de la tarjeta
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    // En un entorno real, aquí se almacenaría un token de pago seguro
    // o una referencia a un token de la pasarela de pago, NUNCA los datos completos de la tarjeta.
    // Para este ejemplo, solo almacenamos los últimos cuatro dígitos.
  });

  PaymentMethod.associate = (models) => {
    PaymentMethod.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  };

  return PaymentMethod;
};
