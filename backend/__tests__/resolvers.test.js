const { resolvers } = require('../graphql/resolvers');
const { User, sequelize } = require('../models');
const { AuthenticationError } = require('apollo-server-express');

// Helper para limpiar la base de datos antes de cada prueba
beforeEach(async () => {
  await sequelize.sync({ force: true });
});

describe('User Authentication Flow', () => {
  it('should allow a user to register and then log in successfully', async () => {
    const userCredentials = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    };

    // 1. Registrar el usuario
    // El token de registro no se usa aquí, pero confirmamos que se devuelve
    const registerToken = await resolvers.Mutation.registerUser(null, userCredentials);
    expect(registerToken).toBeDefined();

    // Verificar que el usuario existe en la base de datos
    const dbUser = await User.findOne({ where: { email: userCredentials.email } });
    expect(dbUser).toBeDefined();
    expect(dbUser.name).toBe(userCredentials.name);

    // 2. Iniciar sesión con las credenciales correctas
    const loginToken = await resolvers.Mutation.loginUser(null, {
      email: userCredentials.email,
      password: userCredentials.password,
    });
    expect(loginToken).toBeDefined();
  });

  it('should throw AuthenticationError for wrong password', async () => {
    const userCredentials = {
      name: 'Test User 2',
      email: 'test2@example.com',
      password: 'password123',
    };

    // 1. Registrar el usuario
    await resolvers.Mutation.registerUser(null, userCredentials);

    // 2. Intentar iniciar sesión con la contraseña incorrecta
    await expect(
      resolvers.Mutation.loginUser(null, {
        email: userCredentials.email,
        password: 'wrongpassword',
      })
    ).rejects.toThrow(AuthenticationError);
  });

  it('should throw AuthenticationError for non-existent user', async () => {
    // Intentar iniciar sesión con un usuario que no existe
    await expect(
      resolvers.Mutation.loginUser(null, {
        email: 'nouser@example.com',
        password: 'password123',
      })
    ).rejects.toThrow(AuthenticationError);
  });
});