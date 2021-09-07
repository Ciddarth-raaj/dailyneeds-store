import React from "react";

import styles from "./globalWrapper.module.css";

import SideBar from "../sideBar/sideBar";
import Header from "../header/header";

export default class GlobalWrapper extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			title: props.title || "",
		};
	}

	render() {
		const { children } = this.props;
		const { title } = this.state;
		return (
			<div>
				<SideBar />
				<Header />
				<div className={styles.childContainer}>
					{title != "" && (
						<div className={styles.headingWrapper}>
							<h1>{title}</h1>
						</div>
					)}
					{children}
				</div>
			</div>
		);
	}
}
