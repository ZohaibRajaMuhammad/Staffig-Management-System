const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');

// Import validation middleware - handle cases where validation might not be implemented yet
let candidateValidation, validate;
try {
  const validationModule = require('../middleware/validation');
  candidateValidation = validationModule.candidateValidation;
  validate = validationModule.validate;
} catch (error) {
  console.warn('⚠️  Validation middleware not found, proceeding without validation');
  // Create dummy validation functions if validation middleware is not available
  candidateValidation = {
    searchCandidates: {},
    createCandidate: {},
    updateCandidate: {}
  };
  validate = () => (req, res, next) => next(); // Pass-through middleware
}

// GET /api/candidates - Get all candidates with optional filtering
router.get('/', 
  validate(candidateValidation.searchCandidates, 'query'),
  candidateController.getAllCandidates
);

// GET /api/candidates/stats - Get candidate statistics
router.get('/stats', candidateController.getCandidateStatistics);

// GET /api/candidates/search/skills - Search candidates by skills
router.get('/search/skills',
  validate(candidateValidation.searchCandidates, 'query'),
  candidateController.searchCandidatesBySkills
);

// GET /api/candidates/:id - Get candidate by ID
router.get('/:id', 
  (req, res, next) => {
    // Basic ID validation
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid candidate ID is required'
      });
    }
    next();
  },
  candidateController.getCandidateById
);

// POST /api/candidates - Create new candidate
router.post('/',
  validate(candidateValidation.createCandidate),
  candidateController.createCandidate
);

// POST /api/candidates/bulk-status - Bulk update candidate status
router.post('/bulk-status',
  candidateController.bulkUpdateStatus
);

// PUT /api/candidates/:id - Update candidate
router.put('/:id',
  validate(candidateValidation.updateCandidate),
  candidateController.updateCandidate
);

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id',
  (req, res, next) => {
    // Basic ID validation
    const { id } = req.params;
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: 'Valid candidate ID is required'
      });
    }
    next();
  },
  candidateController.deleteCandidate
);

module.exports = router;