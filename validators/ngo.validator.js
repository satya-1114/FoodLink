/**
 * Validation rules for NGO actions: browse query params.
 */
const { query } = require('express-validator');
const { FOOD_CATEGORIES, VEG_TYPES, STATUS } = require('../models/donation.model');

const browseRules = [
  query('q').optional().isString().trim().isLength({ max: 100 }),
  query('foodCategory').optional().isIn(['', ...FOOD_CATEGORIES]),
  query('vegType').optional().isIn(['', ...Object.values(VEG_TYPES)]),
  query('city').optional().isString().trim().isLength({ max: 80 }),
  query('status').optional().isIn(['', ...Object.values(STATUS)]),
  query('page').optional().isInt({ min: 1, max: 10000 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
];

const profileRules = [
  require('express-validator')
    .body('name')
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage('Name must be 2-80 characters.'),
  require('express-validator')
    .body('organizationName')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Organization name is required.'),
  require('express-validator')
    .body('registrationNumber')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Registration number is required.'),
  require('express-validator')
    .body('phone')
    .trim()
    .matches(/^[0-9+\-\s()]{7,20}$/)
    .withMessage('Provide a valid phone number.'),
  require('express-validator')
    .body('address')
    .trim()
    .isLength({ min: 5, max: 250 })
    .withMessage('Address must be 5-250 characters.'),
];

module.exports = { browseRules, profileRules };
