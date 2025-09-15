import React from "react";
import styles from "./defaultPage.module.css"
import Head from "../../util/head";
import moment from "moment";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';

export default class DefaultPage extends React.Component {

    constructor(props) {
        super(props);
        this.state = {};
    }

    render() {
        const { } = this.state;
        const date = new Date;
        return (
            <div className={styles.container}>
                 
                <div className={styles.introContent}>
                    <h1 className={styles.heading}>Default</h1>
                    <div className={styles.cardHolder}>
                        <div className={styles.introCard}>
                            <div className={styles.introHead}>
                                <div className={styles.date}>
                                <p>{moment(date).format("hh:mm")}</p>
                                </div>
                                <i className={`fa fa-cog fa-spin fa-4x fa-fw ${styles.icon}`}></i>
                            </div>
                            <div className={styles.welcomeContent}>
                                <img className={styles.welcomeLogo} src="/assets/welcome.png" />
                                <p className={styles.welcomeText}>Good Evening</p>
                                <p className={styles.welcomeSubText}>Today's earrning is $405 & your sales increase rate is 3.7 over the last 24 hours</p>
                                <button className={styles.newFeaturesButton}>Whats New !</button>
                            </div>
                            <div className={styles.introBottom}>
                                <i className={`fa fa-bell ${styles.bellIcon}`} aria-hidden="true"></i>
                            </div>
                        </div>
                        <div className={styles.dateCard}>
                            <div className={styles.introHead}>
                                <Calendar className={styles.calendar}/>
                            </div>
                            <div className={styles.welcomeContent}></div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}