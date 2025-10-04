const { pool } = require('../config/database');

const dashboardController = {
  // Get dashboard statistics
  getDashboardStats: async (req, res, next) => {
    try {
      // Get active candidates count
      const [activeCandidates] = await pool.execute(
        "SELECT COUNT(*) as count FROM candidates WHERE status = 'active'"
      );

      // Get open jobs count
      const [openJobs] = await pool.execute(
        "SELECT COUNT(*) as count FROM job_orders WHERE status = 'open'"
      );

      // Get active clients count
      const [activeClients] = await pool.execute(
        "SELECT COUNT(*) as count FROM clients WHERE status = 'active'"
      );

      // Get total assignments count
      const [totalAssignments] = await pool.execute(
        "SELECT COUNT(*) as count FROM assignments"
      );

      // Get assignments by status
      const [assignmentsByStatus] = await pool.execute(`
        SELECT status, COUNT(*) as count 
        FROM assignments 
        GROUP BY status
        ORDER BY count DESC
      `);

      // Get recent placements (last 30 days)
      const [recentPlacements] = await pool.execute(`
        SELECT a.*, 
               c.first_name, c.last_name,
               jo.title as job_title,
               cl.company_name as client_company
        FROM assignments a
        JOIN candidates c ON a.candidate_id = c.id
        JOIN job_orders jo ON a.job_order_id = jo.id
        JOIN clients cl ON jo.client_id = cl.id
        WHERE a.status = 'placed' 
        AND a.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        ORDER BY a.updated_at DESC
        LIMIT 5
      `);

      // Get jobs by client
      const [jobsByClient] = await pool.execute(`
        SELECT c.company_name, COUNT(jo.id) as job_count
        FROM clients c
        LEFT JOIN job_orders jo ON c.id = jo.client_id AND jo.status = 'open'
        WHERE c.status = 'active'
        GROUP BY c.id, c.company_name
        ORDER BY job_count DESC
        LIMIT 10
      `);

      // Get skill demand (most required skills in open jobs)
      const [skillDemand] = await pool.execute(`
        SELECT required_skills
        FROM job_orders 
        WHERE status = 'open'
      `);

      // Process skill demand data
      const skillCount = {};
      skillDemand.forEach(job => {
        if (job.required_skills) {
          const skills = job.required_skills.split(',').map(skill => skill.trim());
          skills.forEach(skill => {
            if (skill) {
              skillCount[skill] = (skillCount[skill] || 0) + 1;
            }
          });
        }
      });

      const topSkills = Object.entries(skillCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([skill, count]) => ({ skill, count }));

      res.json({
        success: true,
        data: {
          stats: {
            activeCandidates: activeCandidates[0].count,
            openJobs: openJobs[0].count,
            activeClients: activeClients[0].count,
            totalAssignments: totalAssignments[0].count
          },
          assignmentsByStatus,
          recentPlacements,
          jobsByClient,
          topSkills
        }
      });
    } catch (error) {
      next(error);
    }
  },

  // Get recent activity
  getRecentActivity: async (req, res, next) => {
    try {
      // Get recent candidates
      const [recentCandidates] = await pool.execute(`
        SELECT id, first_name, last_name, email, skills, created_at
        FROM candidates
        ORDER BY created_at DESC
        LIMIT 5
      `);

      // Get recent job orders
      const [recentJobOrders] = await pool.execute(`
        SELECT jo.id, jo.title, c.company_name, jo.created_at
        FROM job_orders jo
        JOIN clients c ON jo.client_id = c.id
        ORDER BY jo.created_at DESC
        LIMIT 5
      `);

      // Get recent assignments
      const [recentAssignments] = await pool.execute(`
        SELECT a.*, 
               c.first_name, c.last_name,
               jo.title as job_title,
               cl.company_name as client_company
        FROM assignments a
        JOIN candidates c ON a.candidate_id = c.id
        JOIN job_orders jo ON a.job_order_id = jo.id
        JOIN clients cl ON jo.client_id = cl.id
        ORDER BY a.assigned_date DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          recentCandidates,
          recentJobOrders,
          recentAssignments
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = dashboardController;