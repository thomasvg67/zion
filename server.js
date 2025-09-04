// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initSocket } = require('./middleware/socket'); // <-- NEW
const { dailyAlertJob, minuteAlertJob } = require('./middleware/crnJbAlrt');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server); // <-- Moved to socket.js

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file handling
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads/images', express.static(path.join(__dirname, 'uploads/images')));
app.use('/uploads/pdfs', express.static(path.join(__dirname, 'uploads/pdfs')));
app.use('/uploads/audio', express.static(path.join(__dirname, 'uploads/audio')));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    dailyAlertJob();
    minuteAlertJob();
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/notes', require('./routes/notes'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/feedbacks', require('./routes/FdBack'));
app.use('/api/users', require('./routes/users'));
app.use('/api/scrum-board', require('./routes/scrumBoardRoutes'));
app.use('/api/todolist', require('./routes/todolistRoutes'));
app.use('/api/alerts', require('./routes/alertRoutes'));
app.use('/api/names', require('./routes/nameRoutes'));
app.use('/api/medical-stats', require('./routes/medicalStatRoutes'));
app.use('/api/quotes', require('./routes/quoteRoutes'));
app.use('/api/dictionary', require('./routes/dictionaryRoutes'));
app.use('/api/medicines', require('./routes/medicineRoutes'));
app.use('/api/diary', require('./routes/diaryRoutes'));
app.use('/api/stories', require('./routes/storyRoutes'));
app.use('/api/business', require('./routes/businessIdeaRoutes'));
app.use('/api/mission', require('./routes/missionRoutes'));
app.use('/api/calendar', require('./routes/calendarEventRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/stckmfnd', require('./routes/stckMfndRoutes'));
app.use('/api/funds', require('./routes/fundsRoutes'));
app.use('/api/budget', require('./routes/budgetRoutes'));
app.use('/api/emails', require('./routes/emailRoutes'));
app.use('/api/clients', require('./routes/clientRoutes'));
app.use('/api/financial', require('./routes/FinancOutRoutes'));
app.use('/api/plans', require('./routes/plansRoutes'));


// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
