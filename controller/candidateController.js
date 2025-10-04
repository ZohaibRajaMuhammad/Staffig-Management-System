const { pool } = require('../config/db');

const candidateController = {
  // Get all candidates with filtering, search, and pagination
  getAllCandidates: async (req, res, next) => {
    try {
      const { 
        skills, 
        status, 
        experience_min, 
        experience_max,
        search,
        page = 1, 
        limit = 10 
      } = req.query;
      
      let query = `
        SELECT id, first_name, last_name, email, phone, skills, 
               experience_years, status, created_at, updated_at
        FROM candidates 
        WHERE 1=1
      `;
      const params = [];
      const countParams = [];

      // Search across multiple fields
      if (search) {
        query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR skills LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Filter by skills (keyword search)
      if (skills) {
        query += ' AND skills LIKE ?';
        params.push(`%${skills}%`);
        countParams.push(`%${skills}%`);
      }

      // Filter by status
      if (status) {
        query += ' AND status = ?';
        params.push(status);
        countParams.push(status);
      }

      // Filter by experience range
      if (experience_min) {
        query += ' AND experience_years >= ?';
        params.push(parseFloat(experience_min));
        countParams.push(parseFloat(experience_min));
      }

      if (experience_max) {
        query += ' AND experience_years <= ?';
        params.push(parseFloat(experience_max));
        countParams.push(parseFloat(experience_max));
      }

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM candidates WHERE 1=1';
      if (search) {
        countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR skills LIKE ?)';
      }
      if (skills) {
        countQuery += ' AND skills LIKE ?';
      }
      if (status) {
        countQuery += ' AND status = ?';
      }
      if (experience_min) {
        countQuery += ' AND experience_years >= ?';
      }
      if (experience_max) {
        countQuery += ' AND experience_years <= ?';
      }

      const [countResult] = await pool.execute(countQuery, countParams);
      const total = countResult[0].total;

      // Add pagination and ordering
      const offset = (page - 1) * limit;
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));

      const [candidates] = await pool.execute(query, params);

      res.json({
        success: true,
        data: candidates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get candidate by ID
  getCandidateById: async (req, res, next) => {
    try {
      const { id } = req.params;

      const [candidates] = await pool.execute(
        `SELECT c.*, 
                COUNT(a.id) as assignment_count,
                GROUP_CONCAT(DISTINCT p.name) as project_names
         FROM candidates c
         LEFT JOIN assignments a ON c.id = a.candidate_id
         LEFT JOIN projects p ON a.project_id = p.id
         WHERE c.id = ?
         GROUP BY c.id`,
        [id]
      );

      if (candidates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }

      const candidate = candidates[0];
      
      // Format the response
      const candidateData = {
        ...candidate,
        project_names: candidate.project_names ? candidate.project_names.split(',') : [],
        assignment_count: parseInt(candidate.assignment_count)
      };

      res.json({
        success: true,
        data: candidateData
      });
    } catch (error) {
      next(error);
    }
  },

  // Create new candidate
  createCandidate: async (req, res, next) => {
    try {
      const { 
        first_name, 
        last_name, 
        email, 
        phone, 
        skills, 
        experience_years, 
        resume_url,
        status = 'active'
      } = req.body;

      // Check if email already exists
      const [existingCandidates] = await pool.execute(
        'SELECT id FROM candidates WHERE email = ?',
        [email]
      );

      if (existingCandidates.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'A candidate with this email already exists'
        });
      }

      const [result] = await pool.execute(
        `INSERT INTO candidates 
         (first_name, last_name, email, phone, skills, experience_years, resume_url, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          first_name, 
          last_name, 
          email.toLowerCase(), 
          phone || null, 
          skills || null, 
          experience_years || null, 
          resume_url || null, 
          status
        ]
      );

      // Fetch the created candidate
      const [newCandidate] = await pool.execute(
        'SELECT * FROM candidates WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Candidate created successfully',
        data: newCandidate[0]
      });
    } catch (error) {
      if (error.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
          success: false,
          error: 'One or more fields exceed maximum length'
        });
      }
      next(error);
    }
  },

  // Update candidate
  updateCandidate: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { 
        first_name, 
        last_name, 
        email, 
        phone, 
        skills, 
        experience_years, 
        status, 
        resume_url 
      } = req.body;

      // Check if candidate exists
      const [existingCandidates] = await pool.execute(
        'SELECT id FROM candidates WHERE id = ?',
        [id]
      );

      if (existingCandidates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }

      // Email validation if provided
      if (email) {
        // Check if email is being changed and if it already exists
        const [emailCheck] = await pool.execute(
          'SELECT id FROM candidates WHERE email = ? AND id != ?',
          [email.toLowerCase(), id]
        );

        if (emailCheck.length > 0) {
          return res.status(409).json({
            success: false,
            error: 'A candidate with this email already exists'
          });
        }
      }

      // Build dynamic update query
      const updateFields = [];
      const updateParams = [];

      if (first_name !== undefined) {
        updateFields.push('first_name = ?');
        updateParams.push(first_name);
      }
      if (last_name !== undefined) {
        updateFields.push('last_name = ?');
        updateParams.push(last_name);
      }
      if (email !== undefined) {
        updateFields.push('email = ?');
        updateParams.push(email.toLowerCase());
      }
      if (phone !== undefined) {
        updateFields.push('phone = ?');
        updateParams.push(phone || null);
      }
      if (skills !== undefined) {
        updateFields.push('skills = ?');
        updateParams.push(skills || null);
      }
      if (experience_years !== undefined) {
        updateFields.push('experience_years = ?');
        updateParams.push(experience_years || null);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateParams.push(status);
      }
      if (resume_url !== undefined) {
        updateFields.push('resume_url = ?');
        updateParams.push(resume_url || null);
      }

      // If no fields to update
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields provided for update'
        });
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = CURRENT_TIMESTAMP');
      
      updateParams.push(id);

      const [result] = await pool.execute(
        `UPDATE candidates 
         SET ${updateFields.join(', ')}
         WHERE id = ?`,
        updateParams
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found or no changes made'
        });
      }

      // Fetch updated candidate
      const [updatedCandidate] = await pool.execute(
        'SELECT * FROM candidates WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Candidate updated successfully',
        data: updatedCandidate[0]
      });
    } catch (error) {
      if (error.code === 'ER_DATA_TOO_LONG') {
        return res.status(400).json({
          success: false,
          error: 'One or more fields exceed maximum length'
        });
      }
      next(error);
    }
  },

  // Delete candidate
  deleteCandidate: async (req, res, next) => {
    try {
      const { id } = req.params;

      // Check if candidate exists
      const [existingCandidates] = await pool.execute(
        'SELECT id FROM candidates WHERE id = ?',
        [id]
      );

      if (existingCandidates.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }

      // Check if candidate has assignments
      const [assignments] = await pool.execute(
        'SELECT id FROM assignments WHERE candidate_id = ?',
        [id]
      );

      if (assignments.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete candidate with existing assignments. Remove assignments first.'
        });
      }

      const [result] = await pool.execute('DELETE FROM candidates WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'Candidate not found'
        });
      }

      res.json({
        success: true,
        message: 'Candidate deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  },

  // Search candidates by skills
  searchCandidatesBySkills: async (req, res, next) => {
    try {
      const { skills, min_experience = 0, max_experience = 50 } = req.query;
      
      if (!skills) {
        return res.status(400).json({
          success: false,
          error: 'Skills parameter is required for search'
        });
      }

      const skillLength = skills.length;
      const [candidates] = await pool.execute(
        `SELECT id, first_name, last_name, email, skills, experience_years, status,
                (LENGTH(skills) - LENGTH(REPLACE(LOWER(skills), LOWER(?), ''))) / ? as skill_match_score
         FROM candidates 
         WHERE LOWER(skills) LIKE ? 
           AND experience_years BETWEEN ? AND ?
           AND status = 'active'
         ORDER BY skill_match_score DESC, experience_years DESC
         LIMIT 50`,
        [skills, skillLength, `%${skills.toLowerCase()}%`, parseFloat(min_experience), parseFloat(max_experience)]
      );

      res.json({
        success: true,
        data: candidates,
        count: candidates.length
      });
    } catch (error) {
      next(error);
    }
  },

  // Get candidate statistics
  getCandidateStatistics: async (req, res, next) => {
    try {
      const [stats] = await pool.execute(`
        SELECT 
          status,
          COUNT(*) as count,
          ROUND(AVG(experience_years), 1) as avg_experience
        FROM candidates 
        GROUP BY status
        ORDER BY count DESC
      `);

      const [skillStats] = await pool.execute(`
        SELECT 
          skills,
          COUNT(*) as count
        FROM candidates 
        WHERE status = 'active'
        GROUP BY skills
        ORDER BY count DESC
        LIMIT 10
      `);

      const [experienceStats] = await pool.execute(`
        SELECT 
          CASE 
            WHEN experience_years < 2 THEN '0-2 years'
            WHEN experience_years < 5 THEN '2-5 years'
            WHEN experience_years < 10 THEN '5-10 years'
            ELSE '10+ years'
          END as experience_range,
          COUNT(*) as count
        FROM candidates 
        WHERE status = 'active'
        GROUP BY experience_range
        ORDER BY experience_range
      `);

      const totalCandidates = stats.reduce((sum, stat) => sum + stat.count, 0);
      const activeCandidates = stats.find(stat => stat.status === 'active')?.count || 0;

      res.json({
        success: true,
        data: {
          status_distribution: stats,
          popular_skills: skillStats,
          experience_distribution: experienceStats,
          total_candidates: totalCandidates,
          active_candidates: activeCandidates
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Bulk update candidate status
  bulkUpdateStatus: async (req, res, next) => {
    try {
      const { candidate_ids, status } = req.body;

      // Convert array to comma-separated placeholders for SQL IN clause
      const placeholders = candidate_ids.map(() => '?').join(',');
      
      const [result] = await pool.execute(
        `UPDATE candidates 
         SET status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id IN (${placeholders})`,
        [status, ...candidate_ids]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: 'No candidates found with the provided IDs'
        });
      }

      res.json({
        success: true,
        message: `Status updated for ${result.affectedRows} candidates`,
        affected_rows: result.affectedRows,
        updated_ids: candidate_ids
      });
    } catch (error) {
      next(error);
    }
  },

  // Get candidate count by status
  getCandidateCountByStatus: async (req, res, next) => {
    try {
      const [results] = await pool.execute(`
        SELECT status, COUNT(*) as count
        FROM candidates 
        GROUP BY status
        ORDER BY count DESC
      `);

      const total = results.reduce((sum, row) => sum + row.count, 0);

      res.json({
        success: true,
        data: {
          counts: results,
          total
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = candidateController;