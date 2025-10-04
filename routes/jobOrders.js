const express = require('express');
const router = express.Router();
const jobOrderController = require('../controllers/jobOrderController');
const { jobOrderValidation, validate } = require('../middleware/validation');

// GET /api/job-orders - Get all job orders
router.get('/', jobOrderController.getAllJobOrders);

// GET /api/job-orders/open - Get open job orders
router.get('/open', jobOrderController.getOpenJobOrders);

// GET /api/job-orders/:id - Get job order by ID
router.get('/:id', jobOrderController.getJobOrderById);

// POST /api/job-orders - Create new job order
router.post('/',
  validate(jobOrderValidation.createJobOrder),
  jobOrderController.createJobOrder
);

// PUT /api/job-orders/:id - Update job order
router.put('/:id',
  validate(jobOrderValidation.updateJobOrder),
  jobOrderController.updateJobOrder
);

module.exports = router;