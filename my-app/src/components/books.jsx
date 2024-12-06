import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Books = () => {
    const [books, setBooks] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [editingBook, setEditingBook] = useState(null);
    const [editedBookDetails, setEditedBookDetails] = useState({});
    const cardsPerPage = 6;

    const navigate = useNavigate();
    const userdata= localStorage.getItem('user')

    // Handle search input with debounce
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset to page 1 when search query changes
        }, 500);

        return () => {
            clearTimeout(handler);
        };
    }, [searchQuery]);

    useEffect(() => {
        axios
            .get('http://localhost:5000/api/books', {
                params: { page: currentPage, limit: cardsPerPage, search: debouncedSearch },
            })
            .then((response) => {
                setBooks(response.data.data);
                setTotalPages(response.data.totalPages);
            })
            .catch((error) => {
                console.error('Error fetching books:', error);
            });
    }, [currentPage, debouncedSearch]);

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage((prev) => prev - 1);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
    };

    const handleEdit = (book) => {
        setEditingBook(book.Book_ID);
        setEditedBookDetails({
            title: book.title,
            isbn: book.isbn,
            edition: book.edition,
            year: book.year,
        });
    };

    const handleEditSave = (bookId) => {
        axios
            .put(`http://localhost:5000/api/books/${bookId}`, editedBookDetails)
            .then(() => {
                setEditingBook(null);
                // Refresh the books list after editing
                axios
                    .get('http://localhost:5000/api/books', {
                        params: { page: currentPage, limit: cardsPerPage, search: debouncedSearch },
                    })
                    .then((response) => {
                        setBooks(response.data.data);
                    });
            })
            .catch((error) => console.error('Error editing book:', error));
    };

    const handleDelete = (bookId) => {
        axios
            .delete(`http://localhost:5000/api/books/${bookId}`)
            .then(() => {
                // Refresh the books list after deletion
                axios
                    .get('http://localhost:5000/api/books', {
                        params: { page: currentPage, limit: cardsPerPage, search: debouncedSearch },
                    })
                    .then((response) => {
                        setBooks(response.data.data);
                    });
            })
            .catch((error) => console.error('Error deleting book:', error));
    };
    const handleCardClick = (id) => {
        navigate(`/books/${id}`);
    };

    return (
        <div className="container mt-4">
            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search by book name, author, or publisher"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="row">
                {books.map((book) => (
                    <div className="col-md-4 mb-4" key={book.Book_ID}
                    
                    >
                        
                        <div className="card border-dark">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <span>Edit/Delete</span>
                                <div>
                                    <i
                                        className="bi bi-pencil text-primary me-2"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleEdit(book)}
                                    ></i>
                                    <i
                                        className="bi bi-trash text-danger"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => handleDelete(book.Book_ID)}
                                    ></i>
                                </div>
                            </div>
                            <div className="card-body"
                            
                            >
                                {editingBook === book.Book_ID ? (
                                    <>
                                        <input
                                            type="text"
                                            className="form-control mb-2"
                                            value={editedBookDetails.title}
                                            onChange={(e) =>
                                                setEditedBookDetails({
                                                    ...editedBookDetails,
                                                    title: e.target.value,
                                                })
                                            }
                                        />
                                        <input
                                            type="text"
                                            className="form-control mb-2"
                                            value={editedBookDetails.isbn}
                                            onChange={(e) =>
                                                setEditedBookDetails({
                                                    ...editedBookDetails,
                                                    isbn: e.target.value,
                                                })
                                            }
                                        />
                                        <input
                                            type="text"
                                            className="form-control mb-2"
                                            value={editedBookDetails.edition}
                                            onChange={(e) =>
                                                setEditedBookDetails({
                                                    ...editedBookDetails,
                                                    edition: e.target.value,
                                                })
                                            }
                                        />
                                        <input
                                            type="text"
                                            className="form-control mb-2"
                                            value={editedBookDetails.year}
                                            onChange={(e) =>
                                                setEditedBookDetails({
                                                    ...editedBookDetails,
                                                    year: e.target.value,
                                                })
                                            }
                                        />
                                        <button
                                            className="btn btn-success"
                                            onClick={() => handleEditSave(book.Book_ID)}
                                        >
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    < >
                                    <div onClick={() => handleCardClick(book.Book_ID)}
                                        style={{ cursor: 'pointer' }}>

                                    
                                        <h5 className="card-title">{book.title}</h5>
                                        <h6 className="card-subtitle mb-2 text-muted">{book.isbn}</h6>
                                        <strong>Edition: </strong> {book.edition}
                                        <br />
                                        <strong>Publisher: </strong> {book.publisher}
                                        <br />
                                        <strong>Year: </strong> {book.year}
                                        <br />
                                        <strong>Authors: </strong>
                                        
                                            {book.authors.split(', ').map((author, index) => (
                                                <li key={index}>{author}</li>
                                            ))}
                                    </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="d-flex justify-content-between mt-4">
                <button
                    className="btn btn-dark"
                    onClick={handlePrevPage}
                    disabled={currentPage === 1}
                >
                    Previous
                </button>
                <span>
                    Page {currentPage} of {totalPages}
                </span>
                <button
                    className="btn btn-dark"
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                >
                    Next
                </button>
            </div>
        </div>
    );
};

export default Books;
