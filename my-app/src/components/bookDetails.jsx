import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './css/BookDetails.css';

const BookDetails = () => {
    const { id } = useParams(); // Dynamic book ID from route
    const [book, setBook] = useState(null);
    const [borrowedUsers, setBorrowedUsers] = useState([]);
    const [finedUsers, setFinedUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMemberForm, setShowAddMemberForm] = useState(false);
    const [newMember, setNewMember] = useState({ memberId: '', name: '' });

    useEffect(() => {
        // Fetch book details and users
        axios
            .get(`http://localhost:5000/api/books/${id}`)
            .then((response) => {
                setBook(response.data.book);
                setBorrowedUsers(response.data.borrowedUsers);
                setFinedUsers(response.data.finedUsers);
                
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching book details:', error);
                setLoading(false);
            });
            console.log(finedUsers)
    }, [id]);

    const handleReturnBook = (user) => {
        const currentDate = new Date();
        const dueDate = new Date(user.dueDate);
        const isOverdue = currentDate > dueDate;
    
        // Format the current date to YYYY-MM-DD
        const formattedReturnDate = currentDate.toISOString().split('T')[0];
    
        // Update the borrow table with return date
        axios
            .put(`http://localhost:5000/api/borrow/return`, {
                borrowId: user.borrowId,
                returnDate: formattedReturnDate,
            })
            .then(() => {
                if (isOverdue) {
                    // Calculate the fine based on the number of overdue days
                    const overdueDays = Math.ceil((currentDate - dueDate) / (1000 * 60 * 60 * 24)); // Convert ms to days
                    const fineAmount = overdueDays * 1.0; // $1 per day
    
                    alert(`User ${user.memberName} has an overdue fine of $${fineAmount}.`);
    
                    // Post the fine
                    axios
                        .post(`http://localhost:5000/api/fines`, {
                            borrowId: user.borrowId,
                            fineAmount: fineAmount,
                            status: 'Paid',
                        })
                        .then(() => {
                            setFinedUsers([
                                ...finedUsers,
                                { ...user, fineAmount: fineAmount },
                            ]);
                        })
                        .catch((error) => console.error('Error adding fine:', error));
                } else {
                    alert(`User ${user.memberName} returned the book on time.`);
                }
    
                // Mark the copy as available
                axios
                    .put(`http://localhost:5000/api/bookcopies/${user.copyId}`, {
                        status: 'available',
                    })
                    .then(() => {
                        console.log(`Copy ${user.copyId} marked as available.`);
                    })
                    .catch((error) => console.error('Error updating copy status:', error));
    
                // Remove the user from the borrowed list in the UI
                setBorrowedUsers(
                    borrowedUsers.filter(
                        (borrower) => borrower.memberId !== user.memberId
                    )
                );
            })
            .catch((error) =>
                console.error('Error updating return date in borrow table:', error)
            );
    };
    

    const handleAddMember = () => {
        if (!newMember.memberId) {
            alert('Please provide a Member ID.');
            return;
        }
    
        // Check if the member exists
        axios
            .get(`http://localhost:5000/api/members/${newMember.memberId}`)
            .then((response) => {
                if (!response.data) {
                    alert('Member not found.');
                    return;
                }
    
                if (book.availableCopies <= 0) {
                    alert('No available copies of the book.');
                    return;
                }
    
                // Add the member to the borrow list
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 7);
    
                axios
                    .post(`http://localhost:5000/api/borrow`, {
                        bookId: book.id,
                        memberId: newMember.memberId,
                        dueDate: dueDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
                    })
                    .then(() => {
                        // Update the UI
                        setBorrowedUsers([
                            ...borrowedUsers,
                            {
                                memberId: newMember.memberId,
                                memberName: response.data.name,
                                dueDate: formatDate(dueDate),
                            },
                        ]);
                        setBook((prevBook) => ({
                            ...prevBook,
                            availableCopies: prevBook.availableCopies - 1,
                        }));
                        setNewMember({ memberId: '', name: '' });
                        setShowAddMemberForm(false);
                        alert('Member successfully added to borrow list.');
                    })
                    .catch((error) => console.error('Error adding member to borrow list:', error));
            })
            .catch((error) => console.error('Error checking member:', error));
    };
    

    const formatDate = (date) => {
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}-${month}-${year}`;
    };

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!book) {
        return <p>Book not found.</p>;
    }

    return (
        <div className="container mt-4">
            <h2>Book Details</h2>
            <p><strong>Title:</strong> {book.title}</p>
            <p><strong>ISBN:</strong> {book.isbn}</p>
            <p><strong>Edition:</strong> {book.edition}</p>
            <p><strong>Publisher:</strong> {book.publisher}</p>
            <p><strong>Year:</strong> {book.year}</p>
            <p><strong>Total Copies:</strong> {book.totalCopies}</p>
            <p><strong>Available Copies:</strong> {book.availableCopies}</p>
            <p><strong>Borrowed Copies:</strong> {book.borrowedCopies}</p>

            <h4 className="mt-4">Borrowed Users</h4>
            {borrowedUsers.length === 0 ? (
                <p>No users have borrowed this book.</p>
            ) : (
                <div className="row">
                    {borrowedUsers.map((user, index) => (
                        <div className="col-md-4 mb-4" key={index}>
                            <div className="card border-dark">
                                <div className="card-body">
                                    <h5 className="card-title">{user.memberName}</h5>
                                    <p><strong>Member ID:</strong> {user.memberId}</p>
                                    <p><strong>Due Date:</strong> {formatDate(user.dueDate)}</p>
                                    {new Date(user.dueDate) < new Date() ? (
                                        <p className="text-danger"><strong>Overdue!</strong></p>
                                    ) : null}
                                    <button
                                        className="btn btn-danger mt-2"
                                        onClick={() => handleReturnBook(user)}
                                    >
                                        Return Book
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <h4 className="mt-4">Add Member to Borrow</h4>
            {!showAddMemberForm ? (
                <button
                    className="btn btn-dark"
                    onClick={() => setShowAddMemberForm(true)}
                >
                    Add Member
                </button>
            ) : (
                <div className="mt-3">
                    <input
                        type="text"
                        placeholder="Member ID"
                        className="form-control mb-2"
                        value={newMember.memberId}
                        onChange={(e) => setNewMember({ ...newMember, memberId: e.target.value })}
                    />
                    <button className="btn btn-success" onClick={handleAddMember}>
                        Add to Borrow List
                    </button>
                </div>
            )}

            <h4 className="mt-4">Fined Users</h4>
            {finedUsers.length === 0 ? (
                <p>No users have been fined for this book.</p>
            ) : (
                <div className="table-responsive">
                    <table className="table table-bordered">
                        <thead>
                            <tr>
                                <th>Fine ID</th>
                                <th>Member Name</th>
                                <th>Member ID</th>
                                <th>Fine Amount</th>
                                <th>Status</th>
                                <th>Fine Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {finedUsers.map((user, index) => (
                                <tr key={index}>
                                    <td>{user.fineId}</td>
                                    <td>{user.memberName}</td>
                                    <td>{user.memberId}</td>
                                    <td>${parseFloat(user.fineAmount).toFixed(2)}</td>
                                    <td>{user.status}</td>
                                    <td>{new Date(user.date).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    );
};

export default BookDetails;
