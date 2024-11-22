const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); // Import crypto for password hashing

const app = express();
const PORT = process.env.PORT || 5000; // Dynamic port for Heroku

app.use(cors()); // Enable CORS
app.use(express.json()); // Enable JSON parsing

// Supabase initialization (store credentials securely in environment variables)
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY
);

// Nodemailer setup (credentials stored in Heroku environment variables)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, username, email, password, address, address2, city, state, zip } = req.body;

  if (!firstName || !lastName || !username || !email || !password) {
    return res.status(400).json({ message: 'Please fill all required fields.' });
  }

  // Hash password using crypto module (SHA-256)
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');

  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          username: username,
          email: email,
          password: hashedPassword, // Store the hashed password
          address: address,
          address2: address2,
          city: city,
          state: state,
          zip: zip,
        }
      ]);

    if (error) {
      console.error('Error inserting user:', error);
      return res.status(500).json({ message: 'Failed to register user' });
    }

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'An unexpected error occurred' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password, userType } = req.body;

  if (!email || !password || !userType) {
    return res.status(400).json({ message: 'Please provide email, password, and user type.' });
  }

  let data, error;

  try {
    // Check user credentials based on user type
    if (userType === 'user') {
      ({ data, error } = await supabase
        .from('users')
        .select('first_name, password')
        .eq('email', email));
    } else if (userType === 'admin') {
      ({ data, error } = await supabase
        .from('admins')
        .select('first_name, password')
        .eq('email', email));
    }

    if (error) {
      console.error('Error fetching data:', error.message);
      return res.status(500).json({ message: 'Failed to fetch user data.' });
    }

    if (data.length > 0) {
      const storedPasswordHash = data[0].password;

      // Hash the input password and compare with stored hash
      const hashedInputPassword = crypto.createHash('sha256').update(password).digest('hex');

      if (hashedInputPassword === storedPasswordHash) {
        res.status(200).json({
          message: 'Login successful!',
          firstName: data[0].first_name,
          userType: userType,
        });
      } else {
        res.status(401).json({ message: 'Invalid email or password.' });
      }
    } else {
      res.status(401).json({ message: 'Invalid email or password.' });
    }
  } catch (error) {
    console.error('Unexpected error during login:', error);
    res.status(500).json({ message: 'An unexpected error occurred.' });
  }
});

//Admin panel**************************************************************
// Fetch all books
app.get('/api/books', async (req, res) => {
  try {
    const { data, error } = await supabase.from('books').select('*');
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).send('Error fetching books');
  }
});

// Add a new book
app.post('/api/books', async (req, res) => {
  const { title, description, is_available, imgsrc } = req.body;

  try {
    const { data, error } = await supabase.from('books').insert([
      { title, description, is_available, imgsrc },
    ]);
    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding book:', error);
    res.status(500).send('Error adding book');
  }
});

// Delete a book
app.delete('/api/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { data, error } = await supabase.from('books').delete().eq('id', id);
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).send('Error deleting book');
  }
});

// Update the status of a borrowed book
app.put('/api/borrowedbooks/:id', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const { data, error } = await supabase
      .from('borrowedbooks')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error updating borrowed book status:', error);
    res.status(500).send('Error updating borrowed book status');
  }
});

// Fetch borrowed books
app.get('/api/borrowedbooks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('borrowedbooks')
      .select('*, books (title, imgsrc)');
    if (error) throw error;
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching borrowed books:', error);
    res.status(500).send('Error fetching borrowed books');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on https://library2-a07874b48aa0.herokuapp.com`);
});