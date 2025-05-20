import React from 'react';

const Header: React.FC = () => {
    return (
        <header>
            <h1>Data Relationships Visualizer</h1>
            <nav>
                <ul>
                    <li><a href="#assets">Data Assets</a></li>
                    <li><a href="#add-asset">Add Data Asset</a></li>
                    <li><a href="#visualize">Visualize Relationships</a></li>
                </ul>
            </nav>
        </header>
    );
};

export default Header;