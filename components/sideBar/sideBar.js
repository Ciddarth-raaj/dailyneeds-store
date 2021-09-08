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
					selected: false,
					icon: "fa-columns",
				},
				employee: {
					title: "Employees",
					selected: true,
					openPage: true,
					icon: "fa-users",
					subMenu: {
						add: {
							title: "Add Employee",
							selected: false,
							location: "/employee/create",
						},
						view: {
							title: "View Employee",
							selected: false,
							location: "/employee",
						},
						view_departments: {
							title: "View Departments",
							selected: false,
							location: "/department/view",
						},
						add_departments: {
							title: "Add Departments",
							selected: false,
							location: "/department/create",
						},
						view_designation: {
							title: "View Designations",
							selected: false,
							location: "/designation/view",
						},
						add_designation: {
							title: "Add Designation",
							selected: false,
							location: "/designation/create",
						},
						view_shift: {
							title: "View Shift",
							selected: false,
							location: "/shift/view",
						},
						add_shift: {
							title: "Add Shift",
							selected: false,
							location: "/shift/create",
						},
					},
				},
			},
		};
	}

	handleMenuClick = (key) => {
		const { menu } = this.state;
		menu[key].selected = true;
		this.setState({ menu: menu });
	};

	render() {
		const { showTitle, menu } = this.state;
		return (
			<div className={styles.container} onMouseEnter={() => this.setState({ showTitle: true })} onMouseLeave={() => this.setState({ showTitle: false })}>
				<Head />

				<div className={styles.sideBarOptions}>
					{Object.keys(menu).map((key) => (
						<div style={showTitle ? { width: "100%" } : {}} className={styles.menuWrapper}>
							<Link href={menu[key].location == undefined ? "" : menu[key].location}>
								<div className={styles.optionHolder} onClick={() => this.handleMenuClick(key)}>
									<i className={`fa ${menu[key].icon} ${menu[key].openPage ? styles["icons-selected"] : ""}`} />
									{showTitle && <span>{menu[key].title}</span>}
								</div>
							</Link>
							{showTitle && menu[key].selected && menu[key].subMenu != undefined && Object.keys(menu[key].subMenu).length > 0 && (
								<div className={styles.subMenuWrapper}>
									{Object.keys(menu[key].subMenu).map((sKey) => (
										<Link href={menu[key].subMenu[sKey].location == undefined ? "" : menu[key].subMenu[sKey].location}>
											<p>{menu[key].subMenu[sKey].title}</p>
										</Link>
									))}
								</div>
							)}
						</div>
					))}
				</div>
			</div>
		);
	}
}
