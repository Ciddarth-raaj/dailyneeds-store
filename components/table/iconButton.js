import React from "react";
import styles from "./iconButton.module.css";

const sortTypes = {
    up: {
        class: "sort-up",
        fn: (a, b) => a.net_worth - b.net_worth,
    },
    down: {
        class: "sort-down",
        fn: (a, b) => b.net_worth - a.net_worth,
    },
    default: {
        class: "sort",
        fn: (a, b) => a,
    },
};

export default class IconButton extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            currentSort: "default",
        };
    }

    onSortChange = () => {
        const { currentSort } = this.state;
        const { sortCallback, headingKey } = this.props;
        let nextSort;

        if (currentSort === "down") {
            nextSort = "up";
        }
        else if (currentSort === "up") {
            nextSort = "default";
        }
        else if (currentSort === "default") {
            nextSort = "down";
        }

        sortCallback(headingKey, nextSort);
        this.setState({
            currentSort: nextSort,
        });
    };

    upArrow() {
        console.log("UP");
    }
    downArrow() {
        console.log("DOWN");
    }

    render() {
        const { currentSort } = this.state;
        return (
            <div className={styles.arrow}>
                <button onClick={this.onSortChange}>
                    <i className={`fa fa-${sortTypes[currentSort].class}`}></i>
                </button>
            </div>
            // <div className={styles.arrow}>
            //     <div>
            //     <img
            //         src={"/assets/upArrow.png"}
            //         className={styles.icon}
            //         onClick={() => this.upArrow()}
            //     />
            //     <img
            //         src={"/assets/downArrow.png"}
            //         className={styles.icon}
            //         onClick={() => this.downArrow()}
            //     />
            //     </div>
            // </div>
        );
    }
}
