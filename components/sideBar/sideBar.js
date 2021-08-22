import React from "react";
import Link from "next/link";

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
							location: "/employee/create"
						},
						view: {
							title: "View Employee",
							selected: false,
							location: "/employee"
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
							<Link href={menu[key].location == undefined ? "" : menu[key].location}>
								<div className={styles.optionHolder}>
									<i className={`fa ${menu[key].icon} ${styles.icons}`} />
									{showTitle && (
										<span>{menu[key].title}</span>
									)}
								</div>
							</Link>
							{showTitle &&
								menu[key].selected &&
								menu[key].subMenu != undefined &&
								Object.keys(menu[key].subMenu).length > 0 && (
									<div className={styles.subMenuWrapper}>
										{Object.keys(menu[key].subMenu).map(
											(sKey) => (
												<Link href={menu[key].subMenu[sKey].location == undefined ? "" : menu[key].subMenu[sKey].location}>
													<p>{menu[key].subMenu[sKey].title}</p>
												</Link>
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
