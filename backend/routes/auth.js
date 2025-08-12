const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models'); // Importar User desde models/index.js

// @route   POST api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Usar User.create para crear y guardar el usuario
    // El hook beforeCreate en el modelo se encargará del hashing
    user = await User.create({
      name,
      email,
      password,
      role: 'customer', // Rol por defecto: customer
    });

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    console.log(
      'Value of process.env.JWT_SECRET before signing (auth.js): ',
      process.env.JWT_SECRET
    ); // DEBUG
    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Usar variable de entorno
      { expiresIn: 86400 },
      (err, token) => {
        if (err) {
          console.error('Error signing JWT:', err);
          return res.status(500).json({ msg: 'Token generation error' });
        }
        console.log('Token generated:', token);
        console.log('JWT_SECRET used for signing:', process.env.JWT_SECRET); // DEBUG
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // bcrypt.compare ya está implementado en el modelo, pero lo dejamos aquí por claridad
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    console.log(
      'Value of process.env.JWT_SECRET before signing (auth.js): ',
      process.env.JWT_SECRET
    ); // DEBUG
    jwt.sign(
      payload,
      process.env.JWT_SECRET, // Usar variable de entorno
      { expiresIn: 86400 },
      (err, token) => {
        if (err) {
          console.error('Error signing JWT:', err);
          return res.status(500).json({ msg: 'Token generation error' });
        }
        console.log('Token generated:', token);
        console.log('JWT_SECRET used for signing:', process.env.JWT_SECRET); // DEBUG
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

module.exports = router;
