
import React from 'react';
import styles from "./pagination.module.css";

const Pagination = ({ postsPerPage, totalPosts, paginate, next}) => {
    const pageNumber = [];
    for(let i=1; i<=Math.ceil(totalPosts / postsPerPage); i++) {
        pageNumber.push(i);
    }
    return (
        <div className={styles.post}>
                {pageNumber.map(number => (
                    <div key={number} style={{padding: 5}}>
                        <a onClick={()=> paginate(number)} className={styles.button}>
                            {number}
                        </a>
                    </div>
                ))}
                
                </div>
    )
}
export default Pagination