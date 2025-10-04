const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const { assignmentValidation, validate } = require('../middleware/validation');

// GET /api/assignments - Get all assignments
router.get('/', assignmentController.getAllAssignments);

// GET /api/assignments/candidate/:candidateId - Get assignments by candidate ID
router.get('/candidate/:candidateId', assignmentController.getAssignmentsByCandidateId);

// GET /api/assignments/job-order/:jobOrderId - Get assignments by job order ID
router.get('/job-order/:jobOrderId', assignmentController.getAssignmentsByJobOrderId);

// POST /api/assignments - Create new assignment
router.post('/',
  validate(assignmentValidation.createAssignment),
  assignmentController.createAssignment
);

// PUT /api/assignments/:id/status - Update assignment status
router.put('/:id/status',
  validate(assignmentValidation.updateAssignment),
  assignmentController.updateAssignmentStatus
);

module.exports = router;