import { color } from "@chakra-ui/styled-system";
import React, { useState } from "react";
import styles from "./pagination.module.css";

const Pagination = ({ postsPerPage, totalPosts, paginate }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const pageNumber = [];
    for (let i = 1; i <= Math.ceil(totalPosts / postsPerPage); i++) {
        pageNumber.push(i);
    }
    return (
        <div className={styles.post}>
            {pageNumber.includes(currentPage - 1) ? (
                <a
                    onClick={() => {
                        setCurrentPage(currentPage - 1);
                        paginate(currentPage - 1);
                    }}
                    className={styles.button}
                >
                    {"Prev"}
                </a>
            ) : (
                <a className={styles.disableButton}>{"Prev"}</a>
            )}
            {pageNumber.map((number) => (
                <div key={number} style={{ padding: 5 }}>
                    <a
                        onClick={() => {
                            setCurrentPage(number);
                            paginate(number);
                        }}
                        className={
                            currentPage === number
                                ? styles.notActiveButton
                                : styles.button
                        }
                    >
                        {console.log(currentPage)}
                        {number}
                    </a>
                </div>
            ))}
            {pageNumber.includes(currentPage + 1) ? (
                <a
                    onClick={() => {
                        setCurrentPage(currentPage + 1);
                        paginate(currentPage + 1);
                    }}
                    className={styles.button}
                >
                    {"Next"}
                </a>
            ) : (
                <a className={styles.disableButton}>{"Next"}</a>
            )}
        </div>
    );
};
export default Pagination;
