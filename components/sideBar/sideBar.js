import React from "react";
import styles from "./sideBar.module.css";
import Head from "../../util/head";

export default class SideBar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showTitle: false,
			subOptions: "",
		};
	}
	handleMouseEnter() {
		console.log({ title: this.state.showTitle });
		return this.state.showTitle ? styles.optionTitle : styles.title;
	}
	render() {
		const { showTitle, subOptions } = this.state;
		return (
			<div className={styles.container}
				onMouseEnter={() => this.setState({ showTitle: true })}
				onMouseLeave={() => this.setState({ showTitle: false })}
			>
				<Head />
				<div className={styles.logoHolder}>
					<img src="/assets/logo-icon.png" className={styles.logo} />
				</div>
				<div className={styles.sideBarOptions}>
					<div>
						<div className={showTitle ? styles.sideBarTopic : styles.title}>
							<p className={styles.topicHeading}>General</p>
							<p className={styles.topicContents}>DashBoard, widgets</p>
						</div>
					</div>
					<div className={styles.topicContainer}>
						<div className={styles.optionHolder}
							onClick={() => this.setState({
								subOptions: this.state.subOptions ===
									"DashBoard" ? "" : "DashBoard"
							})}>
							<i
								className={`fa fa-home ${styles.icons}`}
								aria-hidden="true"
							/>
							<div className={showTitle ? styles.optionTitle : styles.title}>
								<p className={styles.optionName}>DashBoard</p>
							</div>
						</div>
						{subOptions === "DashBoard" &&
							<div className={showTitle ? styles.subTopics : styles.title}>
								<a>- Default</a>
								<a>- Ecommerce</a>
							</div>
						}
					</div>
					<div className={styles.optionHolder}
						onClick={() => this.setState({
							subOptions: this.state.subOptions ===
								"Widgets" ? "" : "Widgets"
						})}>
						<i
							className={`fa fa-television ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Widgets</p>
						</div>
					</div>
					{subOptions === "Widgets" &&
						<div className={showTitle ? styles.subTopics : styles.title}>
							<a>- Default</a>
							<a>- Chart</a>
						</div>
					}
					<div>
						{/* {!showTitle && */}
						<div className={showTitle ? styles.sideBarTopic : styles.title}>
							<p className={styles.topicHeading}>Applications</p>
							<p className={styles.topicContents}>Ready To Use Apps</p>
						</div>
						{/* } */}
					</div>
					<div className={styles.optionHolder}
						onClick={() => this.setState({
							subOptions: this.state.subOptions ===
								"Projects" ? "" : "Projects"
						})}>
						<i
							className={`fa fa-cube ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Projects</p>
						</div>
					</div>
					{subOptions === "Projects" &&
						<div className={showTitle ? styles.subTopics : styles.title}>
							<a>- Project List</a>
							<a>- Create new</a>
						</div>
					}
					<div className={styles.optionHolder}
						onClick={() => this.setState({
							subOptions: this.state.subOptions ===
								"Ecommerce" ? "" : "Ecommerce"
						})}>
						<i
							className={`fa fa-briefcase ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Ecommerce</p>
						</div>
					</div>
					{subOptions === "Ecommerce" &&
						<div className={showTitle ? styles.subTopics : styles.title}>
							<a>- Product</a>
							<a>- Product Page</a>
							<a>- Product List</a>
							<a>- Payment Detail</a>
							<a>- Order History</a>
							<a>- Pricing</a>
						</div>
					}
					<div className={styles.optionHolder}
						onClick={() => this.setState({
							subOptions: this.state.subOptions ===
								"Users" ? "" : "Users"
						})}>
						<i
							className={`fa fa-users ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Users</p>
						</div>
					</div>
					{subOptions === "Users" &&
						<div className={showTitle ? styles.subTopics : styles.title}>
							<a>- Users Profile</a>
							<a>- Users Edit</a>
							<a>- Users Cards</a>
						</div>
					}
					<div className={styles.optionHolder}
						onClick={() => this.setState({
							subOptions: this.state.subOptions ===
								"Calendar" ? "" : "Calendar"
						})}>
						<i
							className={`fa fa-shopping-bag ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Calendar</p>
						</div>
					</div>
					{subOptions === "Calendar" &&
						<div className={showTitle ? styles.subTopics : styles.title}>
							<a>- Calendar</a>
							<a>- Draggable</a>
						</div>
					}
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-comment ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Chat App</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							aria-hidden="true"
							className={`fa fa-envelope ${styles.icons}`}
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Email App</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-file-o  ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>File Manager</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-desktop ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Kanban Board</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-heart-o ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Bookmark</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-check ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Task</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-bolt ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Social App</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-list ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>Contacts</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-clock-o ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>To do</p>
						</div>
					</div>
					<div className={styles.optionHolder}>
						<i
							className={`fa fa-clock-o ${styles.icons}`}
							aria-hidden="true"
						/>
						<div className={showTitle ? styles.optionTitle : styles.title}>
							<p className={styles.optionName}>To-do fireBase</p>
						</div>
					</div>
				</div>
			</div>
		);
	}
}