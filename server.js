const express = require('express');
const connectDB = require('./config/db');
const appRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

require('dotenv').config();

const app = express();
app.use(express.json());

connectDB();





// Route registration
app.use('/auth/api', authRoutes);
app.use('/api', appRoutes);

app.get('/', (req, res) => {
  res.send('API is working!');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
