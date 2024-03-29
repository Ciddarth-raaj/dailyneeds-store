import React from "react";
import Link from "next/link";

import styles from "./sideBar.module.css";

import Head from "../../util/head";
import MENU_LIST from "../../constants/menus";
import "../../constants/variables";
import { background } from "@chakra-ui/react";
import DesignationHelper from "../../helper/designation";

export default class SideBar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			showTitle: false,
			subOptions: "",
			menu: MENU_LIST,
			login: '',
			designation_id: '',
			filtered_data: [],
		};
	}

	componentDidMount() {
		this.getPermissions();
	}

	getPermissions() {
		DesignationHelper.getPermissionById()
			.then((data) => {
				this.setState({ filtered_data: data })
				if (data) {
					global.config.data = data;
				};
			})
			.catch((err) => console.log(err))

	}

	handleMenuClick = (key) => {
		const { menu } = this.state;
		menu[key].selected = true;
		this.setState({ menu: menu });
	};

	render() {
		const { showTitle, menu, filtered_data, designation_id } = this.state;
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
								<>
									{filtered_data.length !== 0 ? (
										<div className={styles.subMenuWrapper}>
											{Object.keys(menu[key].subMenu).map((sKey) => (
												<div>
													{Object.keys(filtered_data).map((fkey) => (
														<Link href={menu[key].subMenu[sKey].location == undefined ? "" : menu[key].subMenu[sKey].location}>
															<div>
																{filtered_data[fkey].permission_key === menu[key].subMenu[sKey].permission && (
																	<div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
																		<p style={{ marginTop: "15px", marginRight: "7px" }}>-</p>
																		<p>{menu[key].subMenu[sKey].title}</p>
																	</div>
																)}
															</div>
														</Link>
													))}
												</div>
											))}
										</div>
									) : (
										<div className={styles.subMenuWrapper}>
											{Object.keys(menu[key].subMenu).map((sKey) => (
												<Link href={menu[key].subMenu[sKey].location == undefined ? "" : menu[key].subMenu[sKey].location}>
													<p>{menu[key].subMenu[sKey].title}</p>
												</Link>
											))}
										</div>
									)}
								</>
							)}
						</div>
					))}
				</div>
			</div>
		);
	}
}
