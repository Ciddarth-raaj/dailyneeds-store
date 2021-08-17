import React from "react";
import styles from "./header.module.css"
import Head from "../../util/head";

export default class Header extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }
    
    render() {
        const {} = this.state;
        return (
            <div className={styles.container}>
                <Head />
                <div className={styles.buttonHolder}>
                    <a className={styles.buttonBonus}><img src="/assets/stack.png" className={styles.icon} />Bonus Ui</a>
                    <a className={styles.buttonLevel}><i className={`fas fa-box`} aria-hidden="true"></i>Level Menu</a>
                </div>
                <div className={styles.navigationBar}>
                    <i className={`fa fa-search ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-bell-o ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-star ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-moon-o ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-shopping-cart ${styles.icon}`} aria-hidden="true"></i>
                    <i className={`fa fa-expand ${styles.icon}`} aria-hidden="true"></i>

                </div>
            </div>
        )
    }
}