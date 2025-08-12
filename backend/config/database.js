const { Sequelize } = require('sequelize');

// La base de datos será un archivo llamado 'database.sqlite' en la carpeta del backend.
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
});

module.exports = sequelize;
