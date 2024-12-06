import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/navbar';
import LoginPage from './components/loginPage';
import Books from './components/books';
import BookDetails from './components/bookDetails';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import SignupPage from './components/signUpPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>  {/* Use Routes instead of Switch */}
          
          <Route path="/" element={<LoginPage />} />
          <Route path="/signUpPage" element={<SignupPage />} />
          <Route path="/books" element={<Books />} exact />
          <Route path="/books/:id" element={<BookDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
