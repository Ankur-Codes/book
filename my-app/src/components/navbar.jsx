import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

const Navbar = () => {
    const [userData, setUserData] = useState(null);

    // Check localStorage on initial render and when it changes
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        setUserData(storedUser ? JSON.parse(storedUser) : null);
    }, []);

    const handleLogout = () => {
        // Remove user data from local storage
        localStorage.removeItem('user');
        setUserData(null); // Clear state

        // Redirect to login page
        window.location.href = '/';
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container-fluid">
                {/* Company Name */}
                <a className="navbar-brand" href="/">
                    MyLibrary
                </a>

                {/* Toggle button for mobile view */}
                <button
                    className="navbar-toggler"
                    type="button"
                    data-bs-toggle="collapse"
                    data-bs-target="#navbarNav"
                    aria-controls="navbarNav"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                >
                    <span className="navbar-toggler-icon"></span>
                </button>

                {/* Navbar Links */}
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto">
                        {userData ? (
                            <>
                                <li className="nav-item">
                                    <a className="nav-link" href="/books">
                                        <i className="bi bi-info"></i> Books
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className="nav-link"
                                        href="/"
                                        onClick={(e) => {
                                            e.preventDefault(); // Prevent default link behavior
                                            handleLogout();
                                        }}
                                    >
                                        <i className="bi bi-box-arrow-in-right"></i> Logout
                                    </a>
                                </li>
                            </>
                        ) : (<>
                        
                            <li className="nav-item">
                                <a className="nav-link" href="/signUpPage">
                                    <i className="bi bi-person-plus"></i> Signup
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/">
                                    <i className="bi bi-box-arrow-in-left"></i> Login
                                </a>
                            </li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
