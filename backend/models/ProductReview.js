const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductReview = sequelize.define('ProductReview', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }, // Calificación de 1 a 5 estrellas
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true, // El comentario puede ser opcional
    },
  });

  ProductReview.associate = (models) => {
    ProductReview.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    ProductReview.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
  };

  return ProductReview;
};
