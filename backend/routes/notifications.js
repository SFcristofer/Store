const express = require('express');
const router = express.Router();
const expressAuth = require('../middleware/expressAuth'); // New Express auth middleware
const { Notification, User } = require('../models'); // Import models

// @route   GET api/notifications
// @desc    Get all notifications for the authenticated user
// @access  Private
router.get('/', expressAuth, async (req, res) => {
  console.log('Attempting to fetch notifications for user:', req.user ? req.user.id : 'N/A'); // Debug log
  if (!req.user || !req.user.id) {
    console.error('Auth middleware did not provide user ID for notifications route.');
    return res.status(401).json({ msg: 'Authentication required' });
  }
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    console.log('Fetched notifications:', notifications.length); // Debug log
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications in backend:', err.message); // More specific error log
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', expressAuth, async (req, res) => {
  try {
    let notification = await Notification.findByPk(req.params.id);

    if (!notification) {
      return res.status(404).json({ msg: 'Notification not found' });
    }

    // Ensure the notification belongs to the authenticated user
    if (notification.userId !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ msg: 'Notification marked as read' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;