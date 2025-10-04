const Joi = require('joi');

// Common validation patterns
const commonValidations = {
  id: Joi.number().integer().min(1).required(),
  optionalId: Joi.number().integer().min(1).optional(),
  email: Joi.string().email().max(255).trim(),
  phone: Joi.string().min(10).max(20).pattern(/^[+]?[0-9\s\-()]+$/),
  name: Joi.string().min(2).max(100).trim(),
  text: Joi.string().max(1000),
  longText: Joi.string().max(2000),
  url: Joi.string().uri().max(500),
  status: (validStatuses) => Joi.string().valid(...validStatuses)
};

// Candidate validation schemas
const candidateValidation = {
  createCandidate: Joi.object({
    first_name: commonValidations.name.required(),
    last_name: commonValidations.name.required(),
    email: commonValidations.email.required(),
    phone: commonValidations.phone.optional().allow('', null),
    skills: commonValidations.longText.optional().allow('', null),
    experience_years: Joi.number().precision(1).min(0).max(50).optional(),
    resume_url: commonValidations.url.optional().allow('', null),
    status: commonValidations.status(['active', 'inactive', 'placed']).default('active')
  }),

  updateCandidate: Joi.object({
    first_name: commonValidations.name.optional(),
    last_name: commonValidations.name.optional(),
    email: commonValidations.email.optional(),
    phone: commonValidations.phone.optional().allow('', null),
    skills: commonValidations.longText.optional().allow('', null),
    experience_years: Joi.number().precision(1).min(0).max(50).optional(),
    resume_url: commonValidations.url.optional().allow('', null),
    status: commonValidations.status(['active', 'inactive', 'placed']).optional()
  }).min(1), // At least one field must be provided

  searchCandidates: Joi.object({
    skills: Joi.string().min(1).max(255).optional().trim(),
    status: commonValidations.status(['active', 'inactive', 'placed']).optional(),
    experience_min: Joi.number().min(0).max(50).optional(),
    experience_max: Joi.number().min(0).max(50).optional(),
    search: Joi.string().max(255).optional().trim(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  }),

  candidateId: Joi.object({
    id: commonValidations.id
  }),

  bulkUpdateStatus: Joi.object({
    candidate_ids: Joi.array().items(commonValidations.id).min(1).required(),
    status: commonValidations.status(['active', 'inactive', 'placed']).required()
  })
};

// Client validation schemas
const clientValidation = {
  createClient: Joi.object({
    company_name: Joi.string().min(2).max(255).required().trim(),
    contact_person: commonValidations.name.optional().allow('', null),
    email: commonValidations.email.optional().allow('', null),
    phone: commonValidations.phone.optional().allow('', null),
    address: commonValidations.longText.optional().allow('', null),
    status: commonValidations.status(['active', 'inactive']).default('active')
  }),

  updateClient: Joi.object({
    company_name: Joi.string().min(2).max(255).optional().trim(),
    contact_person: commonValidations.name.optional().allow('', null),
    email: commonValidations.email.optional().allow('', null),
    phone: commonValidations.phone.optional().allow('', null),
    address: commonValidations.longText.optional().allow('', null),
    status: commonValidations.status(['active', 'inactive']).optional()
  }).min(1),

  clientId: Joi.object({
    id: commonValidations.id
  })
};

// Job Order validation schemas
const jobOrderValidation = {
  createJobOrder: Joi.object({
    title: Joi.string().min(2).max(255).required().trim(),
    description: commonValidations.longText.optional().allow('', null),
    required_skills: commonValidations.longText.optional().allow('', null),
    experience_required: Joi.number().precision(1).min(0).max(50).optional(),
    client_id: commonValidations.id,
    salary_range: Joi.string().max(100).optional().allow('', null),
    location: Joi.string().max(255).optional().allow('', null),
    status: commonValidations.status(['open', 'closed', 'filled']).default('open')
  }),

  updateJobOrder: Joi.object({
    title: Joi.string().min(2).max(255).optional().trim(),
    description: commonValidations.longText.optional().allow('', null),
    required_skills: commonValidations.longText.optional().allow('', null),
    experience_required: Joi.number().precision(1).min(0).max(50).optional(),
    status: commonValidations.status(['open', 'closed', 'filled']).optional(),
    salary_range: Joi.string().max(100).optional().allow('', null),
    location: Joi.string().max(255).optional().allow('', null)
  }).min(1),

  jobOrderId: Joi.object({
    id: commonValidations.id
  })
};

// Assignment validation schemas
const assignmentValidation = {
  createAssignment: Joi.object({
    candidate_id: commonValidations.id,
    job_order_id: commonValidations.id,
    status: commonValidations.status(['applied', 'interviewing', 'offered', 'placed', 'rejected']).default('applied'),
    notes: commonValidations.text.optional().allow('', null),
    assigned_date: Joi.date().iso().max('now').optional()
  }),

  updateAssignment: Joi.object({
    status: commonValidations.status(['applied', 'interviewing', 'offered', 'placed', 'rejected']).required(),
    notes: commonValidations.text.optional().allow('', null),
    start_date: Joi.date().iso().optional(),
    end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
  }),

  assignmentId: Joi.object({
    id: commonValidations.id
  })
};

// User validation schemas (if you have user management)
const userValidation = {
  createUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required().trim(),
    email: commonValidations.email.required(),
    password: Joi.string().min(6).max(128).required(),
    role: commonValidations.status(['admin', 'recruiter', 'manager']).default('recruiter'),
    first_name: commonValidations.name.required(),
    last_name: commonValidations.name.required()
  }),

  updateUser: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).optional().trim(),
    email: commonValidations.email.optional(),
    role: commonValidations.status(['admin', 'recruiter', 'manager']).optional(),
    first_name: commonValidations.name.optional(),
    last_name: commonValidations.name.optional(),
    status: commonValidations.status(['active', 'inactive']).optional()
  }).min(1)
};

// Validation middleware
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert types where possible (e.g., string to number)
    });
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        message: 'Please check your input data',
        details: errorDetails
      });
    }
    
    // Replace the request data with validated and converted values
    req[property] = value;
    next();
  };
};

// Param validation middleware (for URL parameters)
const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      convert: true
    });
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'Please check your URL parameters',
        details: errorDetails
      });
    }
    
    req.params = value;
    next();
  };
};

// Query validation middleware (for URL query parameters)
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      convert: true,
      stripUnknown: true
    });
    
    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        message: 'Please check your search/filter parameters',
        details: errorDetails
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  candidateValidation,
  clientValidation,
  jobOrderValidation,
  assignmentValidation,
  userValidation,
  validate,
  validateParams,
  validateQuery
};