const express = require('express');
const router = express.Router();
const { Order, OrderItem, Product, Store, User } = require('../models'); // Asegúrate de que Product esté disponible aquí

// Ruta para obtener los detalles de un pedido por su ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['name', 'price']
            }
          ]
        },
        {
          model: Store,
          as: 'store',
          include: [
            {
              model: User,
              as: 'owner',
              attributes: ['name', 'email']
            }
          ]
        }
      ]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
