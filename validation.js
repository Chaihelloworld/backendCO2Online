const { check } = require('express-validator');
 
exports.signupValidation = [
    check('name', 'Name is requied').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
]
 
exports.loginValidation = [
     check('email', 'Please include a valid email').isEmail().normalizeEmail({ gmail_remove_dots: true }),
     check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
 
]
exports.createListValid = [
    check('schoolname', 'Please include a valid schoolname').not().isEmpty(),
    check('fullname', 'Please not empty characters').not().isEmpty(),
    check('phone', 'Please not empty characters').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail().normalizeEmail({ gmail_remove_dots: true }),
    check('address', 'Please not empty address').not().isEmpty(),
    check('member', 'Please not empty member').not().isEmpty(),
    check('amount_month', 'Please not empty amount_month').not().isEmpty(),
    check('occupation', 'Please not empty occupation').not().isEmpty(),
    check('billelec', 'Please not empty billelec').not().isEmpty(),
    check('numbillelec', 'Please not empty numbillelec').not().isEmpty(),
    check('name_using_w', 'Please not empty name_using_w').not().isEmpty(),
    check('num_using_w', 'Please not empty num_using_w').not().isEmpty(),
    check('using_pow', 'Please not empty using_pow').not().isEmpty(),
    check('using_pow_amount', 'Please not empty using_pow_amount').not().isEmpty(),
    check('guss_amount', 'Please not empty guss_amount').not().isEmpty(),
    check('guss_size', 'Please not empty guss_size').not().isEmpty(),
    check('guss_using', 'Please not empty guss_using').not().isEmpty(),

]