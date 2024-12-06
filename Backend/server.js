const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json()); // For parsing application/json


// Database connection
const db = mysql.createConnection({
    host: 'database-1.chmeu2mau617.us-east-1.rds.amazonaws.com',
    user: 'admin',
    password: 'SanjuArjun090',
    database: 'LMS'
});

// Test DB connection
db.connect(err => {
    if (err) {
        console.error('Database connection failed: ' + err.stack);
        return;
    }
    console.log('Connected to database.');
    const tables = "show tables"
    db.query(tables);

});

app.get('/api/books', (req, res) => {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    console.log('Endpoint hit with params:', { page, limit, offset, search });

    const countQuery = `
        SELECT COUNT(*) AS total 
        FROM books
        LEFT JOIN bookauthors ON books.Book_ID = bookauthors.Book_ID
        LEFT JOIN author ON bookauthors.author_id = author.id
        LEFT JOIN publisher ON books.Publish_Id = publisher.id
        WHERE books.title LIKE ? 
        OR CONCAT(author.f_name, ' ', author.l_name) LIKE ?
        OR publisher.publisher LIKE ?
    `;
    const dataQuery = `
        SELECT 
            books.Book_ID, 
            books.title, 
            books.isbn, 
            books.edition, 
            books.year, 
            publisher.publisher AS publisher, 
            GROUP_CONCAT(CONCAT(author.f_name, ' ', author.l_name) SEPARATOR ', ') AS authors
        FROM books
        LEFT JOIN bookauthors ON books.Book_ID = bookauthors.Book_ID
        LEFT JOIN author ON bookauthors.author_id = author.id
        LEFT JOIN publisher ON books.Publish_Id = publisher.id
        WHERE books.title LIKE ? 
        OR CONCAT(author.f_name, ' ', author.l_name) LIKE ?
        OR publisher.publisher LIKE ?
        GROUP BY books.Book_ID
        LIMIT ?, ?
    `;

    const searchPattern = `%${search}%`;

    db.query(countQuery, [searchPattern, searchPattern, searchPattern], (err, countResult) => {
        if (err) {
            console.error('Error in count query:', err);
            return res.status(500).json({ error: 'Failed to fetch data count' });
        }

        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        db.query(dataQuery, [searchPattern, searchPattern, searchPattern, parseInt(offset), parseInt(limit)], (err, results) => {
            if (err) {
                console.error('Error in data query:', err);
                return res.status(500).json({ error: 'Failed to fetch books' });
            }

            res.json({
                data: results,
                page: parseInt(page),
                totalPages,
            });
        });
    });
});


app.put('/api/books/:bookId', (req, res) => {
    const { bookId } = req.params;
    const { title, isbn, edition, year } = req.body;

    const updateQuery = `
        UPDATE books 
        SET title = ?, isbn = ?, edition = ?, year = ? 
        WHERE Book_ID = ?
    `;

    db.query(updateQuery, [title, isbn, edition, year, bookId], (err, result) => {
        if (err) {
            console.error('Error updating book:', err);
            return res.status(500).json({ error: 'Failed to update book' });
        }

        res.json({ message: 'Book updated successfully' });
    });
});



// API to fetch book details
app.get('/api/books/:id', (req, res) => {
    const bookId = req.params.id;

    // Query to fetch book details
    const bookQuery = `
        SELECT 
            b.Book_ID, 
            b.title, 
            b.isbn, 
            b.edition, 
            b.year, 
            p.publisher, 
            COUNT(c.copy_id) AS totalCopies
        FROM books b
        JOIN publisher p ON b.Publish_Id = p.id
        JOIN bookcopies c ON b.Book_ID = c.Book_ID
        WHERE b.Book_ID = ?
        GROUP BY b.Book_ID, b.title, b.isbn, b.edition, b.year, p.publisher
    `;

    // Query to fetch borrowed users
    const borrowedQuery = `
        SELECT 
            br.Borrow_id,
            br.Mem_id, 
            m.fName AS memberName, 
            br.due_date, 
            br.return_date, 
            c.copy_id
        FROM borrow br
        JOIN member m ON br.Mem_id = m.M_ID
        JOIN bookcopies c ON br.copy_id = c.copy_id
        WHERE br.Book_ID = ? AND br.return_date IS NULL
    `;

    // Query to fetch fined users
    const finedQuery = `
        SELECT 
            f.fine_id, 
            f.fine_amount, 
            f.status, 
            f.date, 
            br.Mem_id, 
            m.fName AS memberName
        FROM fine f
        JOIN borrow br ON f.borrow_id = br.Borrow_id
        JOIN member m ON br.Mem_id = m.M_ID
        WHERE br.Book_ID = ?
    `;

    db.query(bookQuery, [bookId], (err, bookResults) => {
        if (err) {
            console.error('Error fetching book details:', err);
            return res.status(500).json({ error: 'Failed to fetch book details' });
        }

        if (bookResults.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const bookDetails = bookResults[0];

        db.query(borrowedQuery, [bookId], (err, borrowedResults) => {
            if (err) {
                console.error('Error fetching borrowed users:', err);
                return res.status(500).json({ error: 'Failed to fetch borrowed users' });
            }

            const borrowedUsers = borrowedResults.map((borrowed) => ({
                borrowId:borrowed.Borrow_id,
                memberId: borrowed.Mem_id,
                memberName: borrowed.memberName,
                dueDate: borrowed.due_date,
                copyId: borrowed.copy_id,
            }));

            db.query(finedQuery, [bookId], (err, finedResults) => {
                if (err) {
                    console.error('Error fetching fined users:', err);
                    return res.status(500).json({ error: 'Failed to fetch fined users' });
                }

                const finedUsers = finedResults.map((fine) => ({
                    fineId: fine.fine_id,
                    fineAmount: fine.fine_amount,
                    status: fine.status,
                    date: fine.date,
                    memberId: fine.Mem_id,
                    memberName: fine.memberName,
                }));

                // Calculate available copies
                const availableCopies = bookDetails.totalCopies - borrowedUsers.length;

                // Final response
                res.json({
                    book: {
                        id: bookDetails.Book_ID,
                        title: bookDetails.title,
                        isbn: bookDetails.isbn,
                        edition: bookDetails.edition,
                        year: bookDetails.year,
                        publisher: bookDetails.publisher,
                        totalCopies: bookDetails.totalCopies,
                        availableCopies,
                        borrowedCopies: borrowedUsers.length,
                    },
                    borrowedUsers,
                    finedUsers,
                });
            });
        });
    });
});






app.put('/api/borrow/return', (req, res) => {
    const { borrowId, returnDate } = req.body;
    console.log("bid",borrowId,"rdate",returnDate)

    const updateQuery = `
        UPDATE borrow 
        SET return_date = ? 
        WHERE Borrow_id = ?
    `;

    db.query(updateQuery, [returnDate, borrowId], (err, result) => {
        if (err) {
            console.error('Error updating return date:', err);
            return res.status(500).json({ error: 'Failed to update return date' });
        }

        res.json({ message: 'Return date updated successfully' });
    });
});


app.get('/api/members/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT M_ID AS memberId, CONCAT(fName, ' ', lName) AS name FROM member WHERE M_ID = ?`;

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error fetching member:', err);
            return res.status(500).json({ error: 'Failed to fetch member' });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json(results[0]);
    });
});

app.post('/api/borrow', (req, res) => {
    const { bookId, memberId, dueDate } = req.body;

    // Query to find an available copy
    const getCopyQuery = `
        SELECT copy_id 
        FROM bookcopies 
        WHERE Book_ID = ? AND status = 'available' 
        LIMIT 1
    `;

    // Query to fetch max Borrow_id
    const getMaxBorrowIdQuery = `SELECT MAX(Borrow_id) AS maxBorrowId FROM borrow`;

    // Query to insert a new borrow entry
    const borrowQuery = `
        INSERT INTO borrow (Borrow_id, Book_ID, copy_id, Mem_id, due_date, return_date) 
        VALUES (?, ?, ?, ?, ?, NULL)
    `;

    db.query(getCopyQuery, [bookId], (err, copyResults) => {
        if (err) {
            console.error('Error fetching available copy:', err);
            return res.status(500).json({ error: 'Failed to fetch available copy' });
        }

        if (copyResults.length === 0) {
            return res.status(400).json({ error: 'No available copies' });
        }

        const copyId = copyResults[0].copy_id;

        // Fetch the max Borrow_id and insert a new borrow entry
        db.query(getMaxBorrowIdQuery, (err, borrowIdResults) => {
            if (err) {
                console.error('Error fetching max Borrow_id:', err);
                return res.status(500).json({ error: 'Failed to fetch max Borrow_id' });
            }

            const maxBorrowId = borrowIdResults[0].maxBorrowId || 0; // Default to 0 if table is empty
            const newBorrowId = maxBorrowId + 1;

            db.query(borrowQuery, [newBorrowId, bookId, copyId, memberId, dueDate], (err) => {
                if (err) {
                    console.error('Error adding borrow entry:', err);
                    return res.status(500).json({ error: 'Failed to add borrow entry' });
                }

                // Mark the copy as borrowed
                db.query(
                    `UPDATE bookcopies SET status = 'borrowed' WHERE copy_id = ?`,
                    [copyId],
                    (updateErr) => {
                        if (updateErr) {
                            console.error('Error updating copy status:', updateErr);
                            return res.status(500).json({ error: 'Failed to update copy status' });
                        }
                        res.json({ message: 'Borrow entry added successfully' });
                    }
                );
            });
        });
    });
});


app.put('/api/bookcopies/:copyId', (req, res) => {
    const { copyId } = req.params;
    const { status } = req.body;

    const updateQuery = `
        UPDATE bookcopies 
        SET status = ? 
        WHERE copy_id = ?
    `;
    console.log(copyId)
    db.query(updateQuery, [status, copyId], (err, result) => {
        if (err) {
            console.error('Error updating copy status:', err);
            return res.status(500).json({ error: 'Failed to update copy status' });
        }

        res.json({ message: 'Copy status updated successfully' });
    });
});


app.post('/api/fines', (req, res) => {
    const { borrowId, fineAmount, status } = req.body;

    // Query to get the max fine_id
    const getMaxFineIdQuery = `SELECT MAX(fine_id) AS maxFineId FROM fine`;

    // Query to insert a new fine entry
    const insertQuery = `
        INSERT INTO fine (fine_id, borrow_id, fine_amount, status, date) 
        VALUES (?, ?, ?, ?, NOW())
    `;

    // Get the max fine_id
    db.query(getMaxFineIdQuery, (err, results) => {
        if (err) {
            console.error('Error fetching max fine_id:', err);
            return res.status(500).json({ error: 'Failed to fetch max fine_id' });
        }

        const maxFineId = results[0].maxFineId || 0; // Default to 0 if no records exist
        const newFineId = maxFineId + 1;

        // Insert the new fine with the calculated fine_id
        db.query(insertQuery, [newFineId, borrowId, fineAmount, status], (err, result) => {
            if (err) {
                console.error('Error inserting fine:', err);
                return res.status(500).json({ error: 'Failed to add fine' });
            }

            res.json({ message: 'Fine added successfully', fineId: newFineId });
        });
    });
});

app.post('/api/signup', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const query = `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`;
    db.query(query, [username, email, password], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            return res.status(500).json({ error: 'Signup failed' });
        }
        res.status(201).json({ message: 'User registered successfully' });
    });
});

// Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    const query = `SELECT * FROM users WHERE email = ? AND password = ?`;
    db.query(query, [email, password], (err, results) => {
        if (err || results.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = results[0];
        res.json({ message: 'Login successful', username: user.username });
    });
});

const PORT =  5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
