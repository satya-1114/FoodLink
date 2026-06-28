/**
 * Validation rules for donor profile and donation forms.
 */
const { body } = require('express-validator');
const { FOOD_CATEGORIES, VEG_TYPES } = require('../models/donation.model');

const profileRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Name must be 2-80 characters.'),
  body('phone').trim().matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Provide a valid phone number.'),
  body('address').trim().isLength({ min: 5, max: 250 }).withMessage('Address must be 5-250 characters.'),
];

const donationRules = [
  body('foodName').trim().isLength({ min: 2, max: 100 }).withMessage('Food name is required.'),
  body('foodCategory')
    .trim()
    .isIn(FOOD_CATEGORIES)
    .withMessage('Select a valid food category.'),
  body('vegType')
    .trim()
    .isIn(Object.values(VEG_TYPES))
    .withMessage('Select Veg or Non-Veg.'),
  body('quantity').trim().isLength({ min: 1, max: 60 }).withMessage('Quantity is required.'),
  body('description').trim().isLength({ max: 1000 }).withMessage('Description too long (max 1000).'),
  body('pickupAddress').trim().isLength({ min: 5, max: 250 }).withMessage('Pickup address is required.'),
  body('city').optional({ checkFalsy: true }).trim().isLength({ max: 80 }).withMessage('City too long.'),

  body('pickupTime').isISO8601().withMessage('Pickup time must be a valid date/time.'),
  body('expiryTime')
    .isISO8601()
    .withMessage('Expiry time must be a valid date/time.')
    .bail()
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.pickupTime)) {
        throw new Error('Expiry time must be after pickup time.');
      }
      return true;
    }),
  body('contactNumber')
    .trim()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Provide a valid contact number.'),
];

module.exports = { profileRules, donationRules };
