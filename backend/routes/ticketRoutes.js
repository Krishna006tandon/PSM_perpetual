const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const {
  DEV_EMAIL,
  OWNER_EMAIL,
  sendTicketCreatedEmails,
  sendTicketStatusUpdateEmails,
  sendTicketMessageEmail
} = require('../services/ticketEmailService');

// Setup upload directory for ticket screenshots/images
const ticketUploadDir = path.join(__dirname, '..', 'uploads', 'tickets');
if (!fs.existsSync(ticketUploadDir)) {
  fs.mkdirSync(ticketUploadDir, { recursive: true });
}

const ticketStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ticketUploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `ticket-${uniqueSuffix}${ext}`);
  }
});

const ticketUpload = multer({
  storage: ticketStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB per file
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    const allowedExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg']);
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedExts.has(ext)) return cb(null, true);
    cb(new Error('Only image files (PNG, JPG, JPEG, WEBP, GIF) are allowed for tickets.'));
  }
});

// Middleware: Verify if requester is Developer (nexbyte.dev@gmail.com) or SuperAdmin
const devOrAdminAuth = async (req, res, next) => {
  // Check if standard auth user is dev or superadmin
  if (req.user) {
    if (
      req.user.role === 'SuperAdmin' ||
      req.user.email?.toLowerCase() === DEV_EMAIL.toLowerCase()
    ) {
      return next();
    }
  }

  // Also support dev key in header for direct developer console integration
  const devKey = req.header('X-Dev-Access-Key');
  if (devKey && devKey === (process.env.DEV_ACCESS_KEY || 'nexbyte-dev-2026')) {
    req.isDevKeyAuthenticated = true;
    return next();
  }

  return res.status(403).json({ error: 'Access denied. Developer or SuperAdmin privileges required.' });
};

// -------------------------------------------------------------
// CUSTOMER ENDPOINTS
// -------------------------------------------------------------

// POST /api/tickets/upload - Upload screenshots / images for ticket
router.post('/upload', auth, ticketUpload.array('images', 5), (req, res) => {
  try {
    const files = req.files || [];
    const attachments = files.map(f => ({
      url: `/uploads/tickets/${f.filename}`,
      filename: f.originalname,
      mimetype: f.mimetype,
      size: f.size
    }));
    res.json({ success: true, attachments });
  } catch (err) {
    console.error('Error uploading ticket images:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets - Customer raises a new support ticket
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, category, priority, systemInfo, attachments } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required.' });
    }

    // Fetch user details for richer context
    const user = await User.findById(req.user.userId).select('name email companyName companyCode contact');

    const customerName = user?.name || req.user.name || 'Anonymous Customer';
    const customerEmail = user?.email || req.user.email;
    const companyName = user?.companyName || 'N/A';
    const companyCode = user?.companyCode || req.user.companyCode || '';
    const contact = user?.contact || '';

    // Generate unique readable ticket ID: TKT-XXXXXX
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    const ticketId = `TKT-${randomDigits}`;

    // Process attachments: support uploaded URLs or base64 pasted screenshots
    let sanitizedAttachments = [];
    if (Array.isArray(attachments)) {
      for (const att of attachments) {
        if (!att) continue;
        if (typeof att === 'string' && att.startsWith('data:image/')) {
          const match = att.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
          if (match) {
            const ext = match[1] === 'jpeg' ? '.jpg' : `.${match[1]}`;
            const filename = `ticket-paste-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
            const filePath = path.join(ticketUploadDir, filename);
            fs.writeFileSync(filePath, Buffer.from(match[2], 'base64'));
            sanitizedAttachments.push({
              url: `/uploads/tickets/${filename}`,
              filename: 'Pasted Screenshot',
              mimetype: `image/${match[1]}`,
              size: Buffer.from(match[2], 'base64').length
            });
          }
        } else if (att.url) {
          sanitizedAttachments.push({
            url: att.url,
            filename: att.filename || 'Screenshot',
            mimetype: att.mimetype || 'image/png',
            size: att.size || 0
          });
        }
      }
    }

    const newTicket = new Ticket({
      ticketId,
      title: title.trim(),
      description: description.trim(),
      category: category || 'Bug / Error',
      priority: priority || 'Medium',
      status: 'Open',
      user: req.user.userId,
      customerName,
      customerEmail,
      companyName,
      companyCode,
      contact,
      systemInfo: systemInfo || {},
      attachments: sanitizedAttachments,
      assignedDev: DEV_EMAIL,
      timeline: [
        {
          action: 'Ticket Created',
          status: 'Open',
          actor: 'Customer',
          actorEmail: customerEmail,
          note: 'Ticket submitted by customer via portal'
        }
      ]
    });

    await newTicket.save();

    // Trigger email notifications in background (non-blocking)
    sendTicketCreatedEmails(newTicket).catch(err => {
      console.error('Error sending ticket created emails:', err);
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket registered successfully.',
      ticket: newTicket
    });
  } catch (err) {
    console.error('Error creating support ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/my - Customer fetches their raised tickets
router.get('/my', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('email companyCode');
    const query = {
      $or: [
        { user: req.user.userId },
        { customerEmail: user?.email || req.user.email }
      ]
    };

    if (user?.companyCode) {
      query.$or.push({ companyCode: user.companyCode });
    }

    const tickets = await Ticket.find(query).sort({ createdAt: -1 }).lean();
    res.json(tickets);
  } catch (err) {
    console.error('Error fetching customer tickets:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/:id - Get single ticket details
router.get('/:id', auth, async (req, res) => {
  try {
    const ticket = await Ticket.findOne({
      $or: [{ _id: req.params.id }, { ticketId: req.params.id }]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    // Check ownership or dev/admin permission
    const isOwner =
      req.user.role === 'SuperAdmin' ||
      req.user.email?.toLowerCase() === DEV_EMAIL.toLowerCase();

    if (
      !isOwner &&
      String(ticket.user) !== String(req.user.userId) &&
      ticket.customerEmail !== req.user.email &&
      ticket.companyCode !== req.user.companyCode
    ) {
      return res.status(403).json({ error: 'Access denied to this ticket.' });
    }

    res.json(ticket);
  } catch (err) {
    console.error('Error fetching ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tickets/:id/message - Customer or Dev sends message in ticket thread
router.post('/:id/message', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    const ticket = await Ticket.findOne({
      $or: [{ _id: req.params.id }, { ticketId: req.params.id }]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const isDev =
      req.user.role === 'SuperAdmin' ||
      req.user.email?.toLowerCase() === DEV_EMAIL.toLowerCase();

    const sender = isDev ? 'Developer' : 'Customer';
    const senderName = isDev ? 'NexByte_Core' : req.user.name || 'Customer';
    const senderEmail = req.user.email;

    const newMsg = {
      sender,
      senderName,
      senderEmail,
      message: message.trim(),
      createdAt: new Date()
    };

    ticket.messages.push(newMsg);
    ticket.timeline.push({
      action: `${sender} Message`,
      status: ticket.status,
      actor: sender,
      actorEmail: senderEmail,
      note: message.trim().slice(0, 120) + (message.length > 120 ? '...' : '')
    });

    await ticket.save();

    // Notify other party
    sendTicketMessageEmail(ticket, newMsg, sender).catch(err => {
      console.error('Error sending message notification:', err);
    });

    res.json({ success: true, ticket });
  } catch (err) {
    console.error('Error adding message to ticket:', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// DEVELOPER & OWNER ENDPOINTS
// -------------------------------------------------------------

// GET /api/tickets/dev/stats - KPI Stats for Developer Dashboard
router.get('/dev/stats', auth, devOrAdminAuth, async (req, res) => {
  try {
    const [total, open, inProgress, underReview, resolved, closed, critical] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: 'Open' }),
      Ticket.countDocuments({ status: 'In Progress' }),
      Ticket.countDocuments({ status: 'Under Review' }),
      Ticket.countDocuments({ status: 'Resolved' }),
      Ticket.countDocuments({ status: 'Closed' }),
      Ticket.countDocuments({ priority: 'Critical', status: { $ne: 'Closed' } })
    ]);

    res.json({
      total,
      open,
      inProgress,
      underReview,
      resolved,
      closed,
      critical
    });
  } catch (err) {
    console.error('Error fetching ticket stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tickets/dev/all - Fetch all tickets with filters
router.get('/dev/all', auth, devOrAdminAuth, async (req, res) => {
  try {
    const { status, priority, category, search } = req.query;

    const filter = {};
    if (status && status !== 'ALL') filter.status = status;
    if (priority && priority !== 'ALL') filter.priority = priority;
    if (category && category !== 'ALL') filter.category = category;

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      filter.$or = [
        { ticketId: regex },
        { title: regex },
        { description: regex },
        { customerName: regex },
        { customerEmail: regex },
        { companyName: regex },
        { companyCode: regex }
      ];
    }

    const tickets = await Ticket.find(filter).sort({ createdAt: -1 }).lean();
    res.json(tickets);
  } catch (err) {
    console.error('Error fetching dev tickets:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tickets/dev/:id/status - Update ticket status & resolution note (Triggers Email to Customer!)
router.put('/dev/:id/status', auth, devOrAdminAuth, async (req, res) => {
  try {
    const { status, resolutionNotes } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const ticket = await Ticket.findOne({
      $or: [{ _id: req.params.id }, { ticketId: req.params.id }]
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const previousStatus = ticket.status;
    ticket.status = status;

    if (resolutionNotes) {
      ticket.resolutionNotes = resolutionNotes.trim();
    }

    if (status === 'Resolved' && !ticket.resolvedAt) {
      ticket.resolvedAt = new Date();
    }

    const actor = req.user?.email?.toLowerCase() === DEV_EMAIL.toLowerCase() ? 'NexByte_Core' : 'Platform Owner';
    const actorEmail = req.user?.email || DEV_EMAIL;

    ticket.timeline.push({
      action: `Status changed to ${status}`,
      status,
      actor,
      actorEmail,
      note: resolutionNotes ? resolutionNotes.trim() : `Status moved from ${previousStatus} to ${status}`,
      timestamp: new Date()
    });

    await ticket.save();

    // Trigger full transparency email to Customer and sync copy to Dev/Owner
    sendTicketStatusUpdateEmails(ticket, previousStatus, resolutionNotes).catch(err => {
      console.error('Error sending ticket status update emails:', err);
    });

    res.json({
      success: true,
      message: `Ticket status updated to ${status} and notification sent to customer.`,
      ticket
    });
  } catch (err) {
    console.error('Error updating ticket status:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
