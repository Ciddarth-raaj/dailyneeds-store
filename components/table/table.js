import { useState, useEffect } from "react";

import styles from "./table.module.css";
import Pagination from "../pagination/pagination";
import Cell from "./cell.js";

const Table = ({ heading, rows, sortCallback }) => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [postsPerPage] = useState(2);

    useEffect(() => {
        const fetchPosts = async () => {
            setLoading(true);
            setPosts(rows);
            setLoading(false);
        };
        fetchPosts();
    }, []);

    //Get Current Posts
    const indexOfLastPost = currentPage * postsPerPage;
    const indexOfFirstPost = indexOfLastPost - postsPerPage;
    const currentPosts = rows.slice(indexOfFirstPost, indexOfLastPost);

    //Change Page
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div>
            <table className={styles.table} style={{ tableLayout: "fixed" }}>
                <thead>
                    {Object.keys(heading).map((key, index) => (
                        <Cell
                            key={`heading-${index}`}
                            content={heading[key]}
                            header={true}
                            headingKey={key}
                            sortCallback={sortCallback}
                        />
                    ))}
                </thead>
                <tbody>
                    {currentPosts.map((row) => (
                        <tr>
                            {Object.keys(row).map((key, index) => (
                                <Cell
                                    key={`${key}-${index}`}
                                    content={row[key]}
                                />
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <Pagination
                postsPerPage={postsPerPage}
                totalPosts={posts.length}
                paginate={paginate}
            />
        </div>
    );
};
export default Table;
