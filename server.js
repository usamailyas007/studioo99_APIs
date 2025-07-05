const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const appRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');


require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

connectDB();





// Route registration
app.use('/auth/api', authRoutes);
app.use('/api', appRoutes);
app.use('/api', adminRoutes);


app.get('/', (req, res) => {
  res.send('API is working!');
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
