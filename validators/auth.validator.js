/**
 * express-validator rule sets for auth flows.
 */
const { body } = require('express-validator');

const emailRule = body('email')
  .trim()
  .toLowerCase()
  .isEmail()
  .withMessage('A valid email is required.')
  .isLength({ max: 254 });

const passwordRule = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be 8-128 characters.');

const nameRule = body('name')
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage('Name must be 2-80 characters.');

const phoneRule = body('phone')
  .trim()
  .matches(/^[0-9+\-\s()]{7,20}$/)
  .withMessage('Provide a valid phone number.');

const addressRule = body('address')
  .trim()
  .isLength({ min: 5, max: 250 })
  .withMessage('Address must be 5-250 characters.');

const confirmPasswordRule = body('confirmPassword').custom((value, { req }) => {
  if (value !== req.body.password) {
    throw new Error('Passwords do not match.');
  }
  return true;
});

const donorRegisterRules = [
  nameRule,
  emailRule,
  phoneRule,
  addressRule,
  passwordRule,
  confirmPasswordRule,
];

const ngoRegisterRules = [
  nameRule,
  body('organizationName')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Organization name is required.'),
  body('registrationNumber')
    .trim()
    .isLength({ min: 2, max: 60 })
    .withMessage('Registration number is required.'),
  emailRule,
  phoneRule,
  addressRule,
  passwordRule,
  confirmPasswordRule,
];

const loginRules = [
  emailRule,
  body('password').notEmpty().withMessage('Password is required.'),
];

module.exports = {
  donorRegisterRules,
  ngoRegisterRules,
  loginRules,
};
