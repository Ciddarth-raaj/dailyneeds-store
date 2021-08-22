import React from "react";
import styles from "./sideBar.module.css";
import Head from "../../util/head";

export default class SideBar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showTitle: false,
			subOptions: "",
			menu: {
				dashboard: {
					title: "Dashboard",
					selected: true,
					icon: "fa-columns",
				},
				employee: {
					title: "Employees",
					selected: true,
					icon: "fa-users",
					subMenu: {
						add: {
							title: "Add Employee",
							selected: false,
						},
						view: {
							title: "View Employee",
							selected: false,
						},
					},
				},
			},
		};
	}

	render() {
		const { showTitle, menu } = this.state;
		return (
			<div
				className={styles.container}
				onMouseEnter={() => this.setState({ showTitle: true })}
				onMouseLeave={() => this.setState({ showTitle: false })}
			>
				<Head />

				<div className={styles.sideBarOptions}>
					{Object.keys(menu).map((key) => (
						<div
							style={showTitle ? { width: "100%" } : {}}
							className={styles.menuWrapper}
						>
							<div className={styles.optionHolder}>
								<i
									className={`fa ${menu[key].icon} ${styles.icons}`}
								/>
								{showTitle && <span>{menu[key].title}</span>}
							</div>
							{showTitle &&
								menu[key].selected &&
								menu[key].subMenu != undefined &&
								Object.keys(menu[key].subMenu).length > 0 && (
									<div className={styles.subMenuWrapper}>
										{Object.keys(menu[key].subMenu).map(
											(sKey) => (
												<p>
													{
														menu[key].subMenu[sKey]
															.title
													}
												</p>
											)
										)}
									</div>
								)}
						</div>
					))}
				</div>
			</div>
		);
	}
}
