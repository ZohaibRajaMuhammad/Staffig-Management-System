const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { clientValidation, validate } = require('../middleware/validation');

// GET /api/clients - Get all clients
router.get('/', clientController.getAllClients);

// GET /api/clients/stats - Get clients with statistics
router.get('/stats', clientController.getClientsWithStats);

// GET /api/clients/:id - Get client by ID
router.get('/:id', clientController.getClientById);

// POST /api/clients - Create new client
router.post('/',
  validate(clientValidation.createClient),
  clientController.createClient
);

// PUT /api/clients/:id - Update client
router.put('/:id',
  validate(clientValidation.updateClient),
  clientController.updateClient
);

module.exports = router;