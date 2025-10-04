const { pool } = require('../config/database');

const clientController = {
  // Get all clients
  getAllClients: async (req, res, next) => {
    try {
      const [clients] = await pool.execute(`
        SELECT c.*, COUNT(jo.id) as open_jobs
        FROM clients c
        LEFT JOIN job_orders jo ON c.id = jo.client_id AND jo.status = 'open'
        WHERE c.status = 'active'
        GROUP BY c.id
        ORDER BY c.company_name
      `);
      
      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      next(error);
    }
  },

  // Get client by ID with job orders
  getClientById: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const [clients] = await pool.execute(
        'SELECT * FROM clients WHERE id = ?',
        [id]
      );

      if (clients.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      // Get job orders for this client
      const [jobOrders] = await pool.execute(
        `SELECT id, title, status, experience_required, required_skills, 
                salary_range, location, created_at
         FROM job_orders 
         WHERE client_id = ? 
         ORDER BY created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...clients[0],
          job_orders: jobOrders
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new client
  createClient: async (req, res, next) => {
    try {
      const { company_name, contact_person, email, phone, address } = req.body;

      // Check if company already exists
      const [existingClients] = await pool.execute(
        'SELECT id FROM clients WHERE company_name = ?',
        [company_name]
      );

      if (existingClients.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'A client with this company name already exists'
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO clients (company_name, contact_person, email, phone, address) 
         VALUES (?, ?, ?, ?, ?)`,
        [company_name, contact_person, email, phone, address]
      );

      // Fetch the created client
      const [newClient] = await pool.execute(
        'SELECT * FROM clients WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: newClient[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Update client
  updateClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { company_name, contact_person, email, phone, address, status } = req.body;

      // Check if client exists
      const [existingClients] = await pool.execute(
        'SELECT id FROM clients WHERE id = ?',
        [id]
      );

      if (existingClients.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found'
        });
      }

      // Check if company name is being changed and if it already exists
      if (company_name) {
        const [companyCheck] = await pool.execute(
          'SELECT id FROM clients WHERE company_name = ? AND id != ?',
          [company_name, id]
        );

        if (companyCheck.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'A client with this company name already exists'
          });
        }
      }

      const [result] = await pool.execute(
        `UPDATE clients 
         SET company_name = ?, contact_person = ?, email = ?, phone = ?, address = ?, status = ?
         WHERE id = ?`,
        [company_name, contact_person, email, phone, address, status, id]
      );

      // Fetch updated client
      const [updatedClient] = await pool.execute(
        'SELECT * FROM clients WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Client updated successfully',
        data: updatedClient[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get clients with statistics
  getClientsWithStats: async (req, res, next) => {
    try {
      const [clients] = await pool.execute(`
        SELECT 
          c.*,
          COUNT(jo.id) as total_jobs,
          SUM(CASE WHEN jo.status = 'open' THEN 1 ELSE 0 END) as open_jobs,
          SUM(CASE WHEN jo.status = 'filled' THEN 1 ELSE 0 END) as filled_jobs
        FROM clients c
        LEFT JOIN job_orders jo ON c.id = jo.client_id
        WHERE c.status = 'active'
        GROUP BY c.id
        ORDER BY c.company_name
      `);

      res.json({
        success: true,
        data: clients
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = clientController;