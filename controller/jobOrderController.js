const { pool } = require('../config/database');

const jobOrderController = {
  // Get all job orders
  getAllJobOrders: async (req, res, next) => {
    try {
      const { status, client_id } = req.query;
      
      let query = `
        SELECT jo.*, c.company_name, c.contact_person
        FROM job_orders jo
        JOIN clients c ON jo.client_id = c.id
        WHERE 1=1
      `;
      const params = [];

      if (status) {
        query += ' AND jo.status = ?';
        params.push(status);
      }

      if (client_id) {
        query += ' AND jo.client_id = ?';
        params.push(client_id);
      }

      query += ' ORDER BY jo.created_at DESC';

      const [jobOrders] = await pool.execute(query, params);
      
      res.json({
        success: true,
        data: jobOrders
      });
    } catch (error) {
      next(error);
    }
  },

  // Get job order by ID
  getJobOrderById: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const [jobOrders] = await pool.execute(
        `SELECT jo.*, c.company_name, c.contact_person, c.email as client_email, c.phone as client_phone
         FROM job_orders jo
         JOIN clients c ON jo.client_id = c.id
         WHERE jo.id = ?`,
        [id]
      );

      if (jobOrders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job order not found'
        });
      }

      // Get assignments for this job order
      const [assignments] = await pool.execute(
        `SELECT a.*, c.first_name, c.last_name, c.email, c.skills
         FROM assignments a
         JOIN candidates c ON a.candidate_id = c.id
         WHERE a.job_order_id = ?
         ORDER BY a.assigned_date DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          ...jobOrders[0],
          assignments: assignments
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new job order
  createJobOrder: async (req, res, next) => {
    try {
      const { 
        title, 
        description, 
        required_skills, 
        experience_required, 
        client_id, 
        salary_range, 
        location 
      } = req.body;

      // Check if client exists
      const [clients] = await pool.execute(
        'SELECT id FROM clients WHERE id = ? AND status = "active"',
        [client_id]
      );

      if (clients.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Client not found or inactive'
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO job_orders 
         (title, description, required_skills, experience_required, client_id, salary_range, location) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, required_skills, experience_required, client_id, salary_range, location]
      );

      // Fetch the created job order
      const [newJobOrder] = await pool.execute(
        `SELECT jo.*, c.company_name, c.contact_person
         FROM job_orders jo
         JOIN clients c ON jo.client_id = c.id
         WHERE jo.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Job order created successfully',
        data: newJobOrder[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Update job order
  updateJobOrder: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { 
        title, 
        description, 
        required_skills, 
        experience_required, 
        status, 
        salary_range, 
        location 
      } = req.body;

      // Check if job order exists
      const [existingJobOrders] = await pool.execute(
        'SELECT id FROM job_orders WHERE id = ?',
        [id]
      );

      if (existingJobOrders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job order not found'
        });
      }

      const [result] = await pool.execute(
        `UPDATE job_orders 
         SET title = ?, description = ?, required_skills = ?, experience_required = ?, 
             status = ?, salary_range = ?, location = ?
         WHERE id = ?`,
        [title, description, required_skills, experience_required, status, salary_range, location, id]
      );

      // Fetch updated job order
      const [updatedJobOrder] = await pool.execute(
        `SELECT jo.*, c.company_name, c.contact_person
         FROM job_orders jo
         JOIN clients c ON jo.client_id = c.id
         WHERE jo.id = ?`,
        [id]
      );

      res.json({
        success: true,
        message: 'Job order updated successfully',
        data: updatedJobOrder[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get open job orders
  getOpenJobOrders: async (req, res, next) => {
    try {
      const [jobOrders] = await pool.execute(`
        SELECT jo.*, c.company_name, c.contact_person
        FROM job_orders jo
        JOIN clients c ON jo.client_id = c.id
        WHERE jo.status = 'open'
        ORDER BY jo.created_at DESC
      `);

      res.json({
        success: true,
        data: jobOrders
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = jobOrderController;