const { pool } = require('../config/database');

const assignmentController = {
  // Get all assignments
  getAllAssignments: async (req, res, next) => {
    try {
      const { status } = req.query;
      
      let query = `
        SELECT a.*, 
               c.first_name as candidate_first_name, 
               c.last_name as candidate_last_name,
               c.email as candidate_email,
               c.skills as candidate_skills,
               c.experience_years as candidate_experience,
               jo.title as job_title,
               jo.required_skills as job_required_skills,
               cl.company_name as client_company
        FROM assignments a
        JOIN candidates c ON a.candidate_id = c.id
        JOIN job_orders jo ON a.job_order_id = jo.id
        JOIN clients cl ON jo.client_id = cl.id
      `;
      const params = [];

      if (status) {
        query += ' WHERE a.status = ?';
        params.push(status);
      }

      query += ' ORDER BY a.assigned_date DESC';

      const [assignments] = await pool.execute(query, params);
      
      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new assignment
  createAssignment: async (req, res, next) => {
    try {
      const { candidate_id, job_order_id, status, notes } = req.body;

      // Check if candidate exists and is active
      const [candidates] = await pool.execute(
        'SELECT id, status FROM candidates WHERE id = ?',
        [candidate_id]
      );

      if (candidates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }

      if (candidates[0].status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Cannot assign inactive candidate'
        });
      }

      // Check if job order exists and is open
      const [jobOrders] = await pool.execute(
        'SELECT id, status FROM job_orders WHERE id = ?',
        [job_order_id]
      );

      if (jobOrders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Job order not found'
        });
      }

      if (jobOrders[0].status !== 'open') {
        return res.status(400).json({
          success: false,
          error: 'Cannot assign to closed or filled job order'
        });
      }

      // Check if assignment already exists
      const [existingAssignments] = await pool.execute(
        'SELECT id FROM assignments WHERE candidate_id = ? AND job_order_id = ?',
        [candidate_id, job_order_id]
      );

      if (existingAssignments.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'Candidate already assigned to this job order'
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO assignments (candidate_id, job_order_id, status, notes) 
         VALUES (?, ?, ?, ?)`,
        [candidate_id, job_order_id, status || 'applied', notes]
      );

      // Fetch the created assignment with details
      const [newAssignment] = await pool.execute(
        `SELECT a.*, 
                c.first_name, c.last_name, c.email as candidate_email,
                jo.title as job_title,
                cl.company_name as client_company
         FROM assignments a
         JOIN candidates c ON a.candidate_id = c.id
         JOIN job_orders jo ON a.job_order_id = jo.id
         JOIN clients cl ON jo.client_id = cl.id
         WHERE a.id = ?`,
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Assignment created successfully',
        data: newAssignment[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Update assignment status
  updateAssignmentStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      // Check if assignment exists
      const [existingAssignments] = await pool.execute(
        'SELECT id FROM assignments WHERE id = ?',
        [id]
      );

      if (existingAssignments.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Assignment not found'
        });
      }

      const validStatuses = ['applied', 'interviewing', 'offered', 'placed', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const [result] = await pool.execute(
        'UPDATE assignments SET status = ?, notes = ? WHERE id = ?',
        [status, notes, id]
      );

      // If status is 'placed', update the job order status to 'filled'
      if (status === 'placed') {
        const [assignment] = await pool.execute(
          'SELECT job_order_id FROM assignments WHERE id = ?',
          [id]
        );

        if (assignment.length > 0) {
          await pool.execute(
            'UPDATE job_orders SET status = "filled" WHERE id = ?',
            [assignment[0].job_order_id]
          );
        }
      }

      // Fetch updated assignment
      const [updatedAssignment] = await pool.execute(
        `SELECT a.*, 
                c.first_name, c.last_name,
                jo.title as job_title,
                cl.company_name as client_company
         FROM assignments a
         JOIN candidates c ON a.candidate_id = c.id
         JOIN job_orders jo ON a.job_order_id = jo.id
         JOIN clients cl ON jo.client_id = cl.id
         WHERE a.id = ?`,
        [id]
      );

      res.json({
        success: true,
        message: 'Assignment status updated successfully',
        data: updatedAssignment[0]
      });
    } catch (error) {
      next(error);
    }
  },

  // Get assignments by candidate ID
  getAssignmentsByCandidateId: async (req, res, next) => {
    try {
      const { candidateId } = req.params;
      
      const [assignments] = await pool.execute(
        `SELECT a.*, 
                jo.title as job_title,
                jo.required_skills,
                cl.company_name as client_company
         FROM assignments a
         JOIN job_orders jo ON a.job_order_id = jo.id
         JOIN clients cl ON jo.client_id = cl.id
         WHERE a.candidate_id = ?
         ORDER BY a.assigned_date DESC`,
        [candidateId]
      );

      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      next(error);
    }
  },

  // Get assignments by job order ID
  getAssignmentsByJobOrderId: async (req, res, next) => {
    try {
      const { jobOrderId } = req.params;
      
      const [assignments] = await pool.execute(
        `SELECT a.*, 
                c.first_name, c.last_name, c.email, c.skills, c.experience_years
         FROM assignments a
         JOIN candidates c ON a.candidate_id = c.id
         WHERE a.job_order_id = ?
         ORDER BY a.assigned_date DESC`,
        [jobOrderId]
      );

      res.json({
        success: true,
        data: assignments
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = assignmentController;